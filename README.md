# ezto

Site public pour referencer les taux immobiliers partenaires, verifier les mobiles avec Twilio Verify et envoyer les demandes vers Twenty CRM.

## Lancer en local

```bash
npm install
npm run dev
```

Sans variables Twilio, le mode local accepte le code SMS `123456`.

## Variables

Copier `.env.example` vers `.env`, puis renseigner :

- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`
- `MISTRAL_API_KEY` pour l'extraction OCR des PDF de baremes. Les fichiers DOCX/DOC sont extraits côté serveur.
- `LEAD_TOKEN_SECRET`
- `TWENTY_INTAKE_WEBHOOK_URL` pour le MVP, ou `TWENTY_API_BASE_URL` + `TWENTY_API_KEY` pour l'API directe.

## Deploiement Hostinger VPS

```bash
docker compose up -d --build
```

Le `Caddyfile` expose `ezto.fr` et `www.ezto.fr` en HTTPS automatique. Le service PostgreSQL est inclus dans `docker-compose.yml`.

## Base de donnees

Le modele PostgreSQL/Prisma separe les baremes officiels et les taux reellement obtenus par les courtiers.

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

Tables principales :

- `Bank` : banque, logo, region.
- `RateSheet` : bareme mensuel, fichier source, statut.
- `RateRule` : taux de base selon duree, revenus, DPE, type de projet, apport/TAP.
- `RateAdjustment` : bonifications, decotes et majorations.
- `EligibilityRule` : conditions bloquantes ou d'octroi.
- `RateImport` : depot PDF, Markdown OCR Mistral, statut et nombre de taux detectes.
- `AchievedRate` : historique des taux obtenus par les courtiers avec duree, profil et apport.

Le moteur `src/lib/rate-engine.ts` compare le bareme applicable avec les historiques terrain. L'endpoint `POST /api/rates/recommendations` est pret pour recevoir un profil client et retourner les banques les plus pertinentes.

## Donnees taux

Les lignes visibles du site restent actuellement dans `src/lib/rates.ts`. Les statuts :

- `Verifie` : extrait et relu depuis le texte du bareme.
- `A controler` : extraction automatique plausible, validation humaine recommandee.
- `A importer` : document non exploite par extraction texte simple.

La prochaine etape consiste a migrer progressivement chaque banque vers les tables Prisma afin que la mise a jour mensuelle se fasse par import/admin plutot que par code React.
