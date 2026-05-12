from app.core.database import patients_collection, appointments_collection
from datetime import datetime, timedelta


# ---------------- SLOTS ---------------- #

def generate_time_slots(start_hour=9, end_hour=17):

    slots = []

    current = datetime.strptime(f"{start_hour}:00", "%H:%M")

    while current < datetime.strptime(f"{end_hour}:00", "%H:%M"):

        slots.append(current.strftime("%H:%M"))

        current += timedelta(minutes=30)

    return slots


def is_slot_available(date, time):

    existing = appointments_collection.find_one({
        "date": date,
        "time": time
    })

    return existing is None


def get_slots_by_date(date: str):

    slots = generate_time_slots()

    result = []

    for time in slots:

        exists = appointments_collection.find_one({
            "date": date,
            "time": time
        })

        result.append({
            "time": time,
            "available": exists is None
        })

    return result


def get_available_slots(limit=3):

    today = datetime.now().strftime("%Y-%m-%d")

    slots = generate_time_slots()

    available = []

    for time in slots:

        if is_slot_available(today, time):

            available.append({
                "date": today,
                "time": time
            })

        if len(available) >= limit:
            break

    return available


# ---------------- PATIENTS ---------------- #

def get_or_create_patient(data):

    patient = patients_collection.find_one({
        "phone": data["phone"]
    })

    if patient:
        return patient["_id"]

    new_patient = {
        "name": data["name"],
        "phone": data["phone"],
        "email": data["email"]
    }

    result = patients_collection.insert_one(new_patient)

    return result.inserted_id


def get_patient_by_phone(phone):

    return patients_collection.find_one({
        "phone": phone
    })


# ---------------- APPOINTMENTS ---------------- #

def get_appointment_by_patient(patient_id):

    return appointments_collection.find_one({
        "patient_id": patient_id
    })


def find_next_available_slot():

    today = datetime.now().strftime("%Y-%m-%d")

    slots = generate_time_slots()

    for time in slots:

        if is_slot_available(today, time):

            return today, time

    return None, None


def find_urgent_slot():

    today = datetime.now().strftime("%Y-%m-%d")

    slots = generate_time_slots()

    # essayer aujourd’hui
    for time in slots:

        if is_slot_available(today, time):

            return today, time

    # sinon demain
    tomorrow = (
        datetime.now() + timedelta(days=1)
    ).strftime("%Y-%m-%d")

    for time in slots:

        if is_slot_available(tomorrow, time):

            return tomorrow, time

    return None, None


# ---------------- CREATE / UPDATE RDV ---------------- #

def create_or_update_appointment(patient_id, data):

    existing = appointments_collection.find_one({
        "patient_id": patient_id
    })

    # ---------------- SLOT CHOISI PAR USER ---------------- #

    if data.get("date") and data.get("time"):

        date = data["date"]
        time = data["time"]

        # sécurité anti conflit
        if not is_slot_available(date, time):

            return None

    else:

        # ---------------- SLOT AUTO ---------------- #

        if data["urgence"]:

            date, time = find_urgent_slot()

        else:

            date, time = find_next_available_slot()

        if not date:
            return None

    # ---------------- UPDATE ---------------- #

    if existing:

        appointments_collection.update_one(
            {
                "_id": existing["_id"]
            },
            {
                "$set": {
                    "date": date,
                    "time": time,
                    "motif": data["motif"],
                    "urgence": data["urgence"]
                }
            }
        )

        return {
            "date": date,
            "time": time,
            "updated": True
        }

    # ---------------- CREATE ---------------- #

    appointment = {
        "patient_id": patient_id,
        "date": date,
        "time": time,
        "motif": data["motif"],
        "urgence": data["urgence"],
        "created_at": datetime.now()
    }

    result = appointments_collection.insert_one(
        appointment
    )

    return {
        "id": str(result.inserted_id),
        "date": date,
        "time": time,
        "updated": False
    }