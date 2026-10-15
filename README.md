# Site de Chrystelle Couedor — vitrine immobilière + administration

Ce dossier reprend les sections, textes, typographies et couleurs de la maquette HTML envoyée par le client (réalisée avec Claude), avec un catalogue immobilier dynamique, un dashboard responsive et une redirection vers les annonces originales de l'agence.

## Tester immédiatement avec VS Code (Windows)

1. Ouvrez ce dossier dans **Visual Studio Code** (Fichier > Ouvrir un dossier).
2. Installez l'extension **Live Server** si ce n'est pas déjà fait.
3. Faites un clic droit sur `index.html` > **Open with Live Server**.
4. Le site ouvre `http://127.0.0.1:5500/index.html` (le port peut varier).
5. Pour accéder au dashboard : `http://127.0.0.1:5500/admin.html`.

**Aucun Python, Node.js, npm ni mot de passe n'est requis pour essayer la démo.**

## Comment publier un bien (mode démo)

1. Ouvrez `admin.html`, cliquez sur **Ajouter un bien**.
2. Renseignez le titre, la ville, le prix et les caractéristiques.
3. Importez des photos (max. 12, chacune redimensionnée et compressée dans le navigateur).
4. Copiez l'**URL exacte de l'annonce officielle** depuis le site de l'agence, par exemple `https://agence.example/annonce/...`.
5. Laissez le statut « Brouillon » pour garder l'annonce privée, ou sélectionnez « Publié » pour la rendre visible.
6. Cliquez sur « Enregistrer le bien », puis ouvrez la page publique (actualiser si nécessaire).
7. Cliquez sur l'image ou le bouton « Voir l'annonce sur le site de l'agence ↗ » : l'annonce officielle s'ouvre dans un nouvel onglet.

Statuts disponibles :
- **Brouillon** : masqué du site public.
- **Publié** : visible et cliquable.
- **Sous compromis** : visible avec badge.
- **Vendu** : visible avec badge.
- **Loué** : visible avec badge.
- **Archivé** : masqué du site public.

La publication est bloquée tant qu'une URL HTTP(S) officielle n'est pas indiquée. Les liens `javascript:` et autres schémas risqués sont refusés.

**IMPORTANT : en mode démo les biens sont conservés dans le `localStorage` du navigateur.** Ils sont disponibles sur la page admin et publique du même navigateur/même adresse locale, mais pas sur d'autres appareils. Le stockage peut être effacé en nettoyant les données du navigateur. Les photos nombreuses peuvent dépasser le quota local. Dans le dashboard, « Exporter une sauvegarde JSON » permet de garder une copie des annonces localement ; « Importer » réintègre les annonces.

**Ne déployez pas le mode démo sur Internet : la page admin n'a pas d'authentification dans ce mode.**

## Configurer le vrai mode en ligne (Supabase)

Le mode en ligne permet de partager les annonces entre appareils, d'ajouter des images sur un serveur et de protéger les modifications par une connexion. La base de données applique des règles de sécurité (RLS).

1. Créez un projet sur `https://supabase.com`.
2. Dans **Authentication > Users**, créez le compte e-mail / mot de passe fort de Chrystelle. Si le projet active la confirmation e-mail, validez l'adresse.
3. Dans **SQL Editor**, exécutez intégralement `supabase/schema.sql` (dans un nouveau projet, ou en vérifiant les conflits avec vos tables préexistantes).
4. Copiez l'**UID exact** de ce compte dans `Authentication > Users` puis lancez, dans SQL Editor :
   ```sql
   insert into public.site_admins(user_id)
   values ('REMPLACEZ-PAR-LE-UUID-EXACT');
   ```
5. Dans **Project Settings > API**, copiez l'URL du projet et la clé **anon / publishable** du projet.
6. Ouvrez `assets/js/config.js` et renseignez `supabaseUrl` et `supabaseAnonKey`. N'utilisez **JAMAIS la clé secret/service_role** dans ce fichier côté client.
7. Déployez le dossier en hébergement statique (Cloudflare Pages, Netlify, Vercel, OVH, etc.) avec HTTPS. Gardez les chemins et dossiers inchangés.
8. Vérifiez sur l'URL publique : admin connecté, création d'un bien, publication, lecture publique depuis un navigateur privé, suppression, et interdiction de modifier le contenu sans connexion.

