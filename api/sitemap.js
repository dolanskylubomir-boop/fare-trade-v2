// ───────────────────────────────────────────────────────────
//  FairTrade — sitemap.xml (aktivní inzeráty pro Google)
// ───────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mpioazyvtgcpxjrhbflp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waW9henl2dGdjcHhqcmhiZmxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDM1MjksImV4cCI6MjA5NjU3OTUyOX0.pNgPqE1aOrsA2efj5H5FIkNjdcKxo7MVycEjfyEVc4s';

async function ids(table) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?status=eq.aktivn%C3%AD&select=id,created_at&order=created_at.desc&limit=5000`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    return r.ok ? await r.json() : [];
  } catch (e) { return []; }
}

module.exports = async (req, res) => {
  // Kanonická doména natvrdo (stejně jako v listing.js)
  const base = 'https://www.passion4all.cz';
  const [pc, au] = await Promise.all([ids('pevna_cena'), ids('aukce')]);
  const items = [...(Array.isArray(pc) ? pc : []), ...(Array.isArray(au) ? au : [])];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url><loc>${base}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
  // SEO stránky kategorií (/kategorie/:slug → api/category.js; slugs = KATEGORIE ids)
  for (const slug of ['elektronika','moda','sperky','sberatelstvi','domacnost','sport','knihy','hracky','auta','ostatni']) {
    xml += `  <url><loc>${base}/kategorie/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;
  }
  for (const it of items) {
    const lastmod = (it.created_at || '').slice(0, 10);
    xml += `  <url><loc>${base}/inzerat/${it.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>daily</changefreq></url>\n`;
  }
  xml += '</urlset>';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.end(xml);
};
