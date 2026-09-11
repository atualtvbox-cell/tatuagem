
import { createFileRoute } from '@tanstack/react-router'
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CashClosing } from "@/components/CashClosing";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, PAYMENT_METHODS, useFinanceEntries, usePhotos, useRefresh, useStudioInfo } from "@/lib/studio-db";
import type { FinanceEntry, Photo, StudioInfo } from "@/lib/studio-db";

export const Route = createFileRoute('/_authenticated/admin')({
  component: RouteComponent,
})

async function uploadToStorage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = Date.now() + '.' + ext;
  const { error } = await supabase.storage.from("photos").upload(fileName, file, { contentType: file.type });
  if (error) throw new Error("Erro no upload: " + error.message);
  const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
  return data.publicUrl;
}

function RouteComponent() {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const { data: info } = useStudioInfo();
  const { data: photos = [] } = usePhotos();
  const { data: entries = [] } = useFinanceEntries();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<StudioInfo | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setDraft(info ?? null); }, [info]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, []);

  const flash = (msg: string) => { setStatus(msg); window.setTimeout(() => setStatus(""), 2500); };

  const saveInfo = async () => {
    if (!draft) return;
    const { error } = await supabase.from("studio_info").update({ name: draft.name, phone: draft.phone, address: draft.address, hours: draft.hours, about: draft.about }).eq("id", draft.id);
    if (error) return flash("Erro ao salvar: " + error.message);
    refresh("studio_info");
    flash("Dados do estudio salvos!");
  };

  const addPhoto = async (payload: { file: File; caption: string; kind: string }) => {
    try {
      setUploading(true);
      const url = await uploadToStorage(payload.file);
      const { error } = await supabase.from("photos").insert({ url, caption: payload.caption, kind: payload.kind, sort_order: photos.length + 1 });
      if (error) { flash("Erro: " + error.message); return false; }
      refresh("photos");
      flash("Foto adicionada!");
      return true;
    } catch (err: any) { flash(err.message || "Erro no upload"); return false; }
    finally { setUploading(false); }
  };

  const updatePhoto = async (id: string, patch: Partial<Photo>) => {
    const { error } = await supabase.from("photos").update(patch).eq("id", id);
    if (error) return flash("Erro: " + error.message);
    refresh("photos");
  };

  const removePhoto = async (id: string) => {
    if (!window.confirm("Excluir esta foto?")) return;
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) return flash("Erro: " + error.message);
    refresh("photos");
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">Sua conta nao tem permissao de administrador.</p>
          <button onClick={signOut} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <h1 className="text-xl">Painel do estudio</h1>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary">Ver site</Link>
            <button onClick={signOut} className="rounded-md border border-border px-3 py-1.5 hover:bg-secondary">Sair</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {status && (<p className="rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">{status}</p>)}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg">Dados do estudio</h2>
          {draft && (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nome do estudio" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
                <Field label="Telefone / WhatsApp" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
                <Field label="Horario de atendimento" value={draft.hours} onChange={(v) => setDraft({ ...draft, hours: v })} />
                <Field label="Endereco" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Apresentacao</label>
                  <textarea rows={3} value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <button onClick={saveInfo} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground">Salvar dados</button>
            </>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg">Fotos ({photos.length})</h2>
          <PhotoForm onSubmit={addPhoto} flash={flash} uploading={uploading} />
          <ul className="mt-5 space-y-3">
            {photos.map((photo) => (<PhotoRow key={photo.id} photo={photo} onUpdate={updatePhoto} onRemove={removePhoto} flash={flash} />))}
          </ul>
        </section>
        <FinanceSection title="Contas a pagar" type="pagar" entries={entries.filter((e) => e.entry_type === "pagar")} onChanged={() => refresh("finance_entries")} flash={flash} />
        <FinanceSection title="Contas a receber" type="receber" entries={entries.filter((e) => e.entry_type === "receber")} onChanged={() => refresh("finance_entries")} flash={flash} />
        <CashClosing entries={entries} />
      </main>
    </div>
  );
}

function PhotoForm({ onSubmit, flash, uploading }: { onSubmit: (payload: { file: File; caption: string; kind: string }) => Promise<boolean>; flash: (msg: string) => void; uploading: boolean; }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [inCarousel, setInCarousel] = useState(false);
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return flash("Apenas imagens sao permitidas");
    if (f.size > 5 * 1024 * 1024) return flash("Imagem muito grande (max. 5MB)");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return flash("Escolha uma imagem do seu computador.");
    const ok = await onSubmit({ file, caption: caption.trim(), kind: inCarousel ? "carousel" : "gallery" });
    if (ok) { setFile(null); setPreview(""); setCaption(""); setInCarousel(false); }
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-lg border border-border/70 bg-background/60 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Imagem do computador</Label>
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <Label>Texto da foto (legenda)</Label>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ex: Blackwork no antebraco" className={inputClass} />
        </div>
      </div>
      {preview && <img src={preview} alt="Pre-visualizacao" className="h-28 w-28 rounded-md object-cover" />}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={inCarousel} onChange={(e) => setInCarousel(e.target.checked)} />
          Mostrar no carrossel
        </label>
        <button type="submit" disabled={uploading} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground disabled:opacity-60">{uploading ? "Enviando..." : "Adicionar foto"}</button>
      </div>
    </form>
  );
}

