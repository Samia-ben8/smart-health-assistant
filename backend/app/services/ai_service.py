from openai import OpenAI
from app.core.config import OPENAI_API_KEY
import json
import re
from datetime import datetime, timedelta

from app.services.conversation_service import (
    generate_natural_response,
    detect_user_intent,
)
from app.services.db_service import (
    get_or_create_patient,
    create_or_update_appointment,
    is_slot_available,
    patients_collection,
    appointments_collection,
)
from app.services.email_service import send_email

client = OpenAI(api_key=OPENAI_API_KEY)

# 🧠 mémoire des sessions
sessions = {}

WORK_START = "09:00"
WORK_END = "17:30"
EMAIL_CONFIRM_SUFFIX = " Un email de confirmation vous a été envoyé à votre adresse email."


# ---------------- VALIDATIONS ---------------- #

def is_valid_phone(phone: str) -> bool:
    phone = phone.replace(" ", "")
    pattern = r"^(\+212[67]\d{8}|0[67]\d{8})$"
    return re.match(pattern, phone) is not None


def is_valid_email(email: str) -> bool:
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return bool(re.match(pattern, email))


def is_valid_name(name: str) -> bool:
    return len(name.strip()) > 2 and not any(c.isdigit() for c in name)


def is_within_hours(t: str) -> bool:
    try:
        return WORK_START <= t <= WORK_END
    except Exception:
        return False


def is_future_date(date_str: str) -> bool:
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        return d >= datetime.now().date()
    except Exception:
        return False


# ---------------- IA EXTRACTIONS ---------------- #

def extract_info(message: str):
    prompt = f"""
Tu es un extracteur d'informations médicales.
Extrais uniquement les informations présentes dans ce message :
"{message}"

Retourne UNIQUEMENT un JSON valide avec :
- name
- phone
- email
- motif
- urgence

Règles :
- urgence = true ou false (null si non mentionné)
- si une donnée est absente → null
- aucune explication
"""
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "Tu extrais des données structurées."},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )
    content = response.choices[0].message.content.strip()
    content = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(content)
    except Exception:
        return {}


def extract_datetime(message: str):
    """Voice mode: parse expressions naturelles (ex: 'le 19 mai vers 13h', 'demain à 10h30')."""
    today = datetime.now().strftime("%Y-%m-%d")
    prompt = f"""
Aujourd'hui = {today}.
Extrait une date et une heure depuis ce message en français :
"{message}"

Retourne UNIQUEMENT un JSON :
{{"date": "YYYY-MM-DD" ou null, "time": "HH:MM" ou null}}

Règles :
- "demain" = lendemain de {today}
- "lundi prochain", "mardi prochain"... = prochaine occurrence du jour
- heures : "13h" -> "13:00", "13h30" -> "13:30", "1h de l'après-midi" -> "13:00"
- si l'info est absente → null
- aucune explication
"""
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "Tu extrais des dates/heures."},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
    )
    content = response.choices[0].message.content.strip()
    content = content.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(content)
    except Exception:
        return {"date": None, "time": None}


def extract_phone(message: str):
    """Extrait un numéro depuis une transcription vocale ou texte."""
    digits = re.sub(r"\D", "", message)
    # priorité aux formats marocains
    for candidate in [digits, "0" + digits[-9:] if len(digits) >= 9 else ""]:
        if is_valid_phone(candidate):
            return candidate
    return None


# ---------------- EMAIL SPELLING (voice) ---------------- #

SPELL_MAP = {
    "arobase": "@", "at": "@", "aroba": "@",
    "point": ".", "dot": ".",
    "tiret": "-", "moins": "-", "trait": "-", "trait d'union": "-",
    "underscore": "_", "souligne": "_", "tiret bas": "_",
    "espace": "",
    "zero": "0", "zéro": "0",
    "un": "1", "une": "1",
    "deux": "2", "trois": "3", "quatre": "4", "cinq": "5",
    "six": "6", "sept": "7", "huit": "8", "neuf": "9",
}


def spelled_to_email(transcript: str) -> str:
    t = transcript.lower().strip()
    # remplacer mots-clés par symboles
    # trier par longueur décroissante pour matcher "trait d'union" avant "trait"
    for word in sorted(SPELL_MAP.keys(), key=len, reverse=True):
        t = re.sub(rf"\b{re.escape(word)}\b", f" {SPELL_MAP[word]} ", t)
    # garder uniquement chars valides
    cleaned = "".join(c for c in t if c.isalnum() or c in "@._-")
    return cleaned


def spell_out_email(email: str) -> str:
    """Convertit un email en lecture caractère par caractère."""
    parts = []
    for c in email:
        if c == "@":
            parts.append("arobase")
        elif c == ".":
            parts.append("point")
        elif c == "-":
            parts.append("tiret")
        elif c == "_":
            parts.append("underscore")
        else:
            parts.append(c)
    return ", ".join(parts)


