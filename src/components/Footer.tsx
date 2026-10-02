import { Link } from "@tanstack/react-router";
import { scrollToTop } from "@/lib/smooth-scroll";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { STORE_EMAIL, STORE_PHONE_DISPLAY } from "@/lib/products";
import { EXCHANGE_MESSAGE, whatsappHref } from "@/lib/whatsapp";
import logo from "@/assets/ph-sports-logo.jpeg.asset.json";

const INSTAGRAM_URL = "https://www.instagram.com/phsportsilha?igsh=bXA4NDM2YmR6d2lq";
const CONTACT_MESSAGE = "Olá! Vim pelo site da PH Sports e queria tirar uma dúvida.";

const SHOP_LINKS = [
  { label: "Feminino", slug: "mulheres" },
  { label: "Retrô", slug: "retro" },
  { label: "Versão Jogador", slug: "versao-jogador" },
  { label: "Acessórios", slug: "caneleiras" },
] as const;

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/** Hora local de Ilhabela, só no navegador (evita diferença entre servidor e cliente). */
function LocalTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);
  return <time className="tabular-nums">{time ?? "--:--"}</time>;
}

/** Botão principal com leve efeito magnético no mouse e preenchimento líquido no hover. */
function MagneticCta({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const move = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${(e.clientX - (r.left + r.width / 2)) * 0.22}px`);
    el.style.setProperty("--my", `${(e.clientY - (r.top + r.height / 2)) * 0.22}px`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--mx", "0px");
    ref.current?.style.setProperty("--my", "0px");
  };
  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onPointerMove={move}
      onPointerLeave={reset}
      className="ft-cta h-14 w-full gap-2 px-6 text-[15px] md:size-44 md:flex-col md:gap-1.5 md:px-0 md:text-base"
    >
      <span className="text-center leading-tight">
        Chamar no <br className="hidden md:block" />
        WhatsApp
      </span>
      <ArrowUpRight className="ft-cta__arrow size-5" aria-hidden />
    </a>
  );
}

function ColumnTitle({ index, children }: { index: string; children: string }) {
  return (
    <h2 className="ft-label">
      <span className="text-brand">{index}</span>
      <span aria-hidden className="mx-2 text-white/20">
        /
      </span>
      {children}
    </h2>
  );
}

function ExternalArrow() {
  return (
    <span aria-hidden className="ft-link__arrow">
      ↗
    </span>
  );
}

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"static" | "armed" | "in">("static");

  // Entrada ao rolar até o rodapé. Se ele já estiver na tela (página curta) ou o
  // usuário preferir menos movimento, fica estático, sem esconder nada.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("armed");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toTop = () => scrollToTop();

  return (
    <footer
      ref={ref}
      data-ft={state}
      className="ft relative mt-20 overflow-hidden bg-[#0d0d0d] text-white"
    >
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-16 md:px-6 md:pb-24 md:pt-24">
        {/* Chamada principal */}
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="ft-label ft-up" style={d(0)}>
              Fale com a gente
            </p>
            <h2 className="ft-title mt-5 md:mt-7">
              <span className="ft-line">
                <span className="ft-line__in" style={d(0.05)}>
                  Próximo jogo,
                </span>
              </span>
              <span className="ft-line">
                <span className="ft-line__in ft-title__serif" style={d(0.16)}>
                  camisa nova.
                </span>
              </span>
            </h2>
            <p
              className="ft-up mt-6 max-w-md text-[15px] leading-relaxed text-white/60 md:mt-8"
              style={d(0.35)}
            >
              Ficou na dúvida do tamanho ou do modelo? Manda mensagem. Quem responde é gente, não
              robô.
            </p>
          </div>
          <div className="ft-up md:mr-20 min-[1440px]:mr-0" style={d(0.45)}>
            <MagneticCta href={whatsappHref(CONTACT_MESSAGE)} />
          </div>
        </div>

        {/* Colunas */}
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 border-t border-white/10 pt-12 md:mt-24 md:pt-14 lg:grid-cols-12">
          <div className="ft-up col-span-2 lg:col-span-3" style={d(0.15)}>
            <Link
              to="/"
              aria-label="PH Sports, página inicial"
              className="inline-flex items-center gap-3"
            >
              <img
                src={logo.url}
                alt=""
                width={40}
                height={40}
                loading="lazy"
                className="size-10 rounded-full object-cover ring-1 ring-white/15"
              />
              <span className="ft-wordmark">
                PH<span className="text-brand">SPORTS</span>
              </span>
            </Link>
            <p className="mt-5 max-w-[17rem] text-sm leading-relaxed text-white/55">
              Camisa de time com escudo bordado e tecido dry-fit. Saindo de Ilhabela pra todo o
              Brasil e pra fora também.
            </p>
          </div>

          <nav aria-label="Loja" className="ft-up lg:col-span-2" style={d(0.23)}>
            <ColumnTitle index="01">Loja</ColumnTitle>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link to="/" hash="produtos" className="ft-link">
                  Camisas de time
                </Link>
              </li>
              {SHOP_LINKS.map((l) => (
                <li key={l.slug}>
                  <Link to="/categoria/$slug" params={{ slug: l.slug }} className="ft-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ajuda" className="ft-up lg:col-span-2" style={d(0.31)}>
            <ColumnTitle index="02">Ajuda</ColumnTitle>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link to="/rastreio" className="ft-link">
                  Rastrear pedido
                </Link>
              </li>
              <li>
                <a
                  href={whatsappHref(EXCHANGE_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ft-link"
                >
                  Trocas e{" "}
                  <span className="whitespace-nowrap">
                    devoluções <ExternalArrow />
                  </span>
                </a>
              </li>
              <li>
                <Link to="/sobre" className="ft-link">
                  Sobre a PH Sports
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="ft-link">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos" className="ft-link">
                  Termos de uso
                </Link>
              </li>
            </ul>
          </nav>

          <div className="ft-up col-span-2 lg:col-span-3" style={d(0.39)}>
            <ColumnTitle index="03">Contato</ColumnTitle>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a href={`mailto:${STORE_EMAIL}`} className="ft-link">
                  {STORE_EMAIL}
                </a>
              </li>
              <li>
                <a
                  href={`tel:+55${STORE_PHONE_DISPLAY.replace(/\D/g, "")}`}
                  className="ft-link tabular-nums"
                >
                  {STORE_PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ft-link"
                >
                  Instagram{" "}
                  <span className="whitespace-nowrap">
                    @phsportsilha <ExternalArrow />
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <div className="ft-up col-span-2 lg:col-span-2" style={d(0.47)}>
            <ColumnTitle index="04">Pagamento</ColumnTitle>
            <p className="mt-5 text-sm text-white">Pix, aprovação na hora.</p>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              Aprovou, a gente já separa o pedido. Envio com rastreio pra todo o Brasil.
            </p>
          </div>
        </div>

        {/* Linha final */}
        <div
          className="ft-up mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 md:mt-20 md:grid md:grid-cols-3 md:items-center"
          style={d(0.55)}
        >
          <p>© {new Date().getFullYear()} PH Sports. Todos os direitos reservados.</p>
          <p className="md:text-center">
            Ilhabela, SP <span className="mx-1.5 text-white/20">·</span> <LocalTime />
          </p>
          <button
            type="button"
            onClick={toTop}
            className="ft-link self-start text-left md:justify-self-end"
          >
            Voltar ao topo ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
