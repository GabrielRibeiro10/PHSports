# Painel e pedidos pelo WhatsApp

## Como funciona
1. **Checkout** (`/carrinho` → "Finalizar pelo WhatsApp"): o servidor (`src/lib/orders.server.ts`) confere produtos ativos,
   tamanhos, quantidades, preços do banco, estoque (quando cadastrado), cupom e — se o comprador escolheu — refaz a cotação do frete.
   Cria o pedido pela função `create_checkout_order` (só o servidor pode chamar) **antes** de abrir o WhatsApp.
   Cada tentativa tem uma chave: clique repetido ou nova tentativa devolvem o mesmo pedido.
   O pedido nasce **Aguardando atendimento** + pagamento **Pendente**. Sem cotação, o frete fica **pendente** (nunca grátis).
2. **Painel** (`/admin`): resumo real, pedidos com busca/filtros/paginação, página do pedido com ações,
   estoque por tamanho com histórico, configuração do WhatsApp/Pix.
3. **Regras no banco** (`supabase/migrations/20261006120000_admin_operations.sql`): cada ação é uma função que confere se
   quem chama é admin e valida a transição:
   - pagamento: pendente → confirmado (manual, registra quem/quando/valor; exige frete definido e valor = total;
     baixa o estoque **uma vez**, em transação, travando as linhas; falta de estoque bloqueia e nada muda) → reembolsado (só registro).
   - atendimento: aguardando → em preparação (exige pago) → enviado (exige transportadora; rastreio e data) → entregue.
     Cancelamento só antes do envio; devolve estoque no máximo uma vez; não mexe no pagamento.
   - frete manual: só antes do pagamento; atualiza o total.
   - estoque: reposição/ajuste com motivo e histórico; nunca negativo.
   - produto já vendido não pode ser apagado (desative).

## Segurança
- Pedidos, itens, clientes e histórico: só admin lê (RLS) e ninguém escreve direto na tabela (permissões revogadas);
  visitante não tem privilégio nenhum nessas tabelas. Não existe consulta pública por número/telefone.
- Estoque por tamanho: leitura pública (para mostrar "esgotado"); escrita só pelas funções.
- O painel no navegador usa só a chave pública + login; `service_role` fica no servidor (funções do TanStack Start).

## O que configurar
1. Incorporar o PR e **aplicar as migrações** no Lovable (Cloud → banco). Sem isso o checkout não consegue salvar pedidos.
2. Entrar no painel com a conta admin (tabela `user_roles`, papel `admin`).
3. `/admin/configuracoes`: WhatsApp da loja (55 + DDD + número), chave Pix, limite de estoque baixo.
4. `/admin/estoque`: cadastrar a quantidade de cada tamanho (produto sem estoque cadastrado vende, mas não pode ter pagamento confirmado).
5. Frete real (opcional): ver `docs/frete.md`. Sem ele, o frete é combinado no WhatsApp e registrado no pedido.

## Testes
- `supabase/tests/rules.test.mjs`: roda todas as migrações num Postgres local (PGlite), imitando os papéis e permissões padrão do
  Supabase, e verifica 23 regras (duplicidade, acesso, baixa única, falta de estoque, último item, transições, cancelamento,
  reembolso, preço histórico, resumo). Rodar: `bun add -d @electric-sql/pglite && node supabase/tests/rules.test.mjs`.
- `src/lib/shipping/shipping.test.ts` (35 casos): checkout no servidor (tamanho, estoque, idempotência, frete pendente/cotado, cupom).

## Recursos de produtividade do painel
- **Sino de avisos** (canto superior do painel) e cartão **"O que fazer hoje"** no dashboard: pedidos novos, frete a definir, pagamentos pendentes, pagos esperando envio, estoque baixo/esgotado. Atualiza a cada minuto; o título da aba mostra o número de itens urgentes e, se o navegador permitir, avisa quando chega pedido novo.
- **Dashboard**: gráfico de vendas por dia (dias sem venda aparecem zerados), ticket médio, comparação com o período anterior e produtos mais vendidos.
- **Pedidos**: filtros por link (`/admin/pedidos?situacao=...&pagamento=...`), seleção em lote (imprimir lista de separação, recibos, passar para "Em preparação" — cada pedido segue as regras do banco), exportar planilha (CSV para Excel, `;` e vírgula decimal, com proteção contra fórmulas). No pedido: "Imprimir separação e recibo".
- **Produtos**: exportar/importar planilha (atualiza por `slug`; novos entram **ocultos**; máx. 500 linhas, 1 MB), ajustar preço em lote (% ou R$, com prévia), mostrar/ocultar em lote, duplicar (a cópia fica oculta, estoque zerado).
- **Clientes**: aba "Compradores" (agrupa pelo WhatsApp, só pedidos pagos e não cancelados) com filtros de recompra e "sem comprar há 60/90 dias", botão de WhatsApp e exportação.
- **Estoque**: exportar planilha. **Configurações**: aviso/promoção no topo da loja (`store_settings`, chave `aviso`; link só `/caminho` ou `https://`) e cópia de segurança (arquivo JSON com todas as tabelas).
- Não há migrações novas: tudo usa tabelas e funções que já existem.
- Verificação em duas etapas **não** foi ativada: sem regras no banco que exijam o segundo fator, ela só bloquearia a tela de login e daria falsa sensação de segurança.
