import { useMemo, useState } from "react";

import { formatBRL, type FinanceEntry } from "@/lib/studio-db";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function summarize(entries: FinanceEntry[]) {
  const inflow = entries.filter((e) => e.entry_type === "receber").reduce((s, e) => s + Number(e.amount), 0);
  const outflow = entries.filter((e) => e.entry_type === "pagar").reduce((s, e) => s + Number(e.amount), 0);
  const settledIn = entries
    .filter((e) => e.entry_type === "receber" && e.paid)
    .reduce((s, e) => s + Number(e.amount), 0);
  const settledOut = entries.filter((e) => e.entry_type === "pagar" && e.paid).reduce((s, e) => s + Number(e.amount), 0);
  return {
    inflow,
    outflow,
    balance: inflow - outflow,
    settledIn,
    settledOut,
    settledBalance: settledIn - settledOut,
    count: entries.length,
  };
}

function byMethod(entries: FinanceEntry[]) {
  const map = new Map<string, { in: number; out: number }>();
  for (const e of entries) {
    const key = e.payment_method || "Não informado";
    const row = map.get(key) ?? { in: 0, out: 0 };
    if (e.entry_type === "receber") row.in += Number(e.amount);
    else row.out += Number(e.amount);
    map.set(key, row);
  }
  return [...map.entries()].sort((a, b) => b[1].in + b[1].out - (a[1].in + a[1].out));
}

export function CashClosing({ entries }: { entries: FinanceEntry[] }) {
  const today = toISODate(new Date());
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));

  const dayEntries = useMemo(() => entries.filter((e) => e.due_date === day), [entries, day]);
  const monthEntries = useMemo(() => entries.filter((e) => (e.due_date ?? "").startsWith(month)), [entries, month]);

  const daySum = summarize(dayEntries);
  const monthSum = summarize(monthEntries);
  const methods = byMethod(monthEntries);

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg">Fechamento de caixa</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo das entradas e saídas por dia e por mês, com relatório detalhado.
        </p>
      </div>

      {/* Fechamento diário */}
      <div className="rounded-lg border border-border/70 bg-background/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base">Fechamento do dia</h3>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entradas" value={formatBRL(daySum.inflow)} tone="in" />
          <Stat label="Saídas" value={formatBRL(daySum.outflow)} tone="out" />
          <Stat label="Saldo do dia" value={formatBRL(daySum.balance)} tone={daySum.balance >= 0 ? "in" : "out"} />
          <Stat label="Já confirmado" value={formatBRL(daySum.settledBalance)} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{daySum.count} lançamento(s) nesta data.</p>
      </div>

      {/* Fechamento mensal */}
      <div className="rounded-lg border border-border/70 bg-background/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base">Fechamento do mês</h3>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Entradas do mês" value={formatBRL(monthSum.inflow)} tone="in" />
          <Stat label="Saídas do mês" value={formatBRL(monthSum.outflow)} tone="out" />
          <Stat label="Saldo do mês" value={formatBRL(monthSum.balance)} tone={monthSum.balance >= 0 ? "in" : "out"} />
          <Stat label="Confirmado no mês" value={formatBRL(monthSum.settledBalance)} />
        </div>

        {methods.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Forma</th>
                  <th className="py-2 pr-3">Entradas</th>
                  <th className="py-2">Saídas</th>
                </tr>
              </thead>
              <tbody>
                {methods.map(([name, v]) => (
                  <tr key={name} className="border-t border-border/60">
                    <td className="py-2 pr-3">{name}</td>
                    <td className="py-2 pr-3 text-accent">{formatBRL(v.in)}</td>
                    <td className="py-2 text-destructive">{formatBRL(v.out)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Relatório detalhado */}
      <div className="rounded-lg border border-border/70 bg-background/60 p-4">
        <h3 className="text-base">Relatório do mês — entradas e saídas</h3>
        {monthEntries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum lançamento neste mês.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="py-2 pr-3">Forma</th>
                  <th className="py-2 pr-3">Conta</th>
                  <th className="py-2 pr-3">Situação</th>
                  <th className="py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {[...monthEntries]
                  .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
                  .map((e) => {
                    const isPay = e.entry_type === "pagar";
                    return (
                      <tr key={e.id} className="border-t border-border/60">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {e.due_date ? new Date(e.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                        </td>
                        <td className="py-2 pr-3">{e.description}</td>
                        <td className="py-2 pr-3">{e.payment_method || "—"}</td>
                        <td className="py-2 pr-3">{e.account_name || "—"}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {e.paid ? (isPay ? "Pago" : "Recebido") : "Pendente"}
                        </td>
                        <td className={`py-2 whitespace-nowrap font-semibold ${isPay ? "text-destructive" : "text-accent"}`}>
                          {isPay ? "-" : "+"} {formatBRL(Number(e.amount))}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "in" | "out" }) {
  const color = tone === "in" ? "text-accent" : tone === "out" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
