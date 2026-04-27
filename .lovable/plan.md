## Admin Dashboard — Page de gestion des rendez-vous

Création d'une page administrateur dédiée pour visualiser et filtrer les rendez-vous récupérés depuis l'API backend (`http://localhost:8000/appointments`).

### Route

- Nouvelle route : `/admin` (ajoutée dans `src/App.tsx` avant la route catch-all).
- avec authentification du docteur (email : [demo@gmail.com](mailto:demo@gmail.com) , password : demo123).

### Nouveau fichier : `src/pages/Admin.tsx`

**Contenu :**

- En-tête : titre « Tableau de bord — Rendez-vous », sous-titre, lien retour vers l'accueil.
- Barre de filtres (responsive, flex-wrap) :
  - Select urgence : « Tous », « Urgent », « Non urgent »
  - Date picker (shadcn `Calendar` + `Popover`) avec bouton « Réinitialiser »
  - Compteur de résultats à droite
- Tableau (composant shadcn `Table`) avec colonnes :
  - Patient | Téléphone | Motif | Urgence | Date | Heure
- Ligne « Urgent » : `Badge` rouge (variant `destructive`) ; sinon badge vert doux (`secondary`).
- États gérés : loading (skeletons), erreur (message + bouton réessayer), liste vide (message).
- Responsive : tableau scrollable horizontalement sur mobile (`overflow-x-auto`), filtres empilés en colonne < `md`.

### Récupération des données

```ts
const API_URL = "http://localhost:8000/appointments";
// fetch via useQuery (TanStack Query est déjà configuré dans App.tsx)
```

Format attendu (à confirmer côté backend, hypothèse raisonnable) :

```json
[
  {
    "id": "1",
    "patient_name": "Jean Dupont",
    "phone": "+213 555 12 34 56",
    "motif": "Consultation générale",
    "urgency": "urgent" | "non_urgent",
    "date": "2026-04-30",
    "time": "10:30"
  }
]
```

Le composant sera tolérant aux variantes de noms de champs (ex. `name` / `patient_name`) via un petit normalizer.

### Filtrage

- Filtres appliqués côté client sur la liste reçue (simple, pas de paramètres URL backend supposés).
- Filtre urgence : comparaison sur le champ `urgency`.
- Filtre date : comparaison sur la date `DD-MM-YYYY`.

### Navigation

- Ajout d'un petit lien discret « Admin » dans `src/components/Footer.tsx` pour accéder à `/admin` (puisqu'on ne veut pas polluer la navbar publique).

### Détails techniques

- Composants shadcn utilisés : `Table`, `Badge`, `Button`, `Select`, `Popover`, `Calendar`, `Skeleton`, `Card`.
- `date-fns` pour le formatage français (`format(date, "dd MMM yyyy", { locale: fr })`).
- `Calendar` avec `className="p-3 pointer-events-auto"`.
- Tous les textes en français.
- Couleurs du design system existant (primary bleu, secondary vert, destructive rouge) — aucune couleur en dur.

### Fichiers modifiés / créés

- **Créé** : `src/pages/Admin.tsx`
- **Modifié** : `src/App.tsx` (ajout route `/admin`)
- **Modifié** : `src/components/Footer.tsx` (lien discret « Espace admin »)

### Note CORS

Le backend FastAPI sur `localhost:8000` doit autoriser les requêtes CORS depuis l'origine du frontend (`localhost:8080`). Si erreur CORS dans la console, il faudra ajouter `CORSMiddleware` côté backend Python.