## Objectif

Remplacer le tableau actuel des rendez-vous par une **vue calendrier mensuelle** (style Google Agenda — vue "Mois") par défaut, avec :
- mise en évidence du jour courant
- aperçu des RDV directement dans chaque case du mois (badges/points)
- clic sur un jour → panneau latéral / section dessous listant les RDV de ce jour
- un bouton **"Tous les RDV"** en haut qui bascule vers le tableau actuel (conservé tel quel)

Les filtres (urgence, export CSV, actualiser) et les stats restent. Les fonctionnalités existantes (suppression, badges urgence, auth, etc.) sont préservées.

## Maquette

```text
┌─────────────────────────────────────────────────────────┐
│ [Stats cards]  [Stats charts]                           │
├─────────────────────────────────────────────────────────┤
│ Vue : ( ◉ Calendrier  ○ Tous les RDV )   [Exporter] [↻]│
├─────────────────────────────────────────────────────────┤
│  ◀  Mai 2026  ▶                          [Aujourd'hui] │
│  ┌───┬───┬───┬───┬───┬───┬───┐                         │
│  │L  │M  │M  │J  │V  │S  │D  │                         │
│  ├───┼───┼───┼───┼───┼───┼───┤                         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │                         │
│  │•• │   │ • │   │•••│   │   │  ← points = nb de RDV   │
│  ├───┼───┼───┼───┼───┼───┼───┤                         │
│  │...│TODAY│...                                        │
│  └───┴───┴───┴───┴───┴───┴───┘                         │
├─────────────────────────────────────────────────────────┤
│ RDV du 15 mai 2026 (3)                                  │
│  • 09:00 — Marie D. — Consultation [Urgent]      [🗑]  │
│  • 10:30 — Paul K.  — Suivi                       [🗑] │
│  • 14:00 — ...                                          │
└─────────────────────────────────────────────────────────┘
```

## Étapes

### 1. Nouveau composant `src/components/admin/AppointmentsCalendar.tsx`
- Reçoit en props : `appointments: Appointment[]`, `onDelete(id)`, `isDeleting`.
- Affiche un calendrier mensuel via le composant `Calendar` shadcn (`react-day-picker`) en `mode="single"`, `locale={fr}`, `showOutsideDays`.
- Construit une `Map<YYYY-MM-DD, Appointment[]>` à partir des RDV.
- Personnalise le rendu d'une cellule jour avec `components={{ DayContent }}` pour afficher :
  - le numéro du jour
  - de petits points colorés (rouge pour urgent, vert sinon), max 3, sinon `+N`
- Sélection du jour par défaut = aujourd'hui ; bouton "Aujourd'hui" qui réinitialise.
- Sous le calendrier : section listant les RDV du jour sélectionné triés par heure, avec heure, patient, motif, badge urgence, et bouton supprimer (réutilise `AlertDialog` comme dans le tableau actuel).
- État vide : "Aucun rendez-vous ce jour".

### 2. Modifier `src/pages/Admin.tsx`
- Ajouter un state `view: "calendar" | "table"`, valeur par défaut `"calendar"`.
- Remplacer la `Card` Filters actuelle par une barre simple :
  - **Toggle** (`Tabs` shadcn ou deux `Button` toggle) : "Calendrier" | "Tous les RDV"
  - À droite : boutons "Exporter CSV" et "Actualiser" (toujours visibles)
- Si `view === "calendar"` → afficher `<AppointmentsCalendar … />` (les filtres urgence/date du tableau ne s'appliquent pas ici, le calendrier gère sa propre sélection).
- Si `view === "table"` → afficher la `Card` de filtres (urgence + date) + le tableau actuel **inchangé**.
- L'export CSV exporte selon la vue active : tous les RDV en mode calendrier, ou les `filtered` en mode tableau.
- Conserver `deleteMutation` et le passer au calendrier.

### 3. Détails techniques
- Réutiliser `date-fns` (déjà présent) : `format`, `parseISO`, `isSameDay`, `startOfDay`.
- Agrandir un peu le `Calendar` (`className="p-4"` + cellules plus grandes) : surcharger `classNames.cell` et `classNames.day` pour passer de `h-9 w-9` à ~`h-20 w-full` afin d'avoir la place d'afficher les points. Fait localement dans `AppointmentsCalendar` via la prop `classNames`, sans toucher au composant `ui/calendar` global.
- Les couleurs (rouge urgence, vert non-urgent, bleu primary pour aujourd'hui) viennent des tokens existants (`destructive`, `secondary`, `primary`).
- Aucune modification backend.

## Fichiers touchés

- **Créé** : `src/components/admin/AppointmentsCalendar.tsx`
- **Modifié** : `src/pages/Admin.tsx` (ajout toggle vue, branchement calendrier, filtres déplacés sous l'onglet tableau)

## Hors scope

- Vues semaine/jour, drag-and-drop, édition d'un RDV, création depuis le calendrier.
- Modifications backend ou du chatbot/voicebot.