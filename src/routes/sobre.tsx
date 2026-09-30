import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Truck, MessageCircle, Star, Award, Heart } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Nós — PH Sports" },
      { name: "description", content: "Conheça a história, missão e valores da PH Sports: camisas de futebol premium com atendimento humanizado e envio para todo o Brasil." },
      { property: "og:title", content: "Sobre a PH Sports" },
      { property: "og:description", content: "Paixão pelo futebol, qualidade premium e atendimento próximo. Conheça a PH Sports." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phsports.com.br/sobre" }],
  }),
  component: SobrePage,
});

const diferenciais = [
  { icon: Award, title: "Produtos de alta qualidade", desc: "Tecido premium com acabamento profissional e escudo bordado." },
  { icon: Truck, title: "Envio rápido", desc: "Sai daqui com código de rastreio, pra qualquer canto do Brasil." },
  { icon: Shield, title: "Compra 100% segura", desc: "Pagamento via Pix, protegido e aprovado na hora." },
  { icon: MessageCircle, title: "Atendimento no WhatsApp", desc: "Pergunta o tamanho, tira dúvida. Quem responde é gente." },
  { icon: Star, title: "Satisfação dos clientes", desc: "Milhares de torcedores atendidos com nota máxima." },
  { icon: Heart, title: "Feito por torcedor", desc: "A gente escolhe os modelos pensando no que a torcida pede." },
];

function SobrePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <header className="reveal-up text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Sobre nós</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">A PH Sports</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Somos torcedores vendendo pra torcedor. A gente sabe a raiva que dá abrir o pacote e dar de cara com escudo torto.
        </p>
      </header>

      <section className="reveal-up mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black">Nossa história</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A PH Sports começou atendendo os torcedores da nossa cidade, gente que queria uma camisa bonita sem pagar o preço da oficial.
            O boca a boca fez o resto, e hoje a gente manda camisa pra todo o Brasil.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Continua do mesmo jeito: você chama no WhatsApp, quem responde é alguém daqui, e a camisa chega com rastreio.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Missão</h3>
            <p className="mt-2 text-sm text-muted-foreground">Botar a camisa do time no corpo de quem não quer pagar preço de oficial.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Visão</h3>
            <p className="mt-2 text-sm text-muted-foreground">Ser a loja que o torcedor indica no grupo da família.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Valores</h3>
            <p className="mt-2 text-sm text-muted-foreground">Falar a verdade sobre o produto, trocar sem enrolação e responder rápido.</p>
          </div>
        </div>
      </section>

      <section className="reveal-up mt-16">
        <h2 className="text-center text-2xl font-black md:text-3xl">Por que comprar na PH Sports</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {diferenciais.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[var(--shadow-premium)]">
              <div className="grid size-11 place-items-center rounded-full bg-brand/10 text-brand">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 text-sm font-black">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="reveal-up mt-16 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
        <h2 className="text-2xl font-black">Vista o seu clube com a PH Sports</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Todas as camisas por R$ 179,90 com envio para todo o Brasil e atendimento pelo WhatsApp.
        </p>
        <Link
          to="/"
          hash="produtos"
          className="btn-glow mt-6 inline-flex rounded-full bg-brand px-7 py-3 text-sm font-bold text-brand-foreground"
        >
          Ver camisas
        </Link>
      </section>
    </div>
  );
}