function PhotoRow({ photo, onUpdate, onRemove, flash }: { photo: Photo; onUpdate: (id: string, patch: Partial<Photo>) => void; onRemove: (id: string) => void; flash: (msg: string) => void; }) {
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [busy, setBusy] = useState(false);
  const replaceImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return flash("Apenas imagens sao permitidas");
    try {
      setBusy(true);
      const url = await uploadToStorage(file);
      onUpdate(photo.id, { url });
      flash("Imagem trocada!");
    } catch (err: any) { flash(err.message || "Erro ao trocar imagem"); } finally { setBusy(false); }
  };
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:flex-row sm:items-center">
      <img src={photo.url} alt={photo.caption || "Foto"} loading="lazy" className="h-24 w-24 shrink-0 rounded-md object-cover" />
      <div className="flex-1 space-y-2">
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texto da foto (legenda)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={photo.kind === "carousel"} onChange={(e) => onUpdate(photo.id, { kind: e.target.checked ? "carousel" : "gallery" })} />
          Mostrar no carrossel
        </label>
        <label className="block text-xs text-muted-foreground">
          Trocar imagem:
          <input type="file" accept="image/*" onChange={(e) => replaceImage(e.target.files?.[0])} className="mt-1 block w-full text-xs" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { onUpdate(photo.id, { caption }); flash("Legenda salva!"); }} disabled={busy} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary disabled:opacity-60">Salvar</button>
        <button onClick={() => onRemove(photo.id)} className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">Excluir</button>
      </div>
    </li>
  );
}

function FinanceSection({ title, type, entries, onChanged, flash }: { title: string; type: "pagar" | "receber"; entries: FinanceEntry[]; onChanged: () => void; flash: (msg: string) => void; }) {
  const isPay = type === "pagar";
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("Pix");
  const [account, setAccount] = useState("");
  const [paid, setPaid] = useState(false);
  const totals = useMemo(() => {
    const total = entries.reduce((s, e) => s + Number(e.amount), 0);
    const open = entries.filter((e) => !e.paid).reduce((s, e) => s + Number(e.amount), 0);
    return { total, open };
  }, [entries]);
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    const { error } = await supabase.from("finance_entries").insert({ description: description.trim(), entry_type: type, amount: Number(amount.replace(",", ".")) || 0, due_date: dueDate || null, payment_method: method, account_name: account.trim(), paid });
    if (error) return flash("Erro: " + error.message);
    setDescription(""); setAmount(""); setDueDate(""); setAccount(""); setPaid(false);
    onChanged();
    flash("Lancamento adicionado!");
  };
  const togglePaid = async (entry: FinanceEntry) => {
    const { error } = await supabase.from("finance_entries").update({ paid: !entry.paid }).eq("id", entry.id);
    if (error) return flash("Erro: " + error.message);
    onChanged();
  };
  const remove = async (id: string) => {
    if (!window.confirm("Excluir este lancamento?")) return;
    const { error } = await supabase.from("finance_entries").delete().eq("id", id);
    if (error) return flash("Erro: " + error.message);
    onChanged();
  };
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg">{title}</h2>
        <p className="text-sm text-muted-foreground">Total {formatBRL(totals.total)} - {isPay ? "em aberto" : "a receber"} {formatBRL(totals.open)}</p>
      </div>
      <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <Label>{isPay ? "Motivo da saida" : "Motivo da entrada"}</Label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isPay ? "Ex: compra de tintas" : "Ex: sessao da cliente Ana"} className={inputClass} />
        </div>
        <div><Label>Valor (R$)</Label><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className={inputClass} /></div>
        <div><Label>Data</Label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} /></div>
        <div><Label>{isPay ? "Como foi a saida" : "Como foi a entrada"}</Label><select value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>{PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}</select></div>
        <div className="sm:col-span-2"><Label>{isPay ? "De qual conta saiu" : "Em qual conta entrou"}</Label><input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex: Nubank PJ, caixa do estudio..." className={inputClass} /></div>
        <div className="flex items-end gap-3"><label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />{isPay ? "Ja pago" : "Ja recebido"}</label></div>
        <div className="sm:col-span-2 lg:col-span-3"><button type="submit" className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold uppercase tracking-wider text-primary-foreground sm:w-auto">Adicionar lancamento</button></div>
      </form>
      <ul className="mt-5 space-y-3">
        {entries.length === 0 && <li className="text-sm text-muted-foreground">Nenhum lancamento por aqui.</li>}
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{entry.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.due_date ? new Date(entry.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "sem data"}{entry.payment_method ? " - " + entry.payment_method : ""}{entry.account_name ? " - " + entry.account_name : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={"text-sm font-semibold " + (isPay ? "text-destructive" : "text-accent")}>{isPay ? "-" : "+"} {formatBRL(Number(entry.amount))}</span>
              <button onClick={() => togglePaid(entry)} className={"rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider " + (entry.paid ? "border-accent/50 text-accent" : "border-border text-muted-foreground hover:bg-secondary")}>{entry.paid ? (isPay ? "Pago" : "Recebido") : "Pendente"}</button>
              <button onClick={() => remove(entry.id)} className="rounded-md border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">Excluir</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const inputClass = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs uppercase tracking-wider text-muted-foreground">{children}</label>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (<div><Label>{label}</Label><input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} /></div>);
}

