from openai import OpenAI
from app.core.config import OPENAI_API_KEY
import json
import re

from app.services.conversation_service import generate_natural_response

from app.services.db_service import (
    get_or_create_patient,
    create_or_update_appointment,
    get_available_slots
)

from app.services.email_service import send_email
from app.services.conversation_service import detect_user_intent

client = OpenAI(api_key=OPENAI_API_KEY)

# 🧠 mémoire des sessions
sessions = {}


# ---------------- VALIDATIONS ---------------- #

def is_valid_phone(phone: str) -> bool:
    phone = phone.replace(" ", "")

    # ✅ Maroc uniquement :
    # +2126XXXXXXXX
    # +2127XXXXXXXX
    # 06XXXXXXXX
    # 07XXXXXXXX

    pattern = r"^(\+212[67]\d{8}|0[67]\d{8})$"

    return re.match(pattern, phone) is not None


def is_valid_email(email: str) -> bool:
    pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return re.match(pattern, email) is not None


def is_valid_name(name: str) -> bool:
    return len(name.strip()) > 2 and not any(char.isdigit() for char in name)


# ---------------- IA EXTRACTION ---------------- #

def extract_info(message: str):

    prompt = f"""
Tu es un extracteur d'informations médicales.

Extrais uniquement les informations présentes dans ce message :

"{message}"

Retourne uniquement un JSON valide avec :

- name
- phone
- email
- motif
- urgence

Règles :
- urgence = true ou false
- si une donnée est absente → null
- aucune explication
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "Tu extrais des données structurées."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content.strip()

    content = (
        content
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    try:
        return json.loads(content)

    except:
        return {}


# ---------------- INTENT ---------------- #

def detect_intent(message: str):

    msg = message.lower()

    if any(word in msg for word in [
        "modif",
        "modifier",
        "change",
        "déplac",
        "reporter"
    ]):
        return "update"

    return "create"


# ---------------- MAIN ---------------- #

def generate_response(message: str, session_id: str):

    # ---------------- INIT SESSION ---------------- #

    if session_id not in sessions:

        sessions[session_id] = {
            "data": {
                "name": None,
                "phone": None,
                "email": None,
                "motif": None,
                "urgence": None
            },

            "step": "collecting",

            "selected_slot": None,

            "slots": [],

            "intent": "create"
        }

    session = sessions[session_id]

    data = session["data"]

    current_step = session["step"]

    # ---------------- STEP : CHOIX SLOT ---------------- #

    if current_step == "waiting_slot":

        selected = None

        # 🔹 Tentative de parser un JSON {"date": "...", "time": "..."} envoyé par le SlotPicker
        try:
            payload = json.loads(message)
            if isinstance(payload, dict) and payload.get("date") and payload.get("time"):
                from app.services.db_service import is_slot_available
                if is_slot_available(payload["date"], payload["time"]):
                    selected = {"date": payload["date"], "time": payload["time"]}
                else:
                    return generate_natural_response(
                        message,
                        data,
                        "créneau déjà pris, demander un autre choix [SLOT_PICKER]"
                    ) + " [SLOT_PICKER]"
        except Exception:
            pass

        # 🔹 Fallback : index numérique (rétrocompatibilité)
        if selected is None:
            try:
                choice = int(message.strip()) - 1
                selected = session["slots"][choice]
            except Exception:
                return generate_natural_response(
                    message,
                    data,
                    "choix créneau invalide [SLOT_PICKER]"
                ) + " [SLOT_PICKER]"

        session["selected_slot"] = selected

        session["step"] = "waiting_confirmation"

        return generate_natural_response(
            message,
            {
                **data,
                "date": selected["date"],
                "time": selected["time"]
            },
            f"""
confirmer rendez-vous :
date={selected['date']}
heure={selected['time']}
"""
        )

    # ---------------- STEP : CONFIRMATION ---------------- #

    if current_step == "waiting_confirmation":

        intent = detect_user_intent(message)    

        if intent == "confirm":

            selected = session["selected_slot"]

            patient_id = get_or_create_patient(data)

            appointment = create_or_update_appointment(
                patient_id,
                {
                    **data,
                    "date": selected["date"],
                    "time": selected["time"]
                }
            )

            # 📧 email confirmation
            send_email(
                data["email"],
                data,
                selected["date"],
                selected["time"]
            )

            # 🧹 reset session
            sessions.pop(session_id, None)

            return generate_natural_response(
                message,
                {
                    **data,
                    "date": selected["date"],
                    "time": selected["time"]
                },
                "rendez-vous confirmé"
            )

        elif intent in ["deny", "modify"]:

            session["step"] = "collecting"

            session["selected_slot"] = None

            return generate_natural_response(
                message,
                data,
                "modifier informations rendez-vous"
            )

        else:

            return generate_natural_response(
                message,
                data,
                "demander confirmation oui non"
            )

    # ---------------- STEP : RESUME ---------------- #


    if current_step == "resume":

        if any(word in message.lower() for word in [
            "oui",
            "correct",
            "valider",
            "confirme",
            "je confirme",
            "confirmé"
        ]):

            session["step"] = "propose_slots"

        else:

            session["step"] = "collecting"

            return generate_natural_response(
                message,
                data,
                "corriger informations utilisateur"
            )

    # ---------------- INTENT ---------------- #

    session["intent"] = detect_intent(message)

    # ---------------- EXTRACTION ---------------- #

    # ⚠️ IMPORTANT :
    # on évite extraction IA dans certains états

    if current_step not in [
        "waiting_slot",
        "waiting_confirmation",
        "resume"
    ]:

        extracted = extract_info(message)

        for key in data:

            if extracted.get(key) is not None:
                data[key] = extracted[key]

    # ---------------- VALIDATION ---------------- #

    if not data["name"]:

        return generate_natural_response(
            message,
            data,
            "demander le nom"
        )

    if not is_valid_name(data["name"]):

        data["name"] = None

        return generate_natural_response(
            message,
            data,
            "nom invalide"
        )

    if not data["phone"]:

        return generate_natural_response(
            message,
            data,
            "demander numéro téléphone"
        )

    if not is_valid_phone(data["phone"]):

        data["phone"] = None

        return generate_natural_response(
            message,
            data,
            "numéro téléphone invalide"
        )

    if not data["email"]:

        return generate_natural_response(
            message,
            data,
            "demander email"
        )

    if not is_valid_email(data["email"]):

        data["email"] = None

        return generate_natural_response(
            message,
            data,
            "email invalide"
        )

    if not data["motif"]:

        return generate_natural_response(
            message,
            data,
            "demander motif consultation"
        )

    if data["urgence"] is None:

        return generate_natural_response(
            message,
            data,
            "demander urgence"
        )

    # ---------------- RESUME ---------------- #

    if session["step"] == "collecting":

        session["step"] = "resume"

        return generate_natural_response(
            message,
            data,
            f"""
résumé informations utilisateur :

nom = {data['name']}
téléphone = {data['phone']}
email = {data['email']}
motif = {data['motif']}
urgence = {data['urgence']}

demander validation
"""
        )

    # ---------------- PROPOSITION SLOTS ---------------- #

    if session["step"] == "propose_slots":

        session["slots"] = []

        session["step"] = "waiting_slot"

        intro = generate_natural_response(
            message,
            data,
            "inviter l'utilisateur à choisir une date et un créneau dans le calendrier"
        )

        return intro + " [SLOT_PICKER]"

    # ---------------- FALLBACK ---------------- #

    return generate_natural_response(
        message,
        data,
        "message incompris"
    )