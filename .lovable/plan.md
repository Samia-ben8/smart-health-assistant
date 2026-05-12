# Connecter le SlotPicker au backend

## Problèmes identifiés

1. **Le Chatbot ne rend plus le SlotPicker** — `src/components/Chatbot.tsx` actuel n'importe pas `SlotPicker` et n'a aucune logique pour l'afficher. Le composant existe mais est orphelin.
2. **Le backend n'émet aucun signal pour déclencher le picker** — Dans `conversation_service.py` (en réalité `ai_service.py`), à l'étape `propose_slots`, le backend renvoie une liste numérotée en texte (`1. 09:00 …`) et attend un numéro à l'étape `waiting_slot`. Aucun champ `action: "pick_slot"` ni marqueur `[SLOT_PICKER]` n'est renvoyé.
3. `**waiting_slot` n'accepte qu'un index numérique** — il ne sait pas parser un JSON `{"date":"…","time":"…"}` envoyé par le picker.
4. `**/availability` fonctionne déjà** ✅ — pas de changement nécessaire côté endpoint, le SlotPicker l'appelle correctement.

## Changements proposés

### Backend (`backend/app/services/ai_service.py`)

- **Étape `propose_slots**` : au lieu de proposer 3 créneaux du jour en texte, passer directement à l'étape `waiting_slot` et renvoyer une réponse contenant le marqueur `[SLOT_PICKER]` que le frontend détectera. Exemple de retour :
  ```
  "Choisissez la date et l'heure de votre rendez-vous. [SLOT_PICKER]"
  ```
  (texte naturel généré + marqueur appended)
- **Étape `waiting_slot**` : avant le `int(message)` actuel, tenter de parser un JSON `{"date":"YYYY-MM-DD","time":"HH:MM"}`. Si présent :
  - Vérifier la dispo via `is_slot_available(date, time)`
  - Stocker dans `session["selected_slot"]`
  - Passer en `waiting_confirmation` et renvoyer le résumé pour confirmation
  - Garder le fallback numérique pour rétrocompatibilité
- **Format de réponse** : optionnel — enrichir `ChatResponse` (`backend/app/models/schemas.py` + `routes/chat.py`) pour renvoyer aussi `action: "pick_slot"` en plus du texte. Plus propre que le marqueur, mais le marqueur suffit si on veut éviter de toucher au schéma.

### Frontend (`src/components/Chatbot.tsx`)

- **Payload** : envoyer `{ message, session_id }` (déjà le cas, OK avec `ChatRequest`).
- **Importer `SlotPicker**` et étendre l'interface `Message` :
  ```ts
  interface Message {
    id; role; content;
    showSlotPicker?: boolean;
    slotPickerUsed?: boolean;
  }
  ```
- **Détection** : si `content.includes("[SLOT_PICKER]")` ou `data.action === "pick_slot"`, marquer le message avec `showSlotPicker: true` et nettoyer le marqueur du texte affiché.
- **Rendu** : sous la bulle assistant concernée, monter `<SlotPicker onSelect={(date, time) => …} disabled={msg.slotPickerUsed} />`.
- **Callback `onSelect**` : marquer le picker comme utilisé (verrouille les autres pickers passés), puis appeler `sendMessage` automatiquement avec `JSON.stringify({date, time})` comme contenu — afficher côté UI une bulle utilisateur lisible type "📅 27/04/2026 à 14:30".

### Flux résultant

```text
user: "oui je confirme mes infos"
bot:  "Voici les créneaux dispo : [SLOT_PICKER]"  ──► affiche calendrier + slots
user: clique 27/04 → 14:30
   ↳ POST /chat { message: '{"date":"2026-04-27","time":"14:30"}' }
bot:  "Je confirme RDV le 27/04 à 14:30, c'est bien ça ?"
user: "oui"
bot:  "Rendez-vous confirmé ✅ un mail est envoyé à votre boite mail"
```

## Détails techniques

- **CORS backend** : déjà configuré (`allow_origins=["*"]`), OK.
- **Session** : `SESSION_ID` est régénéré à chaque montage du composant React ⚠️ — à terme, le persister dans `localStorage` pour ne pas perdre le contexte serveur entre rechargements (hors scope minimal mais recommandé).
- **Marqueur vs `action**` : on commence par le marqueur `[SLOT_PICKER]` (zéro changement de schéma). Si vous préférez, on ajoute `action: Optional[str]` dans `ChatResponse` au passage.
- **Robustesse parse JSON** : dans `waiting_slot`, `try: payload = json.loads(message); date, time = payload["date"], payload["time"]` avant le fallback `int(message)`.
- **Pas de modification de `/availability**` ni de `db_service.is_slot_available`.

## Fichiers touchés

- `backend/app/services/ai_service.py` — branches `propose_slots` et `waiting_slot`
- `src/components/Chatbot.tsx` — URL, parsing réponse, rendu SlotPicker, envoi JSON
- (optionnel) `backend/app/models/schemas.py` + `backend/app/routes/chat.py` — ajouter `action`