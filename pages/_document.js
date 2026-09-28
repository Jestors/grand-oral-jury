import { Html, Head, Main, NextScript } from "next/document";
 
// Fichier pages/_document.js
// Rôle : relier le manifeste, les icônes et le service worker (PWA)
// sans toucher à pages/index.js.
 
export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* PWA — manifeste et couleur de la barre du téléphone */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1C1A2E" />
        <meta name="description" content="Entraîne-toi au Grand Oral du bac face à un jury simulé par IA (STMG et voie générale)." />
 
        {/* Icônes */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
 
        {/* iPhone : plein écran quand l'app est ajoutée à l'écran d'accueil */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Grand Oral" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Enregistrement du service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", function () {
                  navigator.serviceWorker.register("/sw.js").catch(function () {});
                });
              }
            `,
          }}
        />
      </body>
    </Html>
  );
}
 