# ---------------- INTENT ---------------- #

def detect_create_or_update(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["modif", "changer", "déplac", "deplac", "reporter", "annul", "existant"]):
        return "update"
    if any(w in msg for w in ["nouveau", "nouvelle", "créer", "creer", "prendre", "réserver", "reserver", "rdv"]):
        return "create"
    # fallback IA
    try:
        prompt = f'Message: "{message}"\nRéponds par "create" si l\'utilisateur veut un nouveau rendez-vous, ou "update" s\'il veut modifier un rendez-vous existant. Réponds uniquement par "create" ou "update".'
        r = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        out = r.choices[0].message.content.strip().lower()
        return "update" if "update" in out else "create"
    except Exception:
        return "create"


# ---------------- SESSION INIT ---------------- #

def _new_session(channel: str):
    return {
        "channel": channel,
        "data": {
            "name": None,
            "phone": None,
            "email": None,
            "motif": None,
            "urgence": None,
        },
        "step": "intent_choice",
        "intent": None,
        "selected_slot": None,
        "slots": [],
        "pending_email": None,
        "update_appointment_id": None,
    }


# ---------------- MAIN ---------------- #

def generate_response(message: str, session_id: str, channel: str = "chat"):

    if session_id not in sessions:
        sessions[session_id] = _new_session(channel)

    session = sessions[session_id]
    session["channel"] = channel  # met à jour si change
    data = session["data"]
    step = session["step"]
    is_voice = channel == "voice"

    # ============================================================
    # STEP : INTENT_CHOICE — nouveau ou modification ?
    # ============================================================
    if step == "intent_choice":
        intent = detect_create_or_update(message)
        session["intent"] = intent

        if intent == "update":
            session["step"] = "update_ask_phone"
            return generate_natural_response(
                message, data,
                "demander le numéro de téléphone associé au rendez-vous existant"
            )
        else:
            session["step"] = "collecting"
            return generate_natural_response(
                message, data,
                "remercier puis demander le nom complet pour créer un nouveau rendez-vous"
            )

    # ============================================================
    # FLOW : UPDATE — rendez-vous existant
    # ============================================================
    if step == "update_ask_phone":
        phone = extract_phone(message) or message.strip().replace(" ", "")
        if not is_valid_phone(phone):
            return generate_natural_response(
                message, data,
                "numéro de téléphone invalide, redemander"
            )
        # chercher patient + rdv
        patient = patients_collection.find_one({"phone": phone})
        if not patient:
            return generate_natural_response(
                message, data,
                f"aucun rendez-vous trouvé pour le numéro {phone}, demander si l'utilisateur veut créer un nouveau rendez-vous"
            )
        appt = appointments_collection.find_one({"patient_id": patient["_id"]})
        if not appt:
            return generate_natural_response(
                message, data,
                f"aucun rendez-vous trouvé pour ce patient, demander confirmation"
            )

        data["name"] = patient.get("name")
        data["phone"] = patient.get("phone")
        data["email"] = patient.get("email")
        data["motif"] = appt.get("motif")
        data["urgence"] = appt.get("urgence")
        session["update_appointment_id"] = str(appt["_id"])
        session["step"] = "update_choose_slot" if is_voice else "update_pick_slot"

        ctx = f"rendez-vous trouvé pour {patient.get('name')} le {appt.get('date')} à {appt.get('time')}"

        if is_voice:
            return generate_natural_response(
                message, data,
                f"{ctx}. Demander à l'utilisateur la nouvelle date et heure souhaitée"
            )
        else:
            session["step"] = "update_pick_slot"
            return generate_natural_response(
                message, data,
                f"{ctx}. Inviter l'utilisateur à choisir un nouveau créneau dans le calendrier"
            ) + " [SLOT_PICKER]"

    if step == "update_pick_slot":
        # chat mode : parse JSON SlotPicker
        try:
            payload = json.loads(message)
            if isinstance(payload, dict) and payload.get("date") and payload.get("time"):
                if not is_slot_available(payload["date"], payload["time"]):
                    return generate_natural_response(
                        message, data,
                        "créneau déjà pris, demander un autre choix"
                    ) + " [SLOT_PICKER]"
                session["selected_slot"] = {"date": payload["date"], "time": payload["time"]}
                session["step"] = "waiting_confirmation"
                return generate_natural_response(
                    message,
                    {**data, "date": payload["date"], "time": payload["time"]},
                    f"confirmer le déplacement du rendez-vous au {payload['date']} à {payload['time']}"
                )
        except Exception:
            pass
        return generate_natural_response(
            message, data,
            "choix créneau invalide, demander de re-sélectionner dans le calendrier"
        ) + " [SLOT_PICKER]"

    if step == "update_choose_slot":
        # voice mode : parse natural language
        return _handle_voice_slot(message, session, data)

    # ============================================================
    # FLOW : CREATE — collecte d'infos
    # ============================================================

    # --- STEP : EMAIL SPELL (voice) ---
    if step == "voice_email_spell":
        candidate = spelled_to_email(message)
        if not is_valid_email(candidate):
            return generate_natural_response(
                message, data,
                "email invalide, redemander d'épeler lettre par lettre, en disant arobase pour @ et point pour ."
            )
        session["pending_email"] = candidate
        session["step"] = "voice_email_confirm"
        spelled = spell_out_email(candidate)
        return f"J'ai compris : {spelled}. Est-ce correct ?"

    if step == "voice_email_confirm":
        intent = detect_user_intent(message)
        if intent == "confirm":
            data["email"] = session["pending_email"]
            session["pending_email"] = None
            session["step"] = "collecting"
            # continuer la collecte
            return _continue_collecting(message, session, data, is_voice)
        elif intent in ["deny", "modify"]:
            session["step"] = "voice_email_spell"
            session["pending_email"] = None
            return generate_natural_response(
                message, data,
                "email incorrect, redemander d'épeler à nouveau lettre par lettre"
            )
        else:
            return generate_natural_response(
                message, data,
                "demander oui ou non pour confirmer l'email"
            )

    # --- STEP : RESUME ---
    if step == "resume":
        intent = detect_user_intent(message)
        if intent == "confirm":
            session["step"] = "propose_slots"
            # tomber dans propose_slots ci-dessous
            step = "propose_slots"
        elif intent in ["deny", "modify"]:
            # extraire correction et rester collecting
            session["step"] = "collecting"
            extracted = extract_info(message)
            for key in data:
                if extracted.get(key) is not None:
                    data[key] = extracted[key]
            return _continue_collecting(message, session, data, is_voice)
        else:
            return generate_natural_response(
                message, data,
                "demander oui ou non pour confirmer le résumé des informations"
            )

    # --- STEP : WAITING_SLOT ---
    if step == "waiting_slot":
        if is_voice:
            return _handle_voice_slot(message, session, data)
        # chat : SlotPicker JSON
        try:
            payload = json.loads(message)
            if isinstance(payload, dict) and payload.get("date") and payload.get("time"):
                if not is_slot_available(payload["date"], payload["time"]):
                    return generate_natural_response(
                        message, data,
                        "créneau déjà pris, demander un autre choix"
                    ) + " [SLOT_PICKER]"
                session["selected_slot"] = {"date": payload["date"], "time": payload["time"]}
                session["step"] = "waiting_confirmation"
                return generate_natural_response(
                    message,
                    {**data, "date": payload["date"], "time": payload["time"]},
                    f"confirmer rendez-vous : date={payload['date']} heure={payload['time']}"
                )
        except Exception:
            pass
        return generate_natural_response(
            message, data,
            "choix créneau invalide, demander de re-sélectionner"
        ) + " [SLOT_PICKER]"

    # --- STEP : WAITING_CONFIRMATION ---
    if step == "waiting_confirmation":
        intent = detect_user_intent(message)

        if intent == "confirm":
            selected = session["selected_slot"]
            patient_id = get_or_create_patient(data)
            appointment = create_or_update_appointment(patient_id, {
                **data,
                "date": selected["date"],
                "time": selected["time"],
            })
            try:
                send_email(data["email"], data, selected["date"], selected["time"])
            except Exception:
                pass
            sessions.pop(session_id, None)
            base = generate_natural_response(
                message,
                {**data, "date": selected["date"], "time": selected["time"]},
                f"rendez-vous confirmé pour le {selected['date']} à {selected['time']}"
            )
            return base + EMAIL_CONFIRM_SUFFIX

        elif intent in ["deny", "modify"]:
            session["step"] = "collecting"
            session["selected_slot"] = None
            return generate_natural_response(
                message, data,
                "modifier informations rendez-vous, redemander ce qui doit changer"
            )
        else:
            return generate_natural_response(
                message, data,
                "demander confirmation oui ou non"
            )

    # --- STEP : COLLECTING (default) ---
    if step == "collecting":
        # extraction multi-champs (chat) — en voice on évite pour ne pas
        # confondre l'épellation
        if not is_voice:
            extracted = extract_info(message)
            for key in data:
                if extracted.get(key) is not None:
                    data[key] = extracted[key]
        else:
            # voice : extraction simple selon ce qu'on attend
            _voice_collect_field(message, data)

        return _continue_collecting(message, session, data, is_voice)

    # --- STEP : PROPOSE_SLOTS ---
    if step == "propose_slots":
        session["step"] = "waiting_slot"
        if is_voice:
            return generate_natural_response(
                message, data,
                "demander à l'utilisateur quelle date et heure il souhaite pour son rendez-vous"
            )
        else:
            intro = generate_natural_response(
                message, data,
                "inviter l'utilisateur à choisir une date et un créneau dans le calendrier"
            )
            return intro + " [SLOT_PICKER]"

    # ---------------- FALLBACK ---------------- #
    return generate_natural_response(message, data, "message incompris, reformuler poliment")


