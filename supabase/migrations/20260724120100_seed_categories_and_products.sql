-- Initial catalog seed, mirroring the data that used to live in src/lib/products.ts.
-- Images point at /images/... (served from the public/ folder) so the storefront keeps
-- working immediately; use the admin panel to replace them with uploaded images whenever needed.
-- Safe to re-run: upserts by primary key / slug.

insert into public.categories (id, slug, name, emoji, tagline, image_url, sort_order) values
  ('masculino',  'homens',        'Homens',         '⚽', 'Camisas dos maiores clubes',        '/images/categories/masculino.jpg', 1),
  ('feminino',   'mulheres',      'Mulheres',       '👕', 'Modelagem feminina premium',        '/images/categories/feminino.jpg',  2),
  ('retro',      'retro',         'Retrô',          '🏆', 'Clássicos que marcaram época',      '/images/categories/retro.jpg',     3),
  ('caneleiras', 'caneleiras',    'Caneleiras',     '🦵', 'Proteção para treinos e jogos',     '/images/categories/caneleiras.jpg',4),
  ('jogador',    'versao-jogador','Versão Jogador', '⭐', 'Tecnologia usada em campo',         '/images/categories/jogador.jpg',   5)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  emoji = excluded.emoji,
  tagline = excluded.tagline,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order;

