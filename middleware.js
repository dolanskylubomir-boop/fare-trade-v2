// Privátní náhled FairTrade / passion4all – ochrana heslem na úrovni Vercel Edge.
// Místo systémového Basic Auth okna (Vercel ořezává hlavičku WWW-Authenticate)
// zobrazuje vlastní přihlašovací stránku a po zadání hesla nastaví cookie.
//
// Nastavení: Vercel → Settings → Environment Variables → SITE_PASS = tvoje heslo.
// Po spuštění webu tento soubor smaž a redeployni (nebo smaž SITE_PASS).

export const config = {
  // Chrání vše kromě statických assetů. Zamkne i /api/* a celý web.
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

const COOKIE = 'p4a_gate';

function loginPage(error) {
  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Privátní náhled</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background:#f0f9ff; color:#0f172a; }
  .card { background:#fff; padding:40px 36px; border-radius:18px; box-shadow:0 10px 40px rgba(2,132,199,.15);
          width:100%; max-width:360px; text-align:center; }
  h1 { font-size:20px; margin:0 0 6px; }
  p { margin:0 0 22px; color:#64748b; font-size:14px; }
  input { width:100%; padding:13px 14px; border:1px solid #cbd5e1; border-radius:10px; font-size:16px; }
  input:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.2); }
  button { width:100%; margin-top:14px; padding:13px; border:0; border-radius:10px; background:#0ea5e9;
           color:#fff; font-size:16px; font-weight:600; cursor:pointer; }
  button:hover { background:#0284c7; }
  .err { color:#dc2626; font-size:13px; margin-top:12px; }
</style>
</head>
<body>
  <form class="card" method="POST" autocomplete="off">
    <h1>🔒 Privátní náhled</h1>
    <p>Stránka je dočasně chráněná heslem.</p>
    <input type="password" name="pw" placeholder="Zadej heslo" autofocus required>
    <button type="submit">Vstoupit</button>
    ${error ? `<div class="err">${error}</div>` : ''}
  </form>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export default async function middleware(request) {
  const pass = process.env.SITE_PASS;

  // Bez nastaveného hesla ochranu vynech (aby se web nezamkl natrvalo omylem).
  if (!pass) return;

  const token = encodeURIComponent(pass);

  // Už přihlášen? (platná cookie)
  const cookies = request.headers.get('cookie') || '';
  if (cookies.split(';').some((c) => c.trim() === `${COOKIE}=${token}`)) return;

  // Odeslání formuláře s heslem
  if (request.method === 'POST') {
    const body = await request.text();
    const submitted = new URLSearchParams(body).get('pw');
    if (submitted === pass) {
      const url = new URL(request.url);
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname || '/',
          'Set-Cookie': `${COOKIE}=${token}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return loginPage('Nesprávné heslo, zkus to znovu.');
  }

  // Jinak ukaž přihlašovací stránku
  return loginPage('');
}
