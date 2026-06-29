// Privátní náhled FairTrade Tržiště – ochrana heslem (HTTP Basic Auth) na úrovni Vercel Edge.
// Ověření probíhá na serveru, takže bez hesla se ke klientovi nedostane ani řádek HTML.
//
// Nastavení ve Vercelu: Settings → Environment Variables → SITE_USER a SITE_PASS.
// Po spuštění webu tento soubor smaž a redeployni (nebo smaž env proměnné).

export const config = {
  // Chrání vše kromě statických assetů Vercelu. Zamkne i /api/* a celý web.
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};

export default function middleware(request) {
  const user = process.env.SITE_USER;
  const pass = process.env.SITE_PASS;

  // Pokud nejsou nastavené proměnné, ochranu raději vynech (aby se web nezamkl omylem natrvalo).
  if (!user || !pass) return;

  const auth = request.headers.get('authorization');
  const expected = 'Basic ' + btoa(`${user}:${pass}`);

  if (auth === expected) return; // heslo sedí → pusť dál

  return new Response('401 – Vyžadováno heslo', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="FairTrade – privátní náhled", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
