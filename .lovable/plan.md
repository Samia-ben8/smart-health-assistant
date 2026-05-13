## Objectif

Transformer la page `/admin` en un véritable tableau de bord médical avec statistiques visuelles, export CSV et gestion CRUD (annuler / supprimer un rendez-vous).

---

## 1. Backend — nouveaux endpoints

### `backend/app/routes/appointments.py`

Ajouter l'`id` du RDV dans la réponse de `GET /appointments` (actuellement absent — bloque toute action ciblée) :
```python
"id": str(appt["_id"]),
```

Ajouter deux nouveaux endpoints :

- **`DELETE /appointments/{appointment_id}`** → supprime un RDV (annulation définitive). Retourne `{ "deleted": true }`.
- **`GET /appointments/stats`** → renvoie un objet d'agrégats pour les graphiques :
  ```json
  {
    "total": 42,
    "urgent": 8,
    "non_urgent": 34,
    "today": 5,
    "this_week": 18,
    "by_day": [{ "date": "2026-05-12", "count": 3 }, ...],   // 14 derniers jours
    "by_motif": [{ "motif": "consultation", "count": 12 }, ...] // top 5
  }
  ```

Logique d'agrégation faite directement en Python à partir de `appointments_collection.find()` (volume faible, pas besoin de pipeline Mongo complexe).

---

## 2. Frontend — `src/pages/Admin.tsx`

### a) Bandeau de statistiques (en haut, sous le header)

4 cartes synthétiques côte à côte :
- **Total RDV** (icône Calendar)
- **Aujourd'hui** (icône Clock)
- **Cette semaine** (icône CalendarDays)
- **Urgents** (icône AlertCircle, accent rouge)

### b) Section Graphiques (sous le bandeau)

Deux graphiques avec `recharts` (déjà installé via shadcn/ui) :
- **Bar chart** : RDV par jour sur 14 jours
- **Pie chart** : Urgent vs Non urgent

Layout responsive `grid md:grid-cols-2 gap-4`.

### c) Action "Annuler" sur chaque ligne du tableau

Ajouter une colonne **Actions** avec un bouton icône `Trash2` (variant ghost, rouge). Au clic :
- Ouvre un `AlertDialog` shadcn de confirmation ("Annuler ce rendez-vous ?")
- Si confirmé → `DELETE /appointments/{id}` puis toast succès + `refetch()` (React Query)

### d) Bouton "Exporter CSV"

Dans la barre de filtres, à côté de "Actualiser" :
- Bouton `Download` qui exporte les RDV **filtrés** (respecte les filtres actifs)
- Génération CSV côté client (pas besoin d'endpoint), nom du fichier : `rendez-vous-YYYY-MM-DD.csv`
- Colonnes : Patient, Téléphone, Motif, Urgence, Date, Heure

---

## 3. Détails techniques

- **React Query** : nouvelle query `["appointments-stats"]` pour les stats, mutation `useMutation` pour le DELETE avec invalidation auto des caches `appointments` et `appointments-stats`.
- **Recharts** : utiliser les composants `<ChartContainer>` de `src/components/ui/chart.tsx` pour rester dans le design system (couleurs `--primary`, `--secondary`, `--destructive`).
- **CSV** : helper local `exportToCsv(rows, filename)` — `Blob` + `URL.createObjectURL` + lien téléchargement.
- **Normalize** : étendre le `normalize()` existant pour inclure `id` retourné par le backend.
- **Aucun changement** sur le chatbot, `SlotPicker`, ou le flux de réservation.

---

## 4. Fichiers touchés

**Backend**
- `backend/app/routes/appointments.py` — ajout `id` + endpoints `DELETE` et `/stats`

**Frontend**
- `src/pages/Admin.tsx` — bandeau stats, graphiques, bouton annuler, export CSV
- (éventuel) `src/components/admin/StatsCards.tsx` + `StatsCharts.tsx` pour garder `Admin.tsx` lisible

---

## 5. Hors scope (suggestions futures)

- Édition d'un RDV (reprogrammer date/heure)
- Filtre par motif / recherche par nom patient
- Pagination si > 50 RDV