# ---------------- HELPERS ---------------- #

def _voice_collect_field(message: str, data: dict):
    """En voice, remplit le PROCHAIN champ manquant (sauf email géré séparément)."""
    msg = message.strip()
    if not data["name"]:
        if is_valid_name(msg):
            data["name"] = msg
        return
    if not data["phone"]:
        p = extract_phone(msg)
        if p and is_valid_phone(p):
            data["phone"] = p
        return
    # email géré via voice_email_spell
    if not data["motif"]:
        if len(msg) > 2:
            data["motif"] = msg
        return
    if data["urgence"] is None:
        low = msg.lower()
        if any(w in low for w in ["oui", "urgent", "urgence"]):
            data["urgence"] = True
        elif any(w in low for w in ["non", "pas urgent"]):
            data["urgence"] = False
        return


def _continue_collecting(message: str, session: dict, data: dict, is_voice: bool):
    """Demande le prochain champ manquant ou passe au résumé."""
    if not data["name"] or not is_valid_name(data["name"] or ""):
        if data["name"] and not is_valid_name(data["name"]):
            data["name"] = None
            return generate_natural_response(message, data, "nom invalide, redemander le nom complet")
        return generate_natural_response(message, data, "demander le nom complet")

    if not data["phone"] or not is_valid_phone(data["phone"] or ""):
        if data["phone"] and not is_valid_phone(data["phone"]):
            data["phone"] = None
            return generate_natural_response(message, data, "numéro de téléphone invalide, redemander")
        return generate_natural_response(message, data, "demander le numéro de téléphone")

    if not data["email"]:
        if is_voice:
            session["step"] = "voice_email_spell"
            return ("Veuillez épeler votre adresse email lettre par lettre. "
                    "Dites 'arobase' pour @ et 'point' pour le point.")
        return generate_natural_response(message, data, "demander l'adresse email")

    if not is_valid_email(data["email"]):
        if is_voice:
            data["email"] = None
            session["step"] = "voice_email_spell"
            return "L'email n'est pas valide. Veuillez l'épeler à nouveau lettre par lettre."
        data["email"] = None
        return generate_natural_response(message, data, "email invalide, redemander")

    if not data["motif"]:
        return generate_natural_response(message, data, "demander le motif de la consultation")

    if data["urgence"] is None:
        return generate_natural_response(message, data, "demander si c'est urgent (oui ou non)")

    # tout collecté → résumé
    session["step"] = "resume"
    return generate_natural_response(
        message, data,
        f"résumé complet : nom={data['name']}, téléphone={data['phone']}, "
        f"email={data['email']}, motif={data['motif']}, "
        f"urgence={'oui' if data['urgence'] else 'non'}. Demander confirmation oui ou non."
    )


