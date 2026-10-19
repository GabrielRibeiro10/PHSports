# Segurança do backend (pedidos, estoque, cupons, painel)

Revisão feita sobre o checkout pelo WhatsApp + painel admin (TanStack Start + Supabase).
Migração: `supabase/migrations/20261007120000_security_hardening.sql`.

## Contexto importante
A loja **não tem provedor de pagamento online**: o pedido nasce "Pagamento pendente" e o admin confirma
**manualmente** no painel (`admin_confirm_payment`, exige valor = total). Por isso **não existe webhook de pagamento**
para validar. Se um provedor (Pix/cartão) for ligado no futuro, o webhook precisa: conferir a assinatura do provedor,
buscar o pagamento na API do provedor (status, valor, moeda, referência do pedido), gravar o id do evento com chave
única (idempotência) e só então chamar a mesma função de confirmação (que baixa o estoque uma única vez).

## O que já existia e foi verificado (testes 1–23)
- Preço, subtotal, desconto e frete **recalculados no servidor**; o navegador só envia slug, tamanho e quantidade.
- Pedido idempotente (mesma chave = mesmo pedido); baixa de estoque só na confirmação, em transação, com trava de linha
  (sem estoque negativo, sem baixa dupla, cancelamento devolve no máximo uma vez).
- Pedidos/itens/clientes/histórico: só admin lê; ninguém (nem admin) escreve direto — só funções com checagem de admin **no banco**.
- Não existe consulta pública de pedido (`/rastreio` é só um link para o WhatsApp da loja).

## Corrigido nesta revisão
| # | Problema encontrado | Correção |
|---|---|---|
| 1 | `redeemCoupon` era um endpoint **público** sem login: qualquer pessoa podia esgotar os usos de um cupom | Função removida. O uso é debitado **dentro do banco**, na mesma transação do pedido |
| 2 | Cupom de uso limitado podia ser concedido a mais gente em compras simultâneas (validava, criava o pedido e só depois tentava debitar, ignorando a falha) | `UPDATE` condicional atômico no `create_checkout_order`; esgotou = pedido **não é criado** |
| 3 | Limite anti-abuso do cupom era por código: quem testa códigos diferentes nunca era limitado | Balde global além do por-código |
| 4 | Limite de pedidos era por texto do WhatsApp (bastava mudar a formatação) e só por instância | Normaliza para dígitos + balde global + **limite no banco**: máx. 10 pedidos pendentes por WhatsApp/hora |
| 5 | `store_settings` (chave Pix, frete, operação) era **legível por qualquer visitante** | Só admin lê; o servidor lê com `service_role` |
| 6 | `audit_log` aceitava gravação de qualquer usuário logado (dava para forjar ação de admin) | Usuário comum só registra a própria tentativa de login; ações administrativas só admin |
| 7 | O banco confiava no servidor para preço/total | O banco **reconfere** preço, subtotal, desconto, frete e total contra o catálogo |
| 8 | `ilike` com `_` no código do cupom funcionava como curinga | Escapa `_` e `%` |
| 9 | Faltavam índices usados pela nova regra | `orders(customer_whatsapp, created_at)`, `order_items(order_id)`, `customers(whatsapp)` |

## Testes
- Regras do banco (Postgres local PGlite): `npm i --no-save --legacy-peer-deps @electric-sql/pglite && node supabase/tests/rules.test.mjs` → 29 verificações.
- Código: `npx vitest run` → 191 testes.
- Limitação: o PGlite tem uma conexão só; "compras simultâneas" são testadas em sequência. A garantia sob concorrência real
  vem do `UPDATE` condicional / `FOR UPDATE` (atômicos no Postgres), mas **não foi exercitada com conexões paralelas**.

## Configurações externas que faltam (não dá para fazer pelo código)
1. **Backup antes de aplicar a migração** (Supabase → Database → Backups, ou `pg_dump`), e anotar o ponto de restauração.
   Teste a restauração em um projeto de teste. A migração não apaga dados (só troca políticas/função e cria índices).
2. **Aplicar a migração** no Lovable Cloud / Supabase. Até lá o site continua funcionando com as regras antigas.
3. **Desligar o cadastro público** (Authentication → Providers → Email → "Allow new users to sign up") e conferir em
   Authentication → Users que só existem contas esperadas. A tabela `user_roles` define quem é admin.
4. **Limite de requisições na borda** (Cloudflare Rate Limiting/WAF): os limites em memória são por instância do servidor.
5. Chaves: `SUPABASE_SERVICE_ROLE_KEY` só como secret do servidor. O `.env` versionado contém apenas URL e chave **publicável**
   (sem segredos); mesmo assim, se ela for rotacionada, atualize o arquivo.
6. LGPD: o pedido guarda nome, WhatsApp e endereço em texto. Não há CPF nem cartão. Defina prazo de retenção e como atender pedidos de exclusão.
