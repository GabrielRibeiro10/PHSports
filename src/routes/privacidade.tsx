import { createFileRoute } from "@tanstack/react-router";
import {
  STORE_ADDRESS,
  STORE_CNPJ,
  STORE_EMAIL,
  STORE_LEGAL_NAME,
  STORE_LOCATION,
  STORE_PHONE_DISPLAY,
} from "@/lib/products";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — PH Sports" },
      { name: "description", content: "Saiba como a PH Sports coleta, usa e protege seus dados em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — PH Sports" },
      { property: "og:description", content: "Nosso compromisso com a privacidade e a segurança dos seus dados." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://www.phsports.com.br/privacidade" }],
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
          Última atualização: 9 de novembro de 2026
        </p>
      </header>

      <Section title="1. Introdução e responsável pelos dados">
        <p>
          A PH Sports respeita a sua privacidade e está comprometida em proteger os dados pessoais que você
          compartilha conosco. Esta política descreve como coletamos, usamos e protegemos suas informações,
          em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>
        <p>
          O controlador dos seus dados é a PH Sports
          {[STORE_LEGAL_NAME, STORE_CNPJ && `CNPJ ${STORE_CNPJ}`, STORE_ADDRESS]
            .filter(Boolean)
            .map((s) => ` · ${s}`)
            .join("")}
          , {STORE_LOCATION}. Para qualquer assunto sobre os seus dados, fale com a gente pelos canais da
          seção 8.
        </p>
      </Section>

      <Section title="2. Quais dados coletamos e para quê">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong className="text-foreground">Nome, WhatsApp e endereço de entrega</strong>, informados ao
            finalizar um pedido: para registrar, cobrar, entregar o pedido e falar com você sobre ele (base
            legal: execução de contrato, LGPD art. 7º, V).
          </li>
          <li>
            <strong className="text-foreground">CEP</strong>, ao calcular frete ou preencher o endereço: para
            buscar a rua e a cidade e estimar o frete.
          </li>
          <li>
            <strong className="text-foreground">Mensagens no WhatsApp e e-mail</strong>: para atendimento,
            trocas e devoluções.
          </li>
          <li>
            <strong className="text-foreground">Dados de navegação</strong> (páginas visitadas, produtos vistos,
            origem do acesso, tipo de aparelho), <strong className="text-foreground">só se você aceitar os
            cookies</strong>: para medir o uso da loja e melhorar a experiência (base legal: consentimento,
            LGPD art. 7º, I).
          </li>
          <li>
            Registros técnicos de acesso (endereço IP, data e hora), guardados pela hospedagem por segurança
            e para cumprir o Marco Civil da Internet.
          </li>
        </ul>
      </Section>

      <Section title="3. Por quanto tempo guardamos">
        <p>
          Os dados dos pedidos ficam guardados pelo tempo necessário para entregar, dar suporte e cumprir
          obrigações legais (como as fiscais e as do Código de Defesa do Consumidor). Os registros de acesso
          ficam guardados por 6 meses. Os dados de navegação do Google Analytics são mantidos pelo prazo
          configurado na ferramenta e apagados depois. Quando não forem mais necessários, os dados são
          excluídos.
        </p>
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
          A loja guarda no seu navegador só o necessário para funcionar, como o carrinho e o último CEP
          consultado; isso não depende de aceite. Os cookies do Google Analytics, que medem como a loja é
          usada, só são ativados se você clicar em “Aceitar” no aviso de cookies. Você pode mudar a sua
          escolha a qualquer momento no link “Preferências de cookies”, no rodapé do site.
        </p>
      </Section>

      <Section title="6. Compartilhamento de dados">
        <p>
          Não vendemos nem alugamos seus dados. Eles são compartilhados só com os serviços que fazem a loja
          funcionar, cada um para a finalidade indicada:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase: banco de dados onde os pedidos ficam registrados.</li>
          <li>Vercel: hospedagem do site.</li>
          <li>WhatsApp (Meta): atendimento e fechamento dos pedidos.</li>
          <li>ViaCEP: consulta do endereço a partir do CEP.</li>
          <li>Google Analytics: medição de uso, só com o seu aceite.</li>
          <li>Transportadoras e Correios: entrega dos pedidos.</li>
          <li>Provedores de pagamento: processamento do Pix e do cartão.</li>
        </ul>
        <p>
          Alguns desses serviços guardam dados em servidores fora do Brasil, com as garantias previstas na
          LGPD. Também podemos compartilhar dados quando exigido por autoridades legais.
        </p>
      </Section>

      <Section title="7. Direitos do consumidor (LGPD)">
        <p>Você pode, a qualquer momento, solicitar:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Confirmação de tratamento dos seus dados.</li>
          <li>Acesso, correção ou atualização das informações.</li>
          <li>Exclusão dos dados desnecessários ou tratados em desconformidade.</li>
          <li>Portabilidade dos dados a outro fornecedor.</li>
          <li>Informação sobre com quem seus dados foram compartilhados.</li>
          <li>Revogação do consentimento (por exemplo, dos cookies de análise).</li>
        </ul>
        <p>Respondemos aos pedidos em até 15 dias.</p>
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
