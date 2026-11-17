# Administration Revanche Games

Application administrateur indépendante, extraite du panneau préparé dans
`revanchegames` (commit `2ae85c9`). Ce dépôt est la source du service Railway
`revanche-admin`. Il ne crée ni base joueur ni comptes en double.

## Comment les deux applications sont reliées

| Liaison | Configuration | Protection |
|---|---|---|
| Comptes et données communes | Même `NEXT_PUBLIC_SUPABASE_URL` et clé publique que Revanche Games | RPC SQL vérifiant le rôle courant, le compte confirmé et MFA |
| Paiements et spectateur | `ADMIN_PLATFORM_ORIGIN` désigne le serveur existant | JWT de l'administrateur revérifié côté plateforme |
| Site administrateur | `ADMIN_SITE_URL` désigne son origine publique exacte | Contrôle d'origine pour chaque mutation |

Les deux dépôts n'ont pas besoin de s'importer ni d'être fusionnés. Les clés
service-role Supabase, Stripe et des jeux restent sur le serveur de la plateforme.
Le nouveau dépôt et son service n'en ont pas besoin.

La plateforme doit disposer des routes `/api/admin/reconcile` et
`/api/admin/observer`, préparées dans cette PR :
https://github.com/falmonmickael260-commits/revanchegames/pull/7.

Les migrations centrales et des jeux restent dans leurs dépôts respectifs.
Le bilan détaillé et les liens vers les sept adaptateurs se trouvent dans
`docs/ADMINISTRATION.md` de cette PR. Aucune migration n'est appliquée
automatiquement pendant le build ou le démarrage.

## Développement

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Compléter les deux variables publiques Supabase avec celles de la plateforme.
En local : `ADMIN_SITE_URL=http://localhost:3001`.
Le serveur existant est configuré via `ADMIN_PLATFORM_ORIGIN`.

## Déploiement Railway

Utiliser ce dépôt sur la branche `main`, avec la racine du dépôt comme contexte.
Build : `npm run build`. Démarrage : `npm start -- --port $PORT`.
Le port configuré du service est `8080`. Vérification HTTP : `/`.

Les variables publiques Supabase du service peuvent référencer celles du service
existant `revanchegames` dans le même projet Railway. Le domaine provisoire est
`https://revanche-admin-production.up.railway.app/`. Le domaine personnalisé
pourra être ajouté ultérieurement.

## État réel

L'écran de connexion peut être déployé sans activer les fonctionnalités de
production. Les migrations Supabase, le premier propriétaire et la recette
avec de vrais comptes restent à configurer. Les pseudos seront fournis plus tard.
La fermeture/exclusion native des salons et la propagation des sanctions à tous
les serveurs de jeu ne sont pas terminées. Aucun chiffre fictif ne remplace les
données manquantes.

## Vérifications

```sh
npm test
npm run lint
npm run build
npm run typecheck
```

Les tests complets de l'intégration SQL, des permissions et de l'économie restent
dans le dépôt plateforme ; ils ne sont pas remplacés par les tests de ce dépôt.
