import { useEffect, useRef } from "react";

// Desafio anti-robô ("Não sou um robô") da Cloudflare no login do painel.
// A chave do site é pública; a secreta fica só no Supabase (Authentication → Attack Protection),
// que confere o token em todo login.
export const TURNSTILE_SITE_KEY = import.meta.env.DEV
  ? "1x00000000000000000000AA" // chave de teste da Cloudflare (sempre passa) para rodar em localhost
  : "0x4AAAAAAFQ_BdSJk3tZ1VCw";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function api(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

function loadScript(): Promise<void> {
  if (api()) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Mostra o desafio e entrega o token (ou null quando expira/falha).
 * O token vale uma tentativa só: mude `resetKey` depois de cada envio para gerar outro.
 */
export function Turnstile({
  onToken,
  onLoadError,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  onLoadError: () => void;
  resetKey: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const handlers = useRef({ onToken, onLoadError });
  handlers.current = { onToken, onLoadError };

  useEffect(() => {
    let cancelled = false;
    loadScript()
      .then(() => {
        const t = api();
        if (cancelled || !box.current || !t) return;
        widget.current = t.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "pt-br",
          theme: "light",
          callback: (token: string) => handlers.current.onToken(token),
          "expired-callback": () => handlers.current.onToken(null),
          "error-callback": () => handlers.current.onToken(null),
        });
      })
      .catch(() => handlers.current.onLoadError());
    return () => {
      cancelled = true;
      const t = api();
      if (widget.current && t) t.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    const t = api();
    if (resetKey === 0 || !widget.current || !t) return;
    handlers.current.onToken(null);
    t.reset(widget.current);
  }, [resetKey]);

  return <div ref={box} className="min-h-[65px]" />;
}
