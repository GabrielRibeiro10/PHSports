---
name: copy-balaclava
description: Escreve, humaniza e diagnostica copy de tráfego pago no método Copy Balaclava (Academia das Cop) — estrutura gancho/exposição/realidade/CTA, protocolo "já sangrou", marcas d'água de ChatGPT, arquitetura de desejo e mecanismo único. Fecha com DDC e entrega um mega-prompt reutilizável. Use quando o usuário pedir copy humana, humanizar, "tá GPT", estrutura balaclava, headlines, mecanismo único, copy de emagrecimento/ED/relacionamento/renda extra/low ticket, ou "escreve uma copy". Also triggers: Academia das Cop, parar de comer Doritos, marcas d'água, limpar as lentes. Não dispara para gerar imagem/vídeo (cyberia/creative-engine) nem para scorar um anúncio sem reescrever a copy (ddc puro).
---

# Copy Balaclava

Método de copy humana para tráfego pago. Fonte: 31 aulas da Academia das Cop. Paráfrase operacional — não colar transcrição.

ChatGPT é ferramenta de rascunho. Quem cola o output entra no mesmo leilão. A skill escreve (ou reescreve) como humano com dor, depois **roda DDC** no resultado e **emite um mega-prompt** para repetir o método.

## Quando usar

- Escrever copy de reel, anúncio, VSL curta, quiz, disparo, headline.
- Humanizar texto que “parece GPT”.
- Diagnóstico de copy (não só de criativo visual).
- Mecanismo único, headline/red line, low ticket, nichos DR (emagrecimento, ED, relacionamento, renda extra).

## Quando NÃO usar

- Scorar um criativo já escrito, sem reescrita → skill `ddc`.
- Gerar imagem/vídeo → `creative-engine` / `cyberia`.
- Escalar um campeão (DDC ≥80) em 15×3×5 → `criativo-campeao`.
- Régua de VSL/ROAS/backend → `segredos-da-escala`.
- Só limpar slop de texto geral (não ads) → `no-ai-slop`.

## Inputs

Produto, avatar, nicho, formato (reel / ads / VSL / quiz / disparo), temperatura do tráfego. Copy existente se houver. Sem isso, inferir e declarar a premissa.

## Quatro camadas (nessa ordem)

1. **Lentes** — escrever na língua do cliente, não no ego do copywriter. Relato real > adjetivo bonito.
2. **Arquitetura** — necessidade / status / metafísico + um dos 4 desejos + mecanismo único nomeado.
3. **Estrutura Balaclava** — gancho → exposição → realidade → CTA. Protocolo “já sangrou”.
4. **Humanização** — matar marcas d’água de IA; coerência não basta, precisa compreensão e subtexto.

Detalhe em `references/`.

## Workflow

1. Classificar o pedido: escrever do zero / humanizar / diagnosticar / emitir mega-prompt.
2. Limpar lentes: qual mundo o avatar vive? que frase ele falaria no grupo de Facebook?
3. Travar a arquitetura (1 linha): tipo de produto + desejo dominante + mecanismo em nome de chiclete.
4. Escrever na Estrutura Balaclava. Gancho muda; a estrutura não.
5. Passar o checklist de marcas d’água. Qualquer hit = reescrever a frase, não “suavizar”.
6. Rodar **DDC** no texto (10 blocos). Overlay Balaclava (sangrou, contexto, marcas, estrutura) entra **antes** do score — copy com marca d’água não passa de 69 mesmo com hook bonito.
7. Entregar: copy + DDC + mega-prompt da operação (pronto para colar noutro LLM).

Ler só a referência do pedido:

| Pedido | Referência |
| --- | --- |
| Estrutura, “já sangrou”, AIDA/PAS, reel | `references/01-estrutura.md` |
| Humanizar, GPT, marcas d’água, “parece IA” | `references/02-humanizacao.md` |
| Desejo, mecanismo, headline, nicho, low ticket | `references/03-desejos-mecanismo.md` |
| Mega-prompt, overlay DDC, output | `references/04-mega-prompt-ddc.md` |

## Falhas

- Colar ChatGPT e “dar uma revisada”. Isso é Doritos.
- Headline “elimine X kg em Y dias” / “descubra”. Porta batida = bounce.
- Mecanismo = lista de ingredientes. Mecanismo é o porquê *diferente* (picanha no X-tudo, não “algodão peruano”).
- Escrever para impressionar copywriter. Cliente não lê isso.
- Confirmar 40 fatos para quem já escolheu a caverna. Persuasão confirma a ilusão, depois guia.
- Low ticket sem backend. Front barato sozinho é prejuízo em três prazos.
- Scorar DDC sem o overlay de marcas d’água — GPT bem estruturado engana o Bloco 3.

## Integração

- Depois da copy aprovada, se o usuário quiser visual → `creative-engine`.
- Se DDC ≥80 e pedir escala → `criativo-campeao`.
- Régua de VSL/funil em paralelo → `segredos-da-escala` (não misturar no mesmo bloco).

## Output

```
# Copy Balaclava — [produto] · DDC XX/100 · [DECISÃO]

## Arquitetura (1 linha)
## Copy
## Overlay Balaclava (lentes / sangrou / marcas / estrutura)
## DDC (10 blocos, compacto)
## Mega-prompt (bloco copiável)
```
