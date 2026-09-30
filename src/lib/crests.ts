/** Escudos locais por clube/seleção (public/images/crests). */
const CRESTS: Record<string, string> = {
  "alemanha": "/images/crests/alemanha.png",
  "argentina": "/images/crests/argentina.png",
  "arsenal": "/images/crests/arsenal.png",
  "athletico-pr": "/images/crests/athletico-pr.png",
  "atletico-de-madrid": "/images/crests/atletico-de-madrid.png",
  "atletico-mg": "/images/crests/atletico-mg.png",
  "bahia": "/images/crests/bahia.png",
  "barcelona": "/images/crests/barcelona.png",
  "bayern-de-munique": "/images/crests/bayern-de-munique.png",
  "belgica": "/images/crests/belgica.png",
  "borussia-dortmund": "/images/crests/borussia-dortmund.png",
  "botafogo": "/images/crests/botafogo.png",
  "brasil": "/images/crests/brasil.png",
  "chelsea": "/images/crests/chelsea.png",
  "corinthians": "/images/crests/corinthians.png",
  "croacia": "/images/crests/croacia.png",
  "cruzeiro": "/images/crests/cruzeiro.png",
  "espanha": "/images/crests/espanha.png",
  "flamengo": "/images/crests/flamengo.png",
  "fluminense": "/images/crests/fluminense.png",
  "franca": "/images/crests/franca.png",
  "gremio": "/images/crests/gremio.png",
  "holanda": "/images/crests/holanda.png",
  "inglaterra": "/images/crests/inglaterra.png",
  "inter-de-milao": "/images/crests/inter-de-milao.png",
  "internacional": "/images/crests/internacional.png",
  "italia": "/images/crests/italia.png",
  "japao": "/images/crests/japao.png",
  "juventus": "/images/crests/juventus.png",
  "liverpool": "/images/crests/liverpool.png",
  "manchester-city": "/images/crests/manchester-city.png",
  "manchester-united": "/images/crests/manchester-united.png",
  "mexico": "/images/crests/mexico.png",
  "milan": "/images/crests/milan.png",
  "palmeiras": "/images/crests/palmeiras.png",
  "portugal": "/images/crests/portugal.png",
  "psg": "/images/crests/psg.png",
  "real-madrid": "/images/crests/real-madrid.png",
  "santos": "/images/crests/santos.png",
  "sao-paulo": "/images/crests/sao-paulo.png",
  "tottenham": "/images/crests/tottenham.png",
  "uruguai": "/images/crests/uruguai.png",
  "vasco": "/images/crests/vasco.png",
};

const slug = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function crestFor(club: string): string | undefined {
  return CRESTS[slug(club)];
}
