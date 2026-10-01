import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Ruler, RefreshCw, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { Sparkles } from "@/components/Sparkles";
import { formatBRL, SIZES } from "@/lib/products";
import { getProduct, productsQueryOptions } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ params, context }) => {
    const products = await context.queryClient.ensureQueryData(productsQueryOptions);
    const product = getProduct(products, params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Produto — PH Sports" }] };
    const p = loaderData.product;
    return {
      meta: [
        { title: `${p.name} — PH Sports` },
        { name: "description", content: `${p.name} com acabamento premium por ${formatBRL(p.price)}. Envio rápido e troca fácil na PH Sports.` },
        { property: "og:title", content: `${p.name} — PH Sports` },
        { property: "og:description", content: `Camisa ${p.club} por ${formatBRL(p.price)}.` },
        { property: "og:type", content: "product" },
        { property: "og:url", content: `https://www.phsports.com.br/produto/${p.slug}` },
      ],
      links: [{ rel: "canonical", href: `https://www.phsports.com.br/produto/${p.slug}` }],
    };
  },
  component: ProductPage,
});

function categoryDescription(category: string, club: string, name: string) {
  switch (category) {
    case "feminino":
      return `Camisa feminina do ${club} desenhada para valorizar a silhueta sem abrir mão do conforto. A modelagem slim acompanha o corpo com leveza, o tecido dry-fit de alta densidade mantém a pele seca e o toque é macio do primeiro ao último uso. Escudo aplicado com precisão, costuras reforçadas e cores vivas que não desbotam — perfeita para o estádio, para o dia a dia ou para treinar com estilo.`;
    case "retro":
      return `Uma viagem no tempo: a camisa retrô ${name.replace("Camisa Retrô ", "")} resgata fielmente os detalhes que marcaram época — gola clássica, tipografia original e cores tratadas para lembrar exatamente o brilho daquela temporada. Confeccionada em tecido premium com caimento amplo e nostálgico, escudo bordado e acabamento artesanal. Mais que uma camisa: uma relíquia para quem respeita a história do futebol.`;
    case "jogador":
      return `Versão jogador do ${club}: a mesma proposta usada em campo, feita para performance real. Modelagem slim atlética, tecido ultraleve com ventilação estratégica e tecnologia de secagem rápida que expulsa o suor no ritmo do jogo. Costuras planas para zero atrito, escudo em alta definição e liberdade total de movimento. Para quem joga sério — e quer parecer profissional em qualquer campo.`;
    case "caneleiras":
      return `Caneleiras profissionais com casco rígido de alto impacto e espuma interna de absorção que protege a canela sem travar o movimento. Encaixe anatômico, presilhas ajustáveis e peso reduzido para você esquecer que está usando. Proteção confiável do aquecimento ao apito final.`;
    default:
      return `Camisa oficial do ${club} versão torcedor 2026, feita para quem veste a camisa de verdade. Poliéster premium de alta densidade com tecnologia dry-fit, que respira, seca rápido e mantém o conforto os 90 minutos inteiros. Escudo bordado, acabamento profissional e modelagem torcedor unissex com caimento impecável — do sofá à arquibancada, sempre no time principal.`;
  }
}

