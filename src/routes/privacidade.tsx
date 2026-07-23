import { createFileRoute } from "@tanstack/react-router";
import { STORE_EMAIL, STORE_PHONE_DISPLAY } from "@/lib/products";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — PH Sports" },
      { name: "description", content: "Saiba como a PH Sports coleta, usa e protege seus dados em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — PH Sports" },
      { property: "og:description", content: "Nosso compromisso com a privacidade e a segurança dos seus dados." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www-phsports-com.lovable.app/privacidade" }],
  }),
  component: PrivacidadePage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="reveal-up mt-8">
      <h2 className="text-xl font-black md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacidadePage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <header className="reveal-up">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Institucional</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Última atualização: 23 de julho de 2026
        </p>
      </header>

      <Section title="1. Introdução">
        <p>
          A PH Sports respeita a sua privacidade e está comprometida em proteger os dados pessoais que você
          compartilha conosco. Esta política descreve como coletamos, usamos e protegemos suas informações,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>
      </Section>

      <Section title="2. Coleta de informações">
        <p>Podemos coletar as seguintes informações quando você interage com a nossa loja:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nome completo, telefone e e-mail para contato.</li>
          <li>Endereço de entrega para envio dos produtos.</li>
          <li>Dados de navegação, como páginas visitadas e origem do acesso.</li>
          <li>Mensagens enviadas pelo WhatsApp para atendimento.</li>
        </ul>
      </Section>

      <Section title="3. Uso das informações">
        <p>Utilizamos seus dados para:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Processar e entregar seus pedidos.</li>
          <li>Prestar atendimento, suporte e realizar trocas ou devoluções.</li>
          <li>Melhorar a experiência de navegação e nossos produtos.</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </Section>

      <Section title="4. Segurança dos dados">
        <p>
          Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não
          autorizado, perda ou alteração. Apenas colaboradores autorizados têm acesso aos dados necessários
          para prestação do serviço.
        </p>
      </Section>

      <Section title="5. Cookies">
        <p>
          Utilizamos cookies para melhorar a navegação, lembrar preferências e analisar o desempenho da loja.
          Você pode gerenciar os cookies nas configurações do seu navegador.
        </p>
      </Section>

      <Section title="6. Compartilhamento de dados">
        <p>
          Não vendemos nem alugamos seus dados. Podemos compartilhá-los apenas com parceiros essenciais à
          operação (transportadoras e provedores de pagamento) ou quando exigido por autoridades legais.
        </p>
      </Section>

      <Section title="7. Direitos do consumidor (LGPD)">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Confirmação de tratamento dos seus dados.</li>
          <li>Acesso, correção ou atualização das informações.</li>
          <li>Exclusão dos dados desnecessários ou tratados em desconformidade.</li>
          <li>Portabilidade dos dados a outro fornecedor.</li>
        </ul>
      </Section>

      <Section title="8. Contato">
        <p>
          Para qualquer solicitação relacionada aos seus dados, entre em contato pelo e-mail{" "}
          <a href={`mailto:${STORE_EMAIL}`} className="font-semibold text-brand hover:underline">{STORE_EMAIL}</a>{" "}
          ou pelo WhatsApp {STORE_PHONE_DISPLAY}.
        </p>
      </Section>
    </article>
  );
}
