# Mega-prompt + overlay DDC

## Overlay Balaclava (roda ANTES do DDC)

Quatro checks. Qualquer falha grave trava o teto do score.

| Check | Passa se | Falha se |
| --- | --- | --- |
| Lentes | Frase que só aquele avatar falaria | Texto portátil para qualquer nicho |
| Sangrou | Tentativas nomeadas + autor na mesma dor | Aula, flex, ou “eu descobri um método” sem pele |
| Marcas d’água | Zero hits da tabela em `02-humanizacao.md` | “e o melhor”, impacto empilhado, “descubra” |
| Estrutura | Gancho → exposição → realidade → CTA legíveis | Só gancho+CTA, ou PAS genérico sem reviravolta |

Regra de teto: 1+ marca d’água ou zero “sangrou” → score DDC **não passa de 69** (REFAÇA HOOK / KILL), mesmo com hook 8/10.

Depois do overlay, executar os 10 blocos da skill `ddc` no texto. Não reescrever o DDC aqui.

Encaixe típico:

- Bloco 3 (Hook) — o gancho Balaclava *é* o hook; scorar as 5 dimensões.
- Bloco 4 (Triângulo) — mecanismo único desta skill = mecanismo do DDC. Sem nome de chiclete = commodity.
- Bloco 5 (Narrativa) — se usou Balaclava, rotular **Balaclava (gancho/exposição/realidade/CTA)**, não “híbrido” vago.
- Bloco 6 — medo / pertencimento / FOMO / inimigo mapeiam para gatilhos; não forçar os 8 se a copy só usa 2 com força.

## Mega-prompt (entregar copiável)

Preencher os colchetes com o caso. Não deixar placeholder.

```
Você é copywriter de tráfego pago. Escreve como humano com dor, não como LLM.

PRODUTO: [nome, o que entrega, ticket]
AVATAR: [quem, em que momento da vida, o que já tentou]
TIPO: necessidade | status | metafísico
DESEJO DOMINANTE: medo | pertencimento | FOMO | inimigo em comum
MECANISMO ÚNICO (nome de chiclete): [1 frase]
FORMATO: reel | ads | VSL curta | quiz | disparo
PLATAFORMA + TEMPERATURA: [Meta/TikTok/…] [frio/morno/quente]

ESTRUTURA OBRIGATÓRIA
1. Gancho — quebra de padrão, muda neste criativo.
2. Exposição — sangue agora; "estou falando com você"; listar tentativas reais.
3. Realidade — reviravolta; sem o mecanismo o resto escorre; prova de que quem escreve já sangrou.
4. CTA — ação concreta, baixa fricção, sem escassez inventada.

PROIBIDO
- Colar cara de ChatGPT: "e o melhor", "descubra", frases de impacto empilhadas, paralelismo vazio, tom de locutor.
- Headline "elimine X em Y dias".
- Mecanismo = lista de ingrediente/spec.
- Escrever para impressionar copywriter.

TESTE DE VOZ
Cada frase precisa passar: uma pessoa nesse ofício/dor mandaria isso no áudio do WhatsApp?

SAÍDA
1. Arquitetura em 1 linha (tipo + desejo + mecanismo).
2. Copy final.
3. Checklist: lentes / sangrou / marcas / estrutura (passa/falha).
4. 2 ganchos alternativos (mesmo corpo).
```

Se o usuário pediu só o mega-prompt, entregar este bloco preenchido e parar. Se pediu a copy, escrever a copy **você** (esta skill) e ainda assim anexar o mega-prompt preenchido para reuso.

## Formato DDC compacto (depois da copy)

Não repetir o manual do DDC. Trazer:

```
Score: XX/100 · [DECISÃO]
Hook: x/10 · Promessa: x/10 · Mecanismo: [nome] 
Overlay: lentes [ok/fail] · sangrou [ok/fail] · marcas [0 hits / listar] · estrutura [ok/fail]
O que mata: [1 linha]
Top 3 ajustes: …
3 variações de gancho ( Balaclava: só o bloco 1 muda )
```

Decisão segue a tabela do `ddc`. Overlay pode puxar para baixo; nunca para cima.
