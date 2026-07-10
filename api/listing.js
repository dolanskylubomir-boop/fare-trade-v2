// ───────────────────────────────────────────────────────────
//  passion4all — serverless OG/SEO náhled inzerátu  (/inzerat/:id)
//  Crawleři (Google, Facebook, WhatsApp…) dostanou prerenderované
//  meta tagy + JSON-LD; skuteční návštěvníci se přesměrují do SPA.
// ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mpioazyvtgcpxjrhbflp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waW9henl2dGdjcHhqcmhiZmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDM1MjksImV4cCI6MjA5NjU3OTUyOX0.pNgPqE1aOrsA2efj5H5FIkNjdcKxo7MVycEjfyEVc4s';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtCzk(n) {
  try { return Number(n || 0).toLocaleString('cs-CZ'); } catch (e) { return String(Math.round(n || 0)); }
}
async function fetchListing(table, id) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=id,title,description,price,current_price,starting_price,images,category,condition,brand,status&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    if (!r.ok) return null;
    const rows = await r.json();
    return (Array.isArray(rows) && rows[0]) ? rows[0] : null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  const id = (req.query && (req.query.id || req.query.slug)) || '';
  // Kanonická doména natvrdo — jinak si každá doména (.cz/.com/.eu/vercel.app)
  // kanonizuje sama na sebe a Google vidí duplicitní obsah.
  const base = 'https://www.passion4all.cz';

  let item = null, view = 'pevna-cena-detail';
  if (id) {
    item = await fetchListing('pevna_cena', id);
    if (!item) { item = await fetchListing('aukce', id); if (item) view = 'aukce-detail'; }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!item) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.end(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Inzerát nenalezen — passion4all</title><meta name="robots" content="noindex"><script>location.replace('/#pevna-cena')</script></head><body>Inzerát nenalezen. <a href="/">Zpět na tržiště</a></body></html>`);
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  const title = item.title || 'Inzerát';
  const price = Number(item.price || item.current_price || item.starting_price || 0);
  const img = (Array.isArray(item.images) && item.images[0]) ? item.images[0] : (base + '/icon-512.png');
  const descRaw = (item.description || '').replace(/\s+/g, ' ').trim();
  const metaDesc = esc((descRaw ? descRaw.slice(0, 155) : `${title} za ${fmtCzk(price)} Kč na tržišti passion4all — bezpečný nákup přes escrow.`));
  const url = `${base}/inzerat/${esc(id)}`;
  const appUrl = `/#${view}/${esc(id)}`;
  const fullTitle = esc(`${title} — ${fmtCzk(price)} Kč | passion4all`);
  const condition = item.condition
    ? (/nov/i.test(item.condition) ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition')
    : undefined;
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product',
    name: title, image: img, description: descRaw.slice(0, 300),
    category: item.category || undefined, brand: item.brand || undefined,
    itemCondition: condition,
    offers: { '@type': 'Offer', price: price, priceCurrency: 'CZK', itemCondition: condition,
      availability: item.status === 'aktivní' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: url }
  });

  res.end(`<!doctype html><html lang="cs"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${fullTitle}</title>
<link rel="canonical" href="${url}">
<meta name="description" content="${metaDesc}">
<meta property="og:type" content="product">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${metaDesc}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="passion4all">
<meta property="og:locale" content="cs_CZ">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${fullTitle}">
<meta name="twitter:description" content="${metaDesc}">
<meta name="twitter:image" content="${esc(img)}">
<meta property="product:price:amount" content="${price}">
<meta property="product:price:currency" content="CZK">
<script type="application/ld+json">${jsonld}</script>
<script>
  try {
    var ua = navigator.userAgent || '';
    if (!/bot|crawl|spider|facebookexternalhit|slurp|bingpreview|whatsapp|telegram|discordbot|preview|embed|skype|pinterest|linkedinbot|twitterbot/i.test(ua)) {
      location.replace('${appUrl}');
    }
  } catch (e) { location.replace('${appUrl}'); }
</script>
</head><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:40px auto;padding:0 20px;color:#1f2937;line-height:1.6">
  <h1 style="font-size:22px;margin:0 0 6px">${esc(title)}</h1>
  <p style="font-size:22px;font-weight:bold;color:#db2777;margin:0 0 14px">${fmtCzk(price)} Kč</p>
  <img src="${esc(img)}" alt="${esc(title)}" style="max-width:100%;border-radius:12px;display:block;margin-bottom:14px">
  <p style="color:#374151">${esc(descRaw.slice(0, 300))}</p>
  <p><a href="${appUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Zobrazit na passion4all →</a></p>
  <p style="font-size:12px;color:#9ca3af;margin-top:24px">🔒 Bezpečný nákup přes escrow — peníze se uvolní prodejci až po potvrzení doručení.</p>
</body></html>`);
};
