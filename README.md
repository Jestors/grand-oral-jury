# Simulateur Jury — Grand Oral (STMG + Série Générale)

Outil de simulation du Temps 2 du Grand Oral pour toutes les filières.

## Déploiement Vercel (5 minutes)

1. vercel.com → "Add New Project" → "Upload" → glisse ce dossier zippé
2. Settings → Environment Variables → ajoute : ANTHROPIC_API_KEY = ta clé sk-ant-...
3. Clique Deploy → ton site est en ligne !

## Développement local

npm install
cp .env.example .env.local
# Édite .env.local avec ta vraie clé
npm run dev
# Ouvre http://localhost:3000