En mode connecté, l'administration vous demande un e-mail/mot de passe. La base n'autorise la lecture des brouillons, la modification et l'upload de photos que si votre utilisateur figure dans `site_admins`. Un visiteur anonyme ne peut lire que les biens visibles et liés à une URL. Les images sont publiques une fois téléversées : **n'importez pas de photos confidentielles**. Il est recommandé de ne téléverser que les photos validées par l'agence.

### Limites / maintenance

- Il n'y a **pas de synchronisation automatique** avec le site de l'agence : prix, photos, statuts et liens doivent être mis à jour manuellement dans le dashboard.
- L'upload des photos Supabase a lieu au moment de l'ajout dans le formulaire. Si vous quittez le formulaire sans enregistrer, certaines photos peuvent rester inutilisées dans le stockage ; nettoyez-les via Supabase Storage si nécessaire.
- Le bouton « Supprimer un bien » supprime son annonce de la base mais ne supprime pas automatiquement ses fichiers photo du bucket.
- Les pages légales et la gestion des demandes nécessitent encore la validation des informations de Chrystelle / du réseau. Le formulaire d'estimation utilise un lien `mailto` et **ne sauvegarde pas les données dans une base**.
- Certaines extensions de navigateur ou bloqueurs peuvent empêcher le chargement de Supabase depuis CDN ; il faudra alors servir la bibliothèque depuis un build local ou un hébergement adapté.

## Personnaliser avant la mise en ligne

### Coordonnées

Dans `assets/js/config.js`, renseignez :

```js
contactEmail: 'adresse-reelle@exemple.fr',
contactPhone: '+33612345678',
displayPhone: '06 12 34 56 78',
```

Quand les coordonnées ne sont pas renseignées, le site affiche clairement qu'elles restent à compléter. L'estimation par e-mail reste alors désactivée.

### Portrait, textes, avis, mentions

Dans `index.html` :
- Remplacer les 2 blocs « Portrait de Chrystelle » / « Photo de Chrystelle » par ses photos autorisées.
- Remplacer les avis fictifs `[Avis client à insérer]` par des avis authentiques, avec autorisation si nécessaire.
- Renseigner les données RSAC, assurance, médiation, mentions légales et barème d'honoraires, ainsi que les chiffres de quartier actuellement notés `[À compléter]`.
- Ajouter les vraies mentions légales et la politique de confidentialité (les liens du pied de page sont encore des emplacements provisoires).
- Faire valider la conformité du site par l'agence/réseau iad, notamment concernant l'usage du logo/nom, les caractéristiques des annonces, les honoraires et l'affichage des diagnostics.
- Vérifier que Chrystelle dispose du droit de réutiliser les photos et textes des annonces officielles.

### Design

- `assets/css/site.css` : style responsive du site public ; les sections originales conservent leurs styles de la maquette Claude.
- `assets/css/admin.css` : style du dashboard.
- `index.html` : contenus et sections du site.
- `admin.html` : formulaire de gestion.

## Arborescence

```
chrystelle-couedor-site/
├── index.html              Site public basé sur le design de Claude
├── admin.html              Tableau de bord
├── assets/
│   ├── css/
│   │   ├── site.css
│   │   └── admin.css
│   └── js/
│       ├── config.js       Coordonnées + configuration Supabase
│       ├── store.js        Enregistrement local / Supabase
│       ├── public.js       Affichage des annonces + redirections
│       └── admin.js        Dashboard et CRUD
├── supabase/
│   └── schema.sql          Base et permissions (RLS)
└── README.md
```

## Vérifications réalisées sur cette livraison

La version de démonstration a été testée avec un navigateur automatisé : création d'une annonce avec photo, enregistrement en brouillon, invisibilité du brouillon sur le site public, publication après saisie d'une URL officielle, vérification du lien sortant et suppression de l'annonce. Les interfaces ont été contrôlées aux largeurs 390 px, 768 px et 1024 px, sans débordement horizontal. Ces essais ne remplacent pas une recette en environnement Supabase après configuration des accès réels.

**Attention :** la page administrateur ne doit pas être rendue publique tant que vous êtes en mode démonstration locale. Héberger directement les fichiers sans configurer Supabase rendrait l'espace admin accessible à tous les visiteurs, même si les données locales ne sont pas synchronisées entre leurs navigateurs.
