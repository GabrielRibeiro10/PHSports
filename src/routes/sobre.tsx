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
    links: [{ rel: "canonical", href: "https://phsports.com.br/sobre" }],
  }),
  component: SobrePage,
});

const diferenciais = [
  { icon: Award, title: "Produtos de alta qualidade", desc: "Tecido premium com acabamento profissional e escudo bordado." },
  { icon: Truck, title: "Envio rápido", desc: "Despacho ágil e entrega para todo o Brasil com rastreio." },
  { icon: Shield, title: "Compra 100% segura", desc: "Pagamento via Pix, protegido e aprovado na hora." },
  { icon: MessageCircle, title: "Atendimento no WhatsApp", desc: "Suporte humano, direto e sem burocracia." },
  { icon: Star, title: "Satisfação dos clientes", desc: "Milhares de torcedores atendidos com nota máxima." },
  { icon: Heart, title: "Feito por torcedor", desc: "Curadoria com carinho para quem vive o futebol." },
];

function SobrePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <header className="reveal-up text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Sobre nós</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">A PH Sports</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Vestimos a paixão dos torcedores brasileiros com camisas premium, atendimento próximo e o cuidado de quem também ama o jogo.
        </p>
      </header>

      <section className="reveal-up mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black">Nossa história</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A PH Sports nasceu do amor pelo futebol e da vontade de oferecer camisas de qualidade premium por um preço justo.
            Começamos atendendo torcedores da nossa cidade e crescemos levando as cores dos maiores clubes do Brasil para todos os cantos do país.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Hoje somos referência em atendimento humanizado, envio rápido e produtos que honram a camisa que você veste.
          </p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Missão</h3>
            <p className="mt-2 text-sm text-muted-foreground">Aproximar o torcedor do seu clube com produtos premium acessíveis.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Visão</h3>
            <p className="mt-2 text-sm text-muted-foreground">Ser a loja de camisas de futebol favorita do Brasil pela qualidade e experiência.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">Valores</h3>
            <p className="mt-2 text-sm text-muted-foreground">Paixão, qualidade, transparência e respeito com o torcedor.</p>
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
          Todas as camisas por R$ 99,90 com envio para todo o Brasil e atendimento pelo WhatsApp.
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
