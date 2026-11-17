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

## Installation du module SQL

Le fichier [setup/install-platform-admin.sql](setup/install-platform-admin.sql)
regroupe les quatre migrations centrales dans une transaction unique. Il est
prévu pour le projet central `revanche-game-platform`, via SQL Editor. Il vérifie
les tables et colonnes requises avant toute modification, refuse une réinstallation
et enregistre les quatre versions lorsque l'historique standard Supabase existe.
Il ne crée aucun compte joueur ni mouvement de portefeuille.

Ce script installe les tables, fonctions, politiques et vérifications MFA. La liste
historique d'assistance est reprise avec le rôle assistance, sans droit financier.
Il n'attribue ni propriété ni nouveau compte administrateur ; la désignation du
premier compte constitue l'étape suivante. Les routes du serveur plateforme et les
adaptateurs natifs doivent toujours être déployés séparément pour leurs fonctions.

Vérifications locales du fichier complet : installation sur le schéma de test
existant, conservation des profils et du solde, reprise de l'assistance avec MFA,
enregistrement des versions, refus d'une réinstallation et annulation intégrale
si une colonne requise manque. Aucun SQL de ce fichier n'a été exécuté sur la
production par l'assistant.

### Identification des joueurs dans l’administration

Les listes, fiches, historiques et confirmations résolvent les identifiants des joueurs en pseudo et e-mail. Les achats conservent leur identifiant de transaction ; leur propriétaire est identifié séparément. Les formulaires ciblant un joueur proposent une recherche par pseudo, e-mail ou identifiant public, et exigent une sélection explicite avant confirmation.

Pour une nouvelle installation, exécuter `setup/install-platform-admin.sql`, puis `setup/admin-profile-identities.sql`. Cette mise à jour est déjà appliquée à la plateforme existante. Les e-mails restent dans Auth ; ils ne sont pas copiés dans les profils publics et aucune clé de service n’est ajoutée au panneau. L’API utilise le JWT de l’administrateur, des réponses privées sans cache et la fonction `admin_identity_lookup`, qui vérifie le rôle actif et le niveau MFA `aal2` à chaque appel.

La fonction utilise volontairement `SECURITY DEFINER` pour lire uniquement l’e-mail d’Auth et l’identité publique. L’[avertissement du conseiller Supabase](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) est attendu pour cette API contrôlée : l’exécution anonyme est révoquée et les utilisateurs ordinaires, administrateurs désactivés et sessions sans MFA sont refusés.

La rubrique Codes promotionnels liste les codes actifs. Les anciens codes déjà utilisés peuvent être désactivés sans supprimer l’historique des récompenses.

### Suivi joueur, alertes et disponibilité

Après les deux scripts d’installation précédents, appliquer `setup/admin-player-followup.sql` pour une installation neuve. La mise à jour est déjà installée sur la plateforme existante. La fiche joueur regroupe les achats, mouvements du portefeuille, signalements et tickets selon les permissions du membre. La recherche globale accepte pseudo ou e-mail. Les alertes internes sont actualisées toutes les 30 secondes et ne transmettent aucun e-mail.

Les salons montrent les profils liés à leur instance et la date de dernière vérification ; les anciennes entrées ne sont pas présentées comme des présences en direct. Le spectateur 10000 présente aussi les identifiants de profils vérifiés et distingue les invités, sans exposer de jeton de place.

La disponibilité des jeux est un contrôle HTTP ; pour 10000, l’ouverture du WebSocket est également vérifiée sans créer de joueur. Ce contrôle ne remplace pas une recette fonctionnelle du jeu. `admin_attention()` est une API `SECURITY DEFINER` volontairement [signalée par le conseiller](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), comme les autres RPC administrateurs : elle exige une adhésion active et la MFA, puis filtre chaque catégorie selon les permissions.

### Plusieurs captures pour les signalements

La plateforme peut joindre trois captures privées par signalement. La migration centrale `player_report_evidence` ajoute les métadonnées bornées et les politiques Storage nécessaires ; elle est déjà appliquée sur l’installation existante. Le dossier de signalement affiche un lien par capture. Le téléchargement utilise toujours la session du membre, son rôle de modération et la MFA, sans clé de service dans ce panneau. Les anciennes preuves restent accessibles via leur chemin historique.