function ProductPage() {

  const { product: initialProduct } = Route.useLoaderData();
  const { data: products = [] } = useQuery(productsQueryOptions);
  const product = getProduct(products, initialProduct.slug) ?? initialProduct;
  const { add } = useCart();
  const nav = useNavigate();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [sizeTableOpen, setSizeTableOpen] = useState(false);
  const [mobileTableOpen, setMobileTableOpen] = useState(false);
  const isMobile = useIsMobile();
  const sizeTableBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalTitleId = useId();

  useEffect(() => {
    if (!mobileTableOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setMobileTableOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const root = modalRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      (previouslyFocused ?? sizeTableBtnRef.current)?.focus?.();
    };
  }, [mobileTableOpen]);

  const thumbs = [product.image, ...(product.gallery ?? [])].filter(Boolean);
  const activeImage = selected && thumbs.includes(selected) ? selected : product.image;

  const ensureSize = () => {
    if (!size) {
      toast.error("Selecione o tamanho");
      return false;
    }
    return true;
  };
  const onAdd = () => {
    if (!ensureSize()) return;
    add(product.slug, size!, qty);
    toast.success("Adicionado ao carrinho");
  };
  const onBuy = () => {
    if (!ensureSize()) return;
    add(product.slug, size!, qty);
    nav({ to: "/carrinho" });
  };

  const sizeOptions = product.sizes?.length ? product.sizes : [...SIZES];
  const isFemale = product.category === "feminino";
  const related = products.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 4);
  const relatedFinal = related.length ? related : products.filter((p) => p.slug !== product.slug).slice(0, 4);


  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-brand">Início</Link>
        <ChevronRight className="size-3" />
        <Link to="/" hash="produtos" className="hover:text-brand">Camisas</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid min-w-0 gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary/40">
            <img
              key={activeImage}
              src={activeImage}
              alt={product.name}
              width={800}
              height={800}
              className="aspect-square w-full animate-[fade-in_0.35s_ease-out] object-cover transition-opacity duration-300"
              fetchPriority="high"
            />
            <span className="absolute left-4 top-4 rounded-full bg-brand px-3 py-1 text-xs font-black uppercase tracking-wider text-brand-foreground">
              Oferta
            </span>
            <span className="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
              -{product.discount}%
            </span>
          </div>
          {thumbs.length > 1 && (
            <div className="mt-3 flex gap-3">
              {thumbs.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => setSelected(src)}
                  aria-label={`Ver imagem ${i + 1} de ${product.name}`}
                  className={`w-full max-w-[25%] flex-1 overflow-hidden rounded-lg border bg-secondary/40 transition hover:border-primary ${
                    activeImage === src ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">{product.club}</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black">{formatBRL(product.price)}</span>
            <span className="text-base text-muted-foreground line-through">{formatBRL(product.oldPrice)}</span>
            <span className="rounded-md bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">-{product.discount}% Promoção</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ou 6x de <span className="font-semibold text-foreground">{formatBRL(product.price / 6)}</span> sem juros
          </p>

          {/* Size */}
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold">Tamanho</span>
              <button
                ref={sizeTableBtnRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isMobile ? mobileTableOpen : sizeTableOpen}
                onClick={() => {
                  if (isMobile) {
                    setMobileTableOpen(true);
                    return;
                  }
                  setSizeTableOpen(true);
                  document.getElementById("tabela-medidas")?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand hover:text-brand-foreground hover:shadow-[0_8px_24px_-8px_oklch(0.55_0.22_27_/_0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:translate-y-0"
              >
                <Ruler className="size-3.5" aria-hidden="true" /> Tabela de medidas
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {sizeOptions.map((s: string) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`min-w-14 rounded-md border px-4 py-2.5 text-sm font-bold transition-colors ${
                    size === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>



          {/* Qty */}
          <div className="mt-5">
            <span className="text-sm font-bold">Quantidade</span>
            <div className="mt-2 inline-flex items-center overflow-hidden rounded-md border border-border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-2 text-lg font-bold hover:bg-secondary"
                aria-label="Diminuir"
              >−</button>
              <span className="w-12 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-4 py-2 text-lg font-bold hover:bg-secondary"
                aria-label="Aumentar"
              >+</button>
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-6 grid gap-2">
            <button
              onClick={onAdd}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-background px-6 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <ShoppingBag className="size-4" /> Adicionar ao Carrinho
            </button>
            <button
              onClick={onBuy}
              className="btn-gen inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-medium"
            >
              <Sparkles className="size-[18px]" /> <span className="btn-gen__text">Comprar</span>
            </button>
          </div>

          <ul className="mt-5 grid gap-2 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Tecido premium com tecnologia dry-fit</li>
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Escudo bordado e acabamento profissional</li>
            <li className="inline-flex items-center gap-2"><Check className="size-3.5 text-brand" /> Modelagem torcedor unissex</li>
          </ul>

          <div className="mt-6 grid min-w-0 gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="font-bold">Descrição</p>
            <p className="text-muted-foreground">
              {product.description ?? categoryDescription(product.category, product.club, product.name)}
            </p>

            {product.category !== "caneleiras" && (
              <div className="grid gap-1 text-xs">
                <p><span className="font-bold">Material:</span> 100% poliéster dry-fit</p>
                <p><span className="font-bold">Modelagem:</span> {isFemale ? "Feminina slim" : product.category === "jogador" ? "Slim atlética (player)" : "Masculina torcedor"}</p>
                <p><span className="font-bold">Lavagem:</span> Máquina até 30°C, sem alvejante</p>
              </div>
            )}
            <details
              id="tabela-medidas"
              className="hidden min-w-0 text-sm md:block"
              open={sizeTableOpen}
              onToggle={(e) => setSizeTableOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer font-bold text-brand transition-colors hover:text-brand/80">Tabela de medidas</summary>
              <SizeTable product={product} isFemale={isFemale} />
            </details>

            <div id="trocas" className="flex items-start gap-2 text-xs">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-brand" />
              <span><strong>Troca e devolução:</strong> até 7 dias após o recebimento, sem burocracia.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
              <span><strong>Compra segura:</strong> pagamento via Pix, rápido e protegido.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      <section className="mt-16">
        <h2 className="mb-6 text-2xl font-black">Você também pode gostar</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {relatedFinal.map((p) => (
            <ProductCard key={p.slug} p={p} />
          ))}
        </div>
      </section>

      {/* Mobile size table modal */}
      {mobileTableOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-[fade-in_0.18s_ease-out] md:hidden"
          onClick={() => setMobileTableOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            tabIndex={-1}
            className="relative w-full max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-background p-3 shadow-2xl animate-[fade-in_0.18s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 pr-8">
              <h2 id={modalTitleId} className="text-sm font-black">Tabela de medidas</h2>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setMobileTableOpen(false)}
              aria-label="Fechar tabela de medidas"
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-border bg-secondary/60 text-foreground transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <div
              tabIndex={0}
              role="group"
              aria-label="Medidas — role horizontalmente para ver todas as colunas"
              className="min-w-0 [&_table]:text-[10px] [&_td]:px-1.5 [&_td]:py-1 [&_th]:px-1.5 [&_th]:py-1.5 [&_th]:text-[9px]"
            >
              <SizeTable product={product} isFemale={isFemale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SizeTable({ product, isFemale }: { product: { category: string }; isFemale: boolean }) {
  if (isFemale && product.category !== "caneleiras") {
    return (
      <div className="mt-3 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full border-collapse text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-obsidian text-left uppercase tracking-wider text-white">
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-black sm:px-3 sm:py-2">Tamanho</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Compr. (cm)</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Largura (cm)</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Altura (cm)</th>
            </tr>
          </thead>
          <tbody>
            {[["P (S)","61–63 cm","40–41 cm","150–160 cm"],["M (M)","63–66 cm","41–44 cm","160–165 cm"],["G (L)","66–69 cm","44–47 cm","165–170 cm"],["GG (XL)","69–71 cm","47–50 cm","170–175 cm"]].map(([s,c,l,a], i) => (
              <tr key={s} className={`border-t border-border/60 ${i % 2 ? "bg-secondary/40" : ""}`}>
                <td className="whitespace-nowrap px-2 py-1.5 font-bold text-brand sm:px-3 sm:py-2">{s}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{c}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{l}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (product.category === "caneleiras") {
    return (
      <table className="mt-2 w-full text-[11px] sm:text-xs">
        <thead className="text-left text-muted-foreground">
          <tr><th className="py-2">Tamanho</th><th className="py-2">Altura recomendada</th></tr>
        </thead>
        <tbody>
          {[["S","1,40m – 1,60m"],["M","1,60m – 1,75m"],["L","1,75m – 1,90m"]].map(([s,h]) => (
            <tr key={s} className="border-t border-border/60"><td className="py-2 font-semibold">{s}</td><td className="py-2">{h}</td></tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (product.category === "masculino" || product.category === "retro" || product.category === "jogador") {
    return (
      <div className="mt-3 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-background [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full border-collapse text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-obsidian text-left uppercase tracking-wider text-white">
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-black sm:px-3 sm:py-2">Tamanho</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Compr. (cm)</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Largura (cm)</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Altura (cm)</th>
              <th className="whitespace-nowrap px-2 py-2 text-[10px] font-bold sm:px-3 sm:py-2">Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {(product.category === "jogador"
              ? [
                  ["P", "67–69", "49–51", "162–170", "50–62"],
                  ["M", "69–71", "51–53", "170–175", "62–75"],
                  ["G", "71–73", "53–55", "175–180", "75–80"],
                  ["GG", "73–76", "55–57", "180–185", "80–85"],
                  ["2GG", "76–78", "57–60", "185–190", "85–90"],
                  ["3GG", "78–79", "60–63", "190–195", "90–95"],
                ]
              : [
                  ["P (S)", "69–71", "53–55", "162–170", "50–62"],
                  ["M (M)", "71–73", "55–57", "170–176", "62–78"],
                  ["G (L)", "73–75", "57–58", "176–182", "78–83"],
                  ["GG (XL)", "75–78", "58–60", "182–190", "83–90"],
                  ["2XL", "78–81", "60–62", "190–195", "90–97"],
                  ["3XL", "81–83", "62–64", "192–197", "97–104"],
                ]
            ).map(([t, c, l, a, p], i) => (
              <tr key={t} className={`border-t border-border/60 ${i % 2 ? "bg-secondary/40" : ""}`}>
                <td className="whitespace-nowrap px-2 py-1.5 font-bold text-brand sm:px-3 sm:py-2">{t}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{c}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{l}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{a}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground sm:px-3 sm:py-2">{p}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <table className="mt-2 w-full text-[11px] sm:text-xs">
      <thead className="text-left text-muted-foreground">
        <tr><th className="py-2">Tamanho</th><th className="py-2">Peito (cm)</th><th className="py-2">Comprimento (cm)</th></tr>
      </thead>
      <tbody>
        {[["P",50,70],["M",53,72],["G",56,74],["GG",59,76],["XG",62,78]].map(([s,p,c]) => (
          <tr key={String(s)} className="border-t border-border/60"><td className="py-2 font-semibold">{s}</td><td className="py-2">{p}</td><td className="py-2">{c}</td></tr>
        ))}
      </tbody>
    </table>
  );
}


