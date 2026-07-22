import { Link } from "@tanstack/react-router";
import { Instagram, Mail, Phone, MapPin, ShieldCheck, CreditCard } from "lucide-react";
import { STORE_EMAIL, STORE_LOCATION, STORE_PHONE_DISPLAY } from "@/lib/products";
import logo from "@/assets/ph-sports-logo.jpeg.asset.json";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-black">PH</span>
              <span className="text-xl font-black tracking-tight">
                PH<span className="text-brand">SPORTS</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Camisas de futebol com acabamento premium, entrega para todo o Brasil e envio internacional.
            </p>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium hover:text-brand transition-colors"
            >
              <Instagram className="size-4" /> @phsports
            </a>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Institucional</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" hash="beneficios" className="hover:text-foreground">Sobre nós</Link></li>
              <li><Link to="/" hash="trocas" className="hover:text-foreground">Trocas e devoluções</Link></li>
              <li><Link to="/rastreio" className="hover:text-foreground">Rastrear pedido</Link></li>
              <li><Link to="/" hash="privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
              <li><Link to="/" hash="termos" className="hover:text-foreground">Termos de Uso</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Contato</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Mail className="mt-0.5 size-4 shrink-0" /><a href={`mailto:${STORE_EMAIL}`} className="hover:text-foreground">{STORE_EMAIL}</a></li>
              <li className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0" /><a href={`tel:+55${STORE_PHONE_DISPLAY.replace(/\D/g, "")}`} className="hover:text-foreground">{STORE_PHONE_DISPLAY}</a></li>
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{STORE_LOCATION}</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Pagamento & segurança</h4>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Pix", "Visa", "Master", "Elo", "Amex", "Boleto"].map((m) => (
                <span key={m} className="rounded border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium">
                  {m}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Compra 100% segura</span>
              <span className="inline-flex items-center gap-1.5"><CreditCard className="size-4 text-brand" /> SSL 256-bit</span>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PH Sports — Todos os direitos reservados. {STORE_LOCATION}.
        </div>
      </div>
    </footer>
  );
}
