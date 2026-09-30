import { Link } from "@tanstack/react-router";
import { Instagram, Mail, Phone, MapPin, ShieldCheck, MessageCircle } from "lucide-react";
import { STORE_EMAIL, STORE_LOCATION, STORE_PHONE_DISPLAY } from "@/lib/products";
import { EXCHANGE_MESSAGE, whatsappHref } from "@/lib/whatsapp";
import logo from "@/assets/ph-sports-logo.jpeg.asset.json";

const INSTAGRAM_URL = "https://www.instagram.com/phsportsilha?igsh=bXA4NDM2YmR6d2lq";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo.url} alt="PH Sports" className="size-10 rounded-full object-cover ring-1 ring-border" />
              <span className="text-xl font-black tracking-tight">
                PH<span className="text-brand">SPORTS</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Camisa de time com escudo bordado e tecido dry-fit. Mandamos pra todo o Brasil e pra fora também.
            </p>

            <h4 className="mt-6 text-sm font-bold uppercase tracking-wider">Redes sociais</h4>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram da PH Sports"
              className="btn-glow mt-3 inline-flex size-11 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground hover:border-brand hover:text-brand"
            >
              <Instagram className="size-5" />
            </a>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider">Institucional</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/sobre" className="hover:text-foreground">Sobre nós</Link></li>
              <li>
                <a href={whatsappHref(EXCHANGE_MESSAGE)} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                  Trocas e devoluções
                </a>
              </li>
              <li><Link to="/rastreio" className="hover:text-foreground">Rastrear pedido</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-foreground">Termos de Uso</Link></li>
            </ul>
            <a
              href={whatsappHref(EXCHANGE_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-foreground"
            >
              <MessageCircle className="size-4" /> Solicitar troca/devolução
            </a>
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
            <h4 className="text-sm font-bold uppercase tracking-wider">Forma de pagamento</h4>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2">
              <span className="grid size-8 place-items-center rounded-md bg-brand text-[10px] font-black text-brand-foreground">PIX</span>
              <div className="text-xs">
                <p className="font-bold text-foreground">Pagamento via Pix</p>
                <p className="text-muted-foreground">Aprovou na hora, a gente já separa o pedido</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Compra 100% segura</span>
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