def _handle_voice_slot(message: str, session: dict, data: dict):
    """Parse une expression naturelle de date/heure et valide."""
    parsed = extract_datetime(message)
    date = parsed.get("date")
    time = parsed.get("time")

    if not date or not time:
        return generate_natural_response(
            message, data,
            "date ou heure manquante, redemander la date et l'heure souhaitées"
        )

    # validation date future
    if not is_future_date(date):
        tomorrow = (datetime.now().date() + timedelta(days=1)).strftime("%Y-%m-%d")
        return generate_natural_response(
            message, data,
            f"cette date est passée, demander une date à partir du {tomorrow}"
        )

    # validation heures de travail
    if not is_within_hours(time):
        return generate_natural_response(
            message, data,
            f"hors des heures de travail ({WORK_START}-{WORK_END}), demander un créneau entre 9h et 17h30"
        )

    # validation disponibilité
    if not is_slot_available(date, time):
        return generate_natural_response(
            message, data,
            "ce créneau est déjà réservé par un autre patient, demander un autre créneau"
        )

    session["selected_slot"] = {"date": date, "time": time}
    session["step"] = "waiting_confirmation"
    return generate_natural_response(
        message,
        {**data, "date": date, "time": time},
        f"confirmer le rendez-vous pour le {date} à {time}, demander oui ou non"
    )
