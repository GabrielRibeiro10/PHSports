import { createFileRoute } from "@tanstack/react-router";
import { STORE_EMAIL, STORE_PHONE_DISPLAY } from "@/lib/products";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — PH Sports" },
      { name: "description", content: "Termos e condições de uso da loja PH Sports: compras, pagamentos, envios, trocas e responsabilidades." },
      { property: "og:title", content: "Termos de Uso — PH Sports" },
      { property: "og:description", content: "Regras claras para uma experiência de compra segura na PH Sports." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://phsports.com.br/termos" }],
  }),
  component: TermosPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="reveal-up mt-8">
      <h2 className="text-xl font-black md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermosPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <header className="reveal-up">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Institucional</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Termos de Uso</h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: 23 de julho de 2026</p>
      </header>

      <Section title="1. Condições de utilização">
        <p>
          Ao acessar e utilizar o site da PH Sports, você concorda integralmente com estes Termos de Uso.
          Caso não concorde, recomendamos que não utilize nossos serviços.
        </p>
      </Section>

      <Section title="2. Responsabilidade do usuário">
        <p>
          O usuário compromete-se a fornecer informações verdadeiras no ato da compra e a utilizar o site
          apenas para finalidades lícitas, sem violar direitos de terceiros.
        </p>
      </Section>

      <Section title="3. Informações sobre os produtos">
        <p>
          Nos empenhamos para que as imagens, cores, medidas e descrições reflitam o produto real. Pequenas
          variações podem ocorrer em razão de calibração de tela e processo produtivo.
        </p>
      </Section>

      <Section title="4. Pagamentos">
        <p>
          Todas as compras são processadas via Pix, com confirmação rápida. O pedido é enviado após a
          aprovação do pagamento.
        </p>
      </Section>

      <Section title="5. Envios">
        <p>
          Realizamos entregas para todo o Brasil. O prazo é informado no momento da compra e conta a partir
          da confirmação do pagamento. Atrasos das transportadoras podem eventualmente ocorrer.
        </p>
      </Section>

      <Section title="6. Trocas e devoluções">
        <p>
          Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento do produto, desde
          que ele esteja em condições originais. O atendimento é feito pelo WhatsApp {STORE_PHONE_DISPLAY}.
        </p>
      </Section>

      <Section title="7. Propriedade intelectual">
        <p>
          Todo o conteúdo do site — marca, layout, imagens e textos — pertence à PH Sports ou aos seus
          respectivos titulares e não pode ser reproduzido sem autorização.
        </p>
      </Section>

      <Section title="8. Limitação de responsabilidade">
        <p>
          A PH Sports não se responsabiliza por danos indiretos decorrentes do uso do site, indisponibilidades
          eventuais ou informações incorretas fornecidas pelo próprio usuário.
        </p>
      </Section>

      <Section title="9. Alterações dos termos">
        <p>
          Podemos atualizar estes Termos a qualquer momento. Recomendamos consultá-los periodicamente. A data
          da última atualização está indicada no topo desta página.
        </p>
      </Section>

      <Section title="10. Contato">
        <p>
          Dúvidas? Fale conosco em{" "}
          <a href={`mailto:${STORE_EMAIL}`} className="font-semibold text-brand hover:underline">{STORE_EMAIL}</a>{" "}
          ou pelo WhatsApp {STORE_PHONE_DISPLAY}.
        </p>
      </Section>
    </article>
  );
}
