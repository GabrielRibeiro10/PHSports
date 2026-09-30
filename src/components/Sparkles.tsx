/** Ícone de brilho (duas estrelas) usado nos botões de compra. */
export function Sparkles({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={`btn-gen__icon ${className}`}>
      <path d="M10 3.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5Z" />
      <path d="M18 13.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3Z" />
      <path d="M17.5 2.5c.17 1.2.8 1.83 2 2-1.2.17-1.83.8-2 2-.17-1.2-.8-1.83-2-2 1.2-.17 1.83-.8 2-2Z" />
    </svg>
  );
}
