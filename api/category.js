// ───────────────────────────────────────────────────────────
//  FairTrade — serverless SEO stránka kategorie  (/kategorie/:slug)
//  Crawleři (Google, AI boti) dostanou indexovatelný HTML výpis
//  aktivních inzerátů kategorie s odkazy na /inzerat/:id;
//  skuteční návštěvníci se přesměrují do SPA (#pevna-cena/Název).
//  Slug = id z KATEGORIE v index.html — držet v synchronu!
// ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mpioazyvtgcpxjrhbflp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waW9henl2dGdjcHhqcmhiZmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDM1MjksImV4cCI6MjA5NjU3OTUyOX0.pNgPqE1aOrsA2efj5H5FIkNjdcKxo7MVycEjfyEVc4s';
const BASE = 'https://www.passion4all.cz';

// slug → { name: přesná hodnota sloupce category, desc: meta popis }
const KATEGORIE = {
  'elektronika':  { name: 'Elektronika',       desc: 'Telefony, počítače, foto, herní konzole, audio i TV — nové a z druhé ruky.' },
  'moda':         { name: 'Móda',              desc: 'Dámské, pánské a dětské oblečení, boty, kabelky a doplňky z druhé ruky i nové.' },
  'sperky':       { name: 'Šperky a hodinky',  desc: 'Prsteny, náhrdelníky, náramky, náušnice a hodinky — bazar i nové kusy.' },
  'sberatelstvi': { name: 'Sběratelství',      desc: 'Mince, známky, trading cards, figurky, modely a starožitnosti od sběratelů.' },
  'domacnost':    { name: 'Domácnost',         desc: 'Nábytek, kuchyně, dekorace, zahrada, nářadí a bytový textil výhodně.' },
  'sport':        { name: 'Sport a outdoor',   desc: 'Kola, zimní i letní sporty, fitness vybavení a outdoorová výbava.' },
  'knihy':        { name: 'Knihy a média',     desc: 'Knihy, filmy, hudba, LP desky a videohry z druhé ruky i nové.' },
  'hracky':       { name: 'Hračky a hry',      desc: 'LEGO, stavebnice, panenky, společenské hry a vzdělávací hračky.' },
  'auta':         { name: 'Auta a moto',       desc: 'Autodoplňky, motodoplňky a náhradní díly.' },
  'ostatni':      { name: 'Ostatní',           desc: 'Vše, co se nevešlo jinam — pestrá nabídka z celého tržiště.' },
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtCzk(n) {
  try { return Number(n || 0).toLocaleString('cs-CZ'); } catch (e) { return String(Math.round(n || 0)); }
}
async function fetchItems(table, categoryName) {
  try {
    const q = `${SUPABASE_URL}/rest/v1/${table}?status=eq.aktivn%C3%AD&category=eq.${encodeURIComponent(categoryName)}` +
      `&select=id,title,price,current_price,starting_price,images,created_at&order=created_at.desc&limit=60`;
    const r = await fetch(q, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    return r.ok ? await r.json() : [];
  } catch (e) { return []; }
}

module.exports = async (req, res) => {
  const slug = ((req.query && req.query.slug) || '').toLowerCase();
  const cat = KATEGORIE[slug];
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!cat) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Kategorie nenalezena — FairTrade</title><meta name="robots" content="noindex"><script>location.replace('/')</script></head><body>Kategorie nenalezena. <a href="/">Zpět na tržiště</a></body></html>`);
    return;
  }

  const [pc, au] = await Promise.all([fetchItems('pevna_cena', cat.name), fetchItems('aukce', cat.name)]);
  const items = [...(Array.isArray(pc) ? pc : []), ...(Array.isArray(au) ? au : [])]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 60);

  const url = `${BASE}/kategorie/${slug}`;
  const appUrl = `/#pevna-cena/${encodeURIComponent(cat.name)}`;
  const fullTitle = esc(`${cat.name} — bazar a aukce | FairTrade Tržiště`);
  const metaDesc = esc(`${cat.desc} ${items.length ? items.length + '+ aktivních inzerátů.' : ''} Bezpečný nákup s escrow ochranou plateb.`.trim());

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': url, url: url, name: `${cat.name} — FairTrade Tržiště`,
        description: cat.desc, inLanguage: 'cs', isPartOf: { '@id': `${BASE}/#website` } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'FairTrade Tržiště', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: cat.name, item: url },
      ] },
      { '@type': 'ItemList', numberOfItems: items.length,
        itemListElement: items.slice(0, 30).map((it, i) => ({
          '@type': 'ListItem', position: i + 1, url: `${BASE}/inzerat/${it.id}`, name: it.title || 'Inzerát',
        })) },
    ],
  });

  const rows = items.map((it) => {
    const price = Number(it.price || it.current_price || it.starting_price || 0);
    const img = (Array.isArray(it.images) && it.images[0]) ? it.images[0] : '';
    return `<li style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9">
      ${img ? `<img src="${esc(img)}" alt="${esc(it.title || '')}" width="56" height="56" loading="lazy" style="width:56px;height:56px;object-fit:cover;border-radius:10px">` : ''}
      <a href="/inzerat/${esc(it.id)}" style="color:#0f172a;text-decoration:none;font-weight:600;flex:1">${esc(it.title || 'Inzerát')}</a>
      <span style="color:#db2777;font-weight:bold;white-space:nowrap">${fmtCzk(price)} Kč</span>
    </li>`;
  }).join('\n');

  const others = Object.entries(KATEGORIE).filter(([s]) => s !== slug)
    .map(([s, c]) => `<a href="/kategorie/${s}" style="color:#0ea5e9;text-decoration:none">${esc(c.name)}</a>`).join(' · ');

  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1800');
  res.end(`<!doctype html><html lang="cs"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${fullTitle}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="${metaDesc}">
<meta property="og:type" content="website">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}/icon-512.png">
<meta property="og:site_name" content="FairTrade Tržiště">
<meta property="og:locale" content="cs_CZ">
<script type="application/ld+json">${jsonld}</script>
<script>
  try {
    var ua = navigator.userAgent || '';
    if (!/bot|crawl|spider|facebookexternalhit|slurp|bingpreview|whatsapp|telegram|discordbot|preview|embed|skype|pinterest|linkedinbot|twitterbot/i.test(ua)) {
      location.replace('${appUrl}');
    }
  } catch (e) { location.replace('${appUrl}'); }
</script>
</head><body style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1f2937;line-height:1.6">
  <p style="font-size:13px;color:#9ca3af;margin:0 0 4px"><a href="/" style="color:#0ea5e9;text-decoration:none">FairTrade Tržiště</a> › ${esc(cat.name)}</p>
  <h1 style="font-size:24px;margin:0 0 6px">${esc(cat.name)} — bazar a aukce</h1>
  <p style="color:#374151;margin:0 0 18px">${esc(cat.desc)}</p>
  <ul style="list-style:none;margin:0;padding:0">${rows || '<li style="color:#6b7280">V této kategorii právě nejsou žádné aktivní inzeráty.</li>'}</ul>
  <p style="margin-top:22px"><a href="${appUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Procházet ${esc(cat.name)} na FairTrade →</a></p>
  <p style="font-size:14px;color:#6b7280;margin-top:26px">Další kategorie: ${others}</p>
  <p style="font-size:12px;color:#9ca3af;margin-top:18px">🔒 Bezpečný nákup přes escrow — peníze se uvolní prodejci až po potvrzení doručení.</p>
</body></html>`);
};
