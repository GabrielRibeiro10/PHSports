import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CONSENT_KEY } from "@/lib/analytics";

/** Evento para reabrir o banner (link "Preferências de cookies" no rodapé). */
export const OPEN_COOKIE_PREFS = "ph:cookie-prefs";

type W = Window & { __phLoadAnalytics?: () => void };

/**
 * Banner de cookies (LGPD + Guia de Cookies da ANPD): o Google Analytics só carrega com
 * "Aceitar"; "Recusar" tem o mesmo peso visual. A escolha fica salva e pode ser mudada no rodapé.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CONSENT_KEY);
    } catch {
      // navegador sem armazenamento: o banner aparece a cada visita
    }
    if (!saved) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_COOKIE_PREFS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_PREFS, reopen);
  }, []);

  const choose = (v: "granted" | "denied") => {
    const before = (() => {
      try {
        return localStorage.getItem(CONSENT_KEY);
      } catch {
        return null;
      }
    })();
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {
      // sem armazenamento: a escolha vale só nesta visita
    }
    setOpen(false);
    if (v === "granted") (window as W).__phLoadAnalytics?.();
    // quem tinha aceitado e agora recusou: recarrega para o Analytics já baixado sair da página
    else if (before === "granted") location.reload();
  };

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#0d0d0d]/95 p-5 text-white shadow-2xl backdrop-blur md:bottom-5"
    >
      <p className="text-sm leading-relaxed text-white/80">
        Usamos cookies do Google Analytics para entender como a loja é usada e melhorar sua experiência.
        Eles só são ativados se você aceitar. Saiba mais na{" "}
        <Link to="/privacidade" className="font-semibold text-white underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="rounded-full border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="rounded-full border border-white bg-white px-4 py-2.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/85"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
