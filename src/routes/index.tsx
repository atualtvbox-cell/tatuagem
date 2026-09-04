import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { usePhotos, useStudioInfo, whatsappLink } from "@/lib/studio-db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estúdio Agulha Negra — Tatuagem Autoral em São Paulo" },
      {
        name: "description",
        content:
          "Estúdio de tatuagem em São Paulo: blackwork, fineline e realismo. Veja a galeria de trabalhos e agende pelo WhatsApp.",
      },
      { property: "og:title", content: "Estúdio Agulha Negra — Tatuagem Autoral" },
      {
        property: "og:description",
        content: "Galeria de tatuagens, endereço, horários e agendamento pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: info } = useStudioInfo();
  const { data: photos = [] } = usePhotos();

  const carousel = useMemo(() => {
    const c = photos.filter((p) => p.kind === "carousel");
    return c.length ? c : photos;
  }, [photos]);

  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (carousel.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % carousel.length), 5000);
    return () => clearInterval(t);
  }, [carousel.length]);

  useEffect(() => {
    setIndex(0);
  }, [carousel.length]);

  const studioName = info?.name ?? "Estúdio de Tatuagem";
  const whatsapp = info?.phone ?? "";
  const text = `Olá! Meu nome é ${name || "..."}. ${message || "Gostaria de fazer um orçamento de tatuagem."}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <span className="font-display text-lg tracking-widest sm:text-xl">{studioName}</span>
          <nav className="flex items-center gap-3 text-sm">
            <a href="#galeria" className="text-muted-foreground transition-colors hover:text-foreground">
              Galeria
            </a>
            <a href="#contato" className="text-muted-foreground transition-colors hover:text-foreground">
              Contato
            </a>
            <Link
              to="/admin"
              className="rounded-md border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-card sm:aspect-[16/9] lg:aspect-[21/9]">
            {carousel.map((photo, i) => (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.caption || "Tatuagem do estúdio"}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="ink-fade absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-10 sm:pb-14">
              <h1 className="max-w-2xl text-4xl leading-[0.95] sm:text-6xl lg:text-7xl">
                Arte na pele,
                <span className="block text-primary">feita para durar</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">{info?.about}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={whatsappLink(whatsapp, "Olá! Gostaria de agendar uma tatuagem.")}
                  target="_blank"
                  rel="noreferrer"
                  className="glow rounded-md bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Agendar no WhatsApp
                </a>
                <a
                  href="#galeria"
                  className="rounded-md border border-border bg-card/70 px-5 py-3 text-sm font-semibold uppercase tracking-wider transition-colors hover:bg-card"
                >
                  Ver galeria
                </a>
              </div>
            </div>
            {carousel.length > 1 && (
              <>
                <button
                  aria-label="Foto anterior"
                  onClick={() => setIndex((i) => (i - 1 + carousel.length) % carousel.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/60 px-3 py-2 text-lg backdrop-blur transition-colors hover:bg-background"
                >
                  ‹
                </button>
                <button
                  aria-label="Próxima foto"
                  onClick={() => setIndex((i) => (i + 1) % carousel.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/60 px-3 py-2 text-lg backdrop-blur transition-colors hover:bg-background"
                >
                  ›
                </button>
                <div className="absolute right-4 top-4 flex gap-2">
                  {carousel.map((p, i) => (
                    <button
                      key={p.id}
                      aria-label={`Ir para a foto ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 w-6 rounded-full transition-colors ${
                        i === index ? "bg-primary" : "bg-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section id="galeria" className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-4xl">Galeria de trabalhos</h2>
          <p className="mt-2 text-sm text-muted-foreground">Toque em uma foto para ampliar.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightbox(photo.url)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border/60"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Tatuagem"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {photo.caption && (
                  <span className="ink-fade absolute inset-x-0 bottom-0 p-2 text-left text-xs text-foreground">
                    {photo.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section id="contato" className="border-t border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl sm:text-4xl">Fale com a gente</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Escreva sua ideia e envie direto para o nosso WhatsApp.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  window.open(whatsappLink(whatsapp, text), "_blank");
                }}
              >
                <div>
                  <label htmlFor="nome" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Seu nome
                  </label>
                  <input
                    id="nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="Ex: Ana Souza"
                  />
                </div>
                <div>
                  <label htmlFor="msg" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Sua ideia de tatuagem
                  </label>
                  <textarea
                    id="msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                    placeholder="Tamanho, local do corpo, referência, data desejada..."
                  />
                </div>
                <button
                  type="submit"
                  className="glow w-full rounded-md bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  Enviar no WhatsApp
                </button>
              </form>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Endereço</p>
                <p className="mt-1 text-sm">{info?.address}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Telefone / WhatsApp</p>
                <a href={`tel:${(info?.phone ?? "").replace(/\D/g, "")}`} className="mt-1 block text-sm text-primary">
                  {info?.phone}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Horário</p>
                <p className="mt-1 text-sm">{info?.hours}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {studioName}
      </footer>

      {lightbox && (
        <div
          role="dialog"
          aria-label="Foto ampliada"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
        >
          <img src={lightbox} alt="Tatuagem ampliada" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
