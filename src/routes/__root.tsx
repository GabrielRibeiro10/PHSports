import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { BackToTop } from "@/components/BackToTop";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { useCatalogRealtimeSync } from "@/lib/catalog";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte para a página inicial.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-secondary">
            Ir para a loja
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PH Sports — Loja de Camisas de Futebol" },
      { name: "description", content: "Loja PH Sports: camisas de futebol premium dos maiores clubes por R$ 179,90, com envio para todo o Brasil e atendimento via WhatsApp." },
      { name: "author", content: "PH Sports" },
      { property: "og:title", content: "PH Sports — Loja de Camisas de Futebol" },
      { property: "og:description", content: "Loja PH Sports: camisas de futebol premium dos maiores clubes por R$ 179,90, com envio para todo o Brasil e atendimento via WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0D0D0D" },
      { name: "twitter:title", content: "PH Sports — Loja de Camisas de Futebol" },
      { name: "twitter:description", content: "Loja PH Sports: camisas de futebol premium dos maiores clubes por R$ 179,90, com envio para todo o Brasil e atendimento via WhatsApp." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cd4e796c-5647-4c1c-829d-b9bbbe9422cd/id-preview-e308dcbf--d4fd99e7-628e-47d5-a506-eb298e003b8a.lovable.app-1785201889291.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cd4e796c-5647-4c1c-829d-b9bbbe9422cd/id-preview-e308dcbf--d4fd99e7-628e-47d5-a506-eb298e003b8a.lovable.app-1785201889291.png" },
    ],
    links: [
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/favicon.png?v=2" },
      { rel: "icon", href: "/favicon.ico?v=2", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400..900&family=Google+Sans:wght@400..700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Archivo:wdth,wght@100..125,700..900&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Escala do layout mobile (base iPhone 14 Pro, 393px): mesma composição em todos os celulares */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var r=document.documentElement;function f(){var w=window.innerWidth;r.style.setProperty('--m-scale',w<768?String(Math.min(1.2,Math.max(0.75,w/393))):'1')}f();window.addEventListener('resize',f)})();(function(){try{var n=performance.getEntriesByType('navigation')[0];if(!n||n.type!=='reload')return;if('scrollRestoration' in history)history.scrollRestoration='manual';for(var i=sessionStorage.length-1;i>=0;i--){var k=sessionStorage.key(i);if(k&&k.indexOf('tsr-scroll')===0)sessionStorage.removeItem(k)}if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);var t=function(){if(window.scrollY!==0)window.scrollTo({top:0,left:0,behavior:'instant'})};t();window.addEventListener('DOMContentLoaded',t,{once:true})}catch(e){}})()",
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function CatalogRealtimeSync() {
  useCatalogRealtimeSync();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminRoute = pathname.startsWith("/admin");
  return (
    <QueryClientProvider client={queryClient}>
      <CatalogRealtimeSync />
      <AuthProvider>
        <CartProvider>
          {isAdminRoute ? (
            <Outlet />
          ) : (
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </div>
          )}
          {!isAdminRoute && (
            <>
              <WhatsAppButton />
              <BackToTop />
            </>
          )}
          <Toaster position="top-center" richColors />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
