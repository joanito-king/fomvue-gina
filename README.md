# FOMVUE — Regarder • Apprendre • Créer

*Watch • Learn • Create* — la marketplace des créateurs IA · [fomvue.com](https://fomvue.com)

Application web complète (fondation prête pour la production) issue du prototype FOMVUE (anciennement « IA Market »). Marque : **FOMVUE** dans le logo, « Fomvue » dans le texte courant ; slogan **Regarder • Apprendre • Créer** (*Watch • Learn • Create*), défini dans `src/lib/constants.ts`.
Chaque créateur IA a **sa boutique** (adresse `nom.fomvue.com`, logo, couleur), vend des produits digitaux
(scénarios & séries, idées, prompts, templates, ebooks, services sur commande, coaching, formations avec lecteur de cours, licences),
publie des **films et séries dans « Regarder »** (gratuit, ou payant à l'achat / location 48 h) et reçoit des **soutiens**.
Prix en **F CFA (XOF)**, paiement Wave / Orange Money / MTN / Moov / carte.

Palette **Indigo & or** : primaire `#2F2A7A`, secondaire `#0A5C4D`, accent `#8A6410`, fond `#F3F0EA`, texte `#16141F`.

## Ce qui fonctionne

| Domaine | Détail |
|---|---|
| Comptes | Inscription / connexion e-mail + mot de passe (haché bcrypt), sessions en base (cookie httpOnly, 30 jours), rôles **acheteur / créateur / admin**, suspension de compte |
| Boutiques | Création à l'inscription ou via « Devenir créateur », slug unique, logo (upload), couleur, accroche, bio, niveau Débutant/Confirmé ; sous-domaine `slug.fomvue.com` via `middleware.ts` (si `ROOT_DOMAIN` défini) |
| Produits | CRUD complet côté créateur (9 types, 5 catégories, prix, niveau, image de couverture, fichier livré), brouillon/publié, archivage automatique si déjà vendu ; catalogue avec recherche, filtres catégorie/niveau, tri prix |
| Formations | Leçons par modules (vidéo YouTube ou MP4 + notes), lecteur de cours, progression de l'élève |
| Regarder | Rangées Gratuit / Nouveautés / Séries / Films / Contes / Talk-shows, fiche, lecteur (YouTube ou MP4), paywall, **achat** ou **location 48 h**, compteur de vues |
| Soutien | Bouton doré « Soutenir le créateur » (boutique, fiche produit, fiche film, lecteur), montants 500 / 1 000 / 2 000 / 5 000 F CFA ou libre, message public, sans compte possible |
| Paiements | Abstraction de prestataire : **mock** (test, simule l'écran mobile money + webhook signé HMAC), **PayDunya** et **CinetPay** (code prêt, à activer avec les clés) ; webhooks idempotents |
| Grand livre | Tables `Payment`, `Order`, `FilmAccess`, `Tip`, `LedgerEntry`, `Payout` ; commissions **10 %** ventes & films, **5 %** soutiens (configurables) ; solde créateur = somme des écritures |
| Espace vendeur | Aperçu (ventes 30 j, revenus nets, solde, soutiens, mouvements), **demande de retrait** (min. 5 000 F CFA, montant réservé), produits, films (vues, brut, commission, net), soutiens reçus, personnalisation de la boutique |
| Acheteur | « Mes achats » : téléchargements protégés, formations avec progression, films achetés/loués (expiration), historique des soutiens |
| Admin (Gina) | Volume encaissé, commissions par source, soldes dus, derniers paiements, **traitement des retraits** (payé / refusé = recrédit), modération produits (approuver / masquer / mettre à la une), utilisateurs (suspendre, rendre admin) |

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions) — React 19
- **Prisma 6** + **SQLite** en dev (**PostgreSQL** en prod : une ligne à changer)
- bcryptjs, zod ; CSS du prototype (aucune dépendance UI)
- Tests : **Vitest** (services métier) + **Playwright** (parcours navigateur + captures)

```
src/
  app/                 pages (accueil, regarder, catalogue, boutique, produit, checkout, paiement, mes-achats, apprendre, vendeur, admin)
  app/actions/         server actions (auth, checkout, vendeur, admin, paiement test)
  app/api/             webhooks/[provider], files (images publiques), download (fichiers achetés), health
  lib/services/        logique métier testable (auth, catalogue, paiements, grand livre)
  lib/payments/        prestataires : mock.ts, paydunya.ts, cinetpay.ts
  lib/storage.ts       stockage de fichiers (local ; S3 à brancher)
prisma/schema.prisma   modèle de données ; prisma/seed.ts données de démo fictives
tests/                 tests Vitest ; scripts/smoke.mjs test de bout en bout + captures
```

## Lancer en local

Prérequis : Node.js 20+.

```bash
cp .env.example .env          # puis ajuster si besoin
npm install
npx prisma db push            # crée la base SQLite (prisma/dev.db)
npm run db:seed               # données de démo fictives
npm run dev                   # http://localhost:3000
```

Production locale : `npm run build && npm start` (port 3000, ou `PORT=8080 npm start`).
En mode production, le paiement test n'est accepté que si `ALLOW_MOCK_PAYMENTS="1"`.

### Comptes de démonstration (mot de passe `demo1234`)

| Rôle | E-mail |
|---|---|
| Admin (Gina) | `gina@fomvue.com` |
| Créatrice (Studio Awa) | `awa@fomvue.com` |
| Autres créateurs | `malik@`, `fatou@`, `yves@`, `mariama@`, `nadia@`, `jeanpierre@`, `rama@fomvue.com` |
| Acheteurs | `moussa@exemple.sn`, `aminata@exemple.sn` |

### Tests

```bash
npm test                      # Vitest : inscription, produit, achat, idempotence webhook, soutien, film achat/location, retraits, commissions
npm start & npm run smoke     # Playwright : parcours complet dans un vrai navigateur + captures dans screens/
```

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) ou `postgresql://…` |
| `APP_URL` | URL publique (retours de paiement et URL de webhook) |
| `ROOT_DOMAIN` | ex. `fomvue.com` pour activer `awa-diop.fomvue.com` |
| `PAYMENT_PROVIDER` | `mock` \| `paydunya` \| `cinetpay` |
| `MOCK_WEBHOOK_SECRET`, `ALLOW_MOCK_PAYMENTS` | prestataire de test |
| `PAYDUNYA_MODE`, `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_PUBLIC_KEY`, `PAYDUNYA_TOKEN` | PayDunya |
| `CINETPAY_API_KEY`, `CINETPAY_SITE_ID`, `CINETPAY_SECRET_KEY` | CinetPay |
| `COMMISSION_SALE_PCT` (10), `COMMISSION_FILM_PCT` (10), `COMMISSION_TIP_PCT` (5), `MIN_PAYOUT` (5000) | règles financières |
| `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`, `S3_*` | stockage des fichiers |
| `PRODUCT_MODERATION` | `post` (publié directement) ou `pre` (validation admin) |
| `SHOW_DEMO_ACCOUNTS` | afficher les comptes de démo sur la page de connexion en prod |

## Paiements : comment ça marche

1. L'acheteur choisit Wave / Orange Money / MTN / Moov / carte → un `Payment` (PENDING, référence `FMV-…`) est créé.
2. Le prestataire renvoie une URL de paiement ; l'acheteur y valide (en mode test : écran simulé `/paiement/test/…`).
3. Le prestataire appelle **`POST /api/webhooks/<prestataire>`** → vérification (signature / re-vérification API) → `applyPaymentEvent` crée, **une seule fois**, la commande / l'accès film / le soutien + les écritures du grand livre (part créateur et commission Fomvue).
4. Le créateur demande un retrait → montant réservé → Gina vire par Wave / OM puis clique « Marquer payé » (ou « Refuser » = recrédit).

**Activer PayDunya** : créer un compte marchand PayDunya, créer une application « Intégrer une API », copier les clés, puis
`PAYMENT_PROVIDER=paydunya`, `PAYDUNYA_MODE=test`, clés, `APP_URL=https://votre-domaine` ; tester en sandbox puis passer `PAYDUNYA_MODE=live`.
**Activer CinetPay** : même principe avec `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` (URL de notification : `https://votre-domaine/api/webhooks/cinetpay`).
Le code de ces deux connecteurs suit leur documentation publique mais **n'a pas pu être testé sans clés** : prévoir une session de test.

## Déployer

### Option A — Render (le plus simple pour démarrer)
Le fichier `render.yaml` crée un Web Service Node avec un **disque persistant** (`/var/data`) qui garde la base SQLite et les fichiers uploadés.
1. Pousser le code sur GitHub, puis Render → *New* → *Blueprint* → choisir le dépôt.
2. Renseigner `APP_URL` (ex. `https://fomvue.onrender.com`), puis plus tard les clés de paiement.
3. Données de démo (facultatif) : dans le Shell Render, `npm run db:seed`.
Pour monter en charge : créer une base **Render Postgres** et suivre « Passer à PostgreSQL ».

### Option B — Vercel
Vercel n'a pas de disque persistant : il faut **PostgreSQL** (Neon, Supabase ou Vercel Postgres) et un **stockage S3** pour les fichiers.
1. Passer à PostgreSQL (ci-dessous) et brancher S3 (`src/lib/storage.ts`).
2. Importer le dépôt dans Vercel, définir les variables d'environnement, *Build Command* : `npx prisma db push && npm run build`.
3. Domaine : ajouter `fomvue.com` et `*.fomvue.com` (wildcard) dans Vercel, puis `ROOT_DOMAIN=fomvue.com`.

### Passer à PostgreSQL
Dans `prisma/schema.prisma`, remplacer `provider = "sqlite"` par `provider = "postgresql"`, mettre `DATABASE_URL=postgresql://…`,
puis `npx prisma db push` (ou `npx prisma migrate dev --name init` pour des migrations versionnées) et `npm run db:seed`.

## Ce qu'il reste à faire / à fournir

**À fournir par Gina**
- **Compte marchand** PayDunya ou CinetPay (pièce d'identité ou documents d'entreprise : NINEA / RCCM au Sénégal) → clés API.
- **Nom de domaine** (`fomvue.com`) + DNS wildcard pour les sous-domaines de boutiques.
- **Hébergement** : compte Render (≈ 7 $/mois + disque) ou Vercel + Neon (offres gratuites pour démarrer) ; un bucket S3/R2 pour les fichiers.
- **Textes légaux** : CGU/CGV, politique de confidentialité (loi sénégalaise sur les données personnelles), règles de remboursement.
- Un **e-mail d'expédition** (Resend, Brevo…) pour les mails transactionnels.

**Développement restant (v2)**
- Envoi d'e-mails (confirmation d'achat, mot de passe oublié, vérification d'e-mail) — non inclus dans cette v1.
- Stockage S3 réel, hébergement vidéo dédié (Mux, Bunny Stream, Cloudflare Stream) avec protection des vidéos payantes
  (en v1 les vidéos sont des liens YouTube / MP4 : un lien YouTube public reste accessible hors du site).
- Décaissements automatiques (API payout de l'agrégateur), affiliation, réservation de créneaux de coaching, avis acheteurs vérifiés,
  assistant IA (rédaction de fiches, tuteur de cours), statistiques avancées, limitation de tentatives de connexion, journal d'audit admin.
- Migrations Prisma versionnées et sauvegardes automatiques de la base.

Toutes les données de démonstration (créateurs, produits, ventes, soutiens) sont **fictives** ; les vidéos de démo sont des extraits libres de droits (MDN CC0, *Big Buck Bunny* © Blender Foundation, CC BY).
