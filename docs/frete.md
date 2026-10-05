# Frete real (Correios)

O site cota PAC e SEDEX de verdade no servidor (funções do TanStack Start em `src/lib/*.functions.ts`),
usando **Melhor Envio** (padrão) ou a **API dos Correios com contrato** (`SHIPPING_PROVIDER=correios`).
Nenhum token vai para o navegador.

## Fluxo
1. Página da camisa e carrinho: "Calcule o frete" (CEP com máscara 00000-000, botão Calcular, "Alterar CEP").
2. O servidor monta **um volume com todo o carrinho**: peso = embalagem + soma das peças; altura = altura vazia + espessura de cada peça.
   Preço e categoria de cada produto vêm do banco.
3. O comprador escolhe a modalidade; o valor entra no total. Mudou CEP, produto ou quantidade → a escolha é desfeita e a cotação refeita.
4. Finalização (`createOrder`): o servidor confere CEP do endereço = CEP cotado, recalcula preços, cupom e **faz uma cotação nova**.
   Se o frete mudou ou sumiu, pede confirmação. Se a consulta falha, **não finaliza** (nunca frete zerado).
5. O pedido é salvo em `orders` (endereço, serviço, valor, prazo, preparação, ambiente) e o cliente envia no WhatsApp para pagar via Pix
   o total = produtos − desconto + frete.

## Configuração no painel (`/admin/fretes`) — sem segredos
CEP de origem, tempo de preparação, medidas/peso da embalagem e peso/espessura de cada categoria.
Categoria sem peso não pode ser cotada (mensagem clara para o cliente). Há um "Testar cotação" no fim da página.

## Segredos (Lovable → Cloud → Secrets). Nunca no código.
| Variável | Melhor Envio |
|---|---|
| `MELHOR_ENVIO_TOKEN` | token do app (permissão `shipping-calculate`) |
| `MELHOR_ENVIO_ENV` | `sandbox` (teste) ou `production` |
| `MELHOR_ENVIO_CONTACT_EMAIL` | e-mail técnico (exigido no User-Agent) |
| `MELHOR_ENVIO_SERVICES` | opcional, padrão `1,2` (Correios PAC, SEDEX) |

| Variável | Correios com contrato (`SHIPPING_PROVIDER=correios`) |
|---|---|
| `CORREIOS_USUARIO`, `CORREIOS_CODIGO_ACESSO` | usuário do Meu Correios e código de acesso às APIs |
| `CORREIOS_CARTAO_POSTAGEM`, `CORREIOS_CONTRATO`, `CORREIOS_DR` | dados do contrato |
| `CORREIOS_ENV` | `sandbox` (homologação) ou `production` |
| `CORREIOS_SERVICOS` | opcional, padrão `03298:PAC,03220:SEDEX` |

## Teste × produção
- `sandbox`: o site mostra "Ambiente de teste" na cotação; o pedido é salvo com `shipping_environment = sandbox` e a observação "TESTE".
  O token de sandbox é criado em sandbox.melhorenvio.com.br (conta separada).
- `production`: valores reais da conta. **Só considerar pronto após uma cotação real em produção** no "Testar cotação" do painel.

## Banco
Migração `supabase/migrations/20261005120000_orders_shipping_address.sql` (colunas de frete/endereço em `orders`).

## Testes
`src/lib/shipping/shipping.test.ts` (31 casos: pacote, provedores, erros da API, cotação e pedido) — `bun run test`.
