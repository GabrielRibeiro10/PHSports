import { STORE_PHONE } from "@/lib/products";

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${STORE_PHONE}?text=${encodeURIComponent("Olá! Vim pelo site da PH Sports.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-brand text-white shadow-[var(--shadow-premium)] ring-1 ring-brand/40 wa-pulse wa-float transition-transform hover:scale-110"
    >
      <svg viewBox="0 0 32 32" className="size-8 fill-current" aria-hidden="true">
        <path d="M19.11 17.24c-.28-.14-1.66-.82-1.92-.91-.26-.1-.45-.14-.63.14-.19.28-.72.91-.88 1.1-.16.19-.32.21-.6.07-.28-.14-1.18-.44-2.24-1.39-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.63-1.52-.86-2.08-.23-.55-.46-.47-.63-.48-.16-.01-.35-.01-.54-.01s-.49.07-.75.35c-.26.28-.98.96-.98 2.34s1 2.71 1.14 2.9c.14.19 1.97 3 4.77 4.2.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.66-.68 1.9-1.33.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33zM16.02 5.33c-5.9 0-10.7 4.79-10.7 10.68 0 1.88.5 3.72 1.44 5.34l-1.53 5.6 5.73-1.5c1.57.86 3.33 1.31 5.06 1.31 5.9 0 10.7-4.79 10.7-10.68 0-2.86-1.11-5.55-3.13-7.57a10.65 10.65 0 0 0-7.57-3.18zm0 19.57c-1.55 0-3.06-.42-4.38-1.2l-.31-.19-3.4.89.91-3.32-.2-.32a8.85 8.85 0 0 1-1.36-4.75c0-4.9 4-8.88 8.9-8.88 2.38 0 4.61.93 6.29 2.6a8.83 8.83 0 0 1 2.61 6.29c0 4.9-4 8.88-8.9 8.88z"/>
      </svg>
    </a>
  );
}
