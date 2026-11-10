/**
 * Rastreamento de anúncios e vendas (Meta Pixel + Google Analytics 4).
 * Preencha os IDs abaixo para ativar; vazio = nada é carregado.
 *  - Meta Pixel: Gerenciador de Eventos do Meta → Fontes de dados → ID do pixel (só números).
 *  - Google Analytics 4: Administrador → Fluxos de dados → ID da métrica ("G-XXXXXXX").
 */
export const META_PIXEL_ID = "";
export const GA4_ID = "G-BKRWF75GW9";
/** Escolha do visitante no banner de cookies: "granted" | "denied" (sem valor = ainda não escolheu). */
export const CONSENT_KEY = "ph-cookie-consent";

type Item = { slug: string; name: string; club?: string; price: number; qty?: number };

type W = Window & {
  fbq?: (...a: unknown[]) => void;
  gtag?: (...a: unknown[]) => void;
};
const w = () => (typeof window === "undefined" ? null : (window as W));

/** Scripts para o <head>; só existem quando há ID configurado. */
export function analyticsHeadScripts() {
  const scripts: { children?: string; src?: string; async?: boolean }[] = [];
  if (/^\d{6,20}$/.test(META_PIXEL_ID)) {
    scripts.push({
      // só com o "Aceitar" do banner de cookies (LGPD)
      children: `try{if(localStorage.getItem('${CONSENT_KEY}')==='granted')!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');}catch(e){}`,
    });
  }
  if (/^G-[A-Z0-9]{4,20}$/.test(GA4_ID)) {
    // LGPD: gtag.js só é baixado com o "Aceitar" do banner de cookies (CookieBanner grava
    // CONSENT_KEY). Sem aceite, os eventos ficam só na fila local do dataLayer e nada sai do navegador.
    // Com aceite, baixa depois que a página terminou de carregar (não disputa banda com a HERO).
    scripts.push({
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA4_ID}',{send_page_view:false});(function(){var d=false;function l(){if(d)return;d=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA4_ID}';document.head.appendChild(s)}window.__phLoadAnalytics=l;var ok=false;try{ok=localStorage.getItem('${CONSENT_KEY}')==='granted'}catch(e){}if(!ok)return;function w(){'requestIdleCallback' in window?requestIdleCallback(l,{timeout:3000}):setTimeout(l,1500)}document.readyState==='complete'?w():addEventListener('load',w)})();`,
    });
  }
  return scripts;
}

const toGa = (i: Item) => ({
  item_id: i.slug,
  item_name: i.name,
  item_brand: i.club,
  price: i.price,
  quantity: i.qty ?? 1,
});
const total = (items: Item[]) =>
  Math.round(items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0) * 100) / 100;

export const track = {
  pageView(path: string) {
    w()?.fbq?.("track", "PageView");
    w()?.gtag?.("event", "page_view", { page_path: path, page_location: location.href });
  },
  viewItem(i: Item) {
    w()?.fbq?.("track", "ViewContent", {
      content_ids: [i.slug],
      content_name: i.name,
      content_type: "product",
      value: i.price,
      currency: "BRL",
    });
    w()?.gtag?.("event", "view_item", { currency: "BRL", value: i.price, items: [toGa(i)] });
  },
  addToCart(i: Item) {
    const value = total([i]);
    w()?.fbq?.("track", "AddToCart", {
      content_ids: [i.slug],
      content_name: i.name,
      content_type: "product",
      value,
      currency: "BRL",
    });
    w()?.gtag?.("event", "add_to_cart", { currency: "BRL", value, items: [toGa(i)] });
  },
  checkout(items: Item[], value: number) {
    w()?.fbq?.("track", "InitiateCheckout", {
      content_ids: items.map((i) => i.slug),
      content_type: "product",
      num_items: items.reduce((s, i) => s + (i.qty ?? 1), 0),
      value,
      currency: "BRL",
    });
    w()?.gtag?.("event", "begin_checkout", { currency: "BRL", value, items: items.map(toGa) });
  },
  search(term: string) {
    w()?.fbq?.("track", "Search", { search_string: term });
    w()?.gtag?.("event", "search", { search_term: term });
  },
};