insert into public.products (slug, name, club, image_url, price, old_price, discount, colors, category, sizes, description, sort_order) values
  ('corinthians', 'Camisa Corinthians', 'Corinthians', '/images/products/corinthians.jpg', 99.90, 149.90, 33, array['#000000','#FFFFFF'], 'masculino', null, null, 1),
  ('palmeiras', 'Camisa Palmeiras', 'Palmeiras', '/images/products/palmeiras.jpg', 99.90, 149.90, 33, array['#006437','#FFFFFF'], 'masculino', null, null, 2),
  ('cruzeiro', 'Camisa Cruzeiro', 'Cruzeiro', '/images/products/cruzeiro.jpg', 99.90, 149.90, 33, array['#1e40af','#FFFFFF'], 'masculino', null, null, 3),
  ('vasco', 'Camisa Vasco', 'Vasco', '/images/products/vasco.jpg', 99.90, 149.90, 33, array['#000000','#FFFFFF'], 'masculino', null, null, 4),
  ('flamengo', 'Camisa Flamengo', 'Flamengo', '/images/products/flamengo.jpg', 99.90, 149.90, 33, array['#e50914','#000000'], 'masculino', null, null, 5),
  ('botafogo', 'Camisa Botafogo', 'Botafogo', '/images/products/botafogo.jpg', 99.90, 149.90, 33, array['#000000','#FFFFFF'], 'masculino', null, null, 6),
  ('saopaulo', 'Camisa São Paulo', 'São Paulo', '/images/products/saopaulo.jpg', 99.90, 149.90, 33, array['#FFFFFF','#e50914','#000000'], 'masculino', null, null, 7),
  ('bahia', 'Camisa Bahia', 'Bahia', '/images/products/bahia.jpg', 99.90, 149.90, 33, array['#e50914','#1e40af','#FFFFFF'], 'masculino', null, null, 8),
  ('gremio', 'Camisa Grêmio', 'Grêmio', '/images/products/gremio.jpg', 99.90, 149.90, 33, array['#000000','#1e40af','#FFFFFF'], 'masculino', null, null, 9),
  ('internacional', 'Camisa Internacional', 'Internacional', '/images/products/internacional.jpg', 99.90, 149.90, 33, array['#e50914','#FFFFFF'], 'masculino', null, null, 10),
  ('atleticomg', 'Camisa Atlético-MG', 'Atlético-MG', '/images/products/atleticomg.jpg', 99.90, 149.90, 33, array['#000000','#FFFFFF'], 'masculino', null, null, 11),
  ('fluminense', 'Camisa Fluminense', 'Fluminense', '/images/products/fluminense.jpg', 99.90, 149.90, 33, array['#7f1d1d','#065f46','#FFFFFF'], 'masculino', null, null, 12),
  ('santos', 'Camisa Santos', 'Santos', '/images/products/santos.jpg', 99.90, 149.90, 33, array['#FFFFFF','#000000'], 'masculino', null, null, 13),
  ('athleticopr', 'Camisa Athletico-PR', 'Athletico-PR', '/images/products/athleticopr.jpg', 99.90, 149.90, 33, array['#e50914','#000000'], 'masculino', null, null, 14),

  ('fem-flamengo', 'Camisa Feminina Flamengo', 'Flamengo', '/images/products/fem-flamengo.jpg', 109.90, 159.90, 31, array['#e50914','#000000'], 'feminino', null, null, 15),
  ('fem-corinthians', 'Camisa Feminina Corinthians', 'Corinthians', '/images/products/fem-corinthians.jpg', 109.90, 159.90, 31, array['#000000','#FFFFFF'], 'feminino', null, null, 16),
  ('fem-palmeiras', 'Camisa Feminina Palmeiras', 'Palmeiras', '/images/products/fem-palmeiras.jpg', 109.90, 159.90, 31, array['#006437','#FFFFFF'], 'feminino', null, null, 17),
  ('fem-saopaulo', 'Camisa Feminina São Paulo', 'São Paulo', '/images/products/fem-saopaulo.jpg', 109.90, 159.90, 31, array['#FFFFFF','#e50914','#000000'], 'feminino', null, null, 18),
  ('fem-vasco', 'Camisa Feminina Vasco', 'Vasco', '/images/products/fem-vasco.jpg', 109.90, 159.90, 31, array['#000000','#FFFFFF'], 'feminino', null, null, 19),
  ('fem-brasil', 'Camisa Feminina Seleção Brasileira', 'Brasil', '/images/products/fem-brasil.jpg', 119.90, 179.90, 33, array['#FFD400','#006437'], 'feminino', null, null, 20),
  ('fem-barcelona', 'Camisa Feminina Barcelona', 'Barcelona', '/images/products/fem-barcelona.jpg', 129.90, 189.90, 32, array['#a50044','#004d98'], 'feminino', null, null, 21),
  ('fem-realmadrid', 'Camisa Feminina Real Madrid', 'Real Madrid', '/images/products/fem-realmadrid.jpg', 129.90, 189.90, 32, array['#FFFFFF','#DAA520'], 'feminino', null, null, 22),
  ('fem-psg', 'Camisa Feminina PSG', 'PSG', '/images/products/fem-psg.jpg', 129.90, 189.90, 32, array['#0a1b3d','#e50914'], 'feminino', null, null, 23),
  ('fem-mancity', 'Camisa Feminina Manchester City', 'Manchester City', '/images/products/fem-mancity.jpg', 129.90, 189.90, 32, array['#6CABDD','#FFFFFF'], 'feminino', null, null, 24),

  ('caneleira-nike', 'Caneleira Nike Mercurial Lite', 'Nike', '/images/products/caneleira-nike.jpg', 79.90, 119.90, 33, array['#000000','#FFFFFF'], 'caneleiras', array['S','M','L'], 'Caneleira Nike Mercurial Lite com carcaça em polipropileno de alta resistência, forro em EVA e tiras ajustáveis. Proteção leve e conforto para treinos e jogos.', 25),

  ('retro-brasil-2002', 'Camisa Retrô Brasil 2002', 'Brasil', '/images/products/retro-brasil-2002.jpg', 149.90, 219.90, 32, array['#FFD400','#006437'], 'retro', null, null, 26),
  ('retro-brasil-1994', 'Camisa Retrô Brasil 1994', 'Brasil', '/images/products/retro-brasil-1994.jpg', 149.90, 219.90, 32, array['#FFD400','#006437'], 'retro', null, null, 27),
  ('retro-flamengo-1981', 'Camisa Retrô Flamengo 1981', 'Flamengo', '/images/products/retro-flamengo-1981.jpg', 149.90, 219.90, 32, array['#e50914','#000000'], 'retro', null, null, 28),
  ('retro-palmeiras-1999', 'Camisa Retrô Palmeiras 1999', 'Palmeiras', '/images/products/retro-palmeiras-1999.jpg', 149.90, 219.90, 32, array['#006437','#FFFFFF'], 'retro', null, null, 29),
  ('retro-vasco-1998', 'Camisa Retrô Vasco 1998', 'Vasco', '/images/products/retro-vasco-1998.jpg', 149.90, 219.90, 32, array['#000000','#FFFFFF'], 'retro', null, null, 30),
  ('retro-barcelona-2009', 'Camisa Retrô Barcelona 2009', 'Barcelona', '/images/products/retro-barcelona-2009.jpg', 159.90, 229.90, 30, array['#a50044','#004d98'], 'retro', null, null, 31),
  ('retro-milan-2007', 'Camisa Retrô Milan 2007', 'Milan', '/images/products/retro-milan-2007.jpg', 159.90, 229.90, 30, array['#e50914','#000000'], 'retro', null, null, 32),
  ('retro-realmadrid-2002', 'Camisa Retrô Real Madrid 2002', 'Real Madrid', '/images/products/retro-realmadrid-2002.jpg', 159.90, 229.90, 30, array['#FFFFFF','#DAA520'], 'retro', null, null, 33),
  ('retro-manunited-1999', 'Camisa Retrô Manchester United 1999', 'Manchester United', '/images/products/retro-manunited-1999.jpg', 159.90, 229.90, 30, array['#e50914','#FFFFFF'], 'retro', null, null, 34),

  ('jogador-flamengo', 'Camisa Flamengo Versão Jogador', 'Flamengo', '/images/products/jogador-flamengo.jpg', 189.90, 279.90, 32, array['#e50914','#000000'], 'jogador', null, 'Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade. Idêntica à usada pelos atletas em campo.', 35),
  ('jogador-realmadrid', 'Camisa Real Madrid Versão Jogador', 'Real Madrid', '/images/products/jogador-realmadrid.jpg', 199.90, 299.90, 33, array['#FFFFFF','#DAA520'], 'jogador', null, 'Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade.', 36),
  ('jogador-barcelona', 'Camisa Barcelona Versão Jogador', 'Barcelona', '/images/products/jogador-barcelona.jpg', 199.90, 299.90, 33, array['#a50044','#004d98'], 'jogador', null, 'Versão jogador com tecido tecnológico dry-fit, modelagem slim atlética, escudo em silicone, acabamento premium e altíssima respirabilidade.', 37)
on conflict (slug) do update set
  name = excluded.name,
  club = excluded.club,
  image_url = excluded.image_url,
  price = excluded.price,
  old_price = excluded.old_price,
  discount = excluded.discount,
  colors = excluded.colors,
  category = excluded.category,
  sizes = excluded.sizes,
  description = excluded.description,
  sort_order = excluded.sort_order;
