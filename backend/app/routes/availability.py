from fastapi import APIRouter, Query
from datetime import datetime, timedelta

from app.core.database import appointments_collection

router = APIRouter()


# 🔹 Génération des créneaux (09:00 → 17:30)
def generate_slots():
    slots = []
    current = datetime.strptime("09:00", "%H:%M")

    while current <= datetime.strptime("17:30", "%H:%M"):
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=30)

    return slots


@router.get("/availability")
def get_availability(date: str = Query(..., description="Format YYYY-MM-DD")):

    # 🔹 validation basique date
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except:
        return {"error": "Invalid date format. Use YYYY-MM-DD"}

    # 🔹 tous les créneaux possibles
    all_slots = generate_slots()

    # 🔹 récupérer les RDV existants
    booked = list(appointments_collection.find({"date": date}))

    booked_times = [b["time"] for b in booked]

    # 🔹 construire réponse
    result = []

    for slot in all_slots:
        result.append({
            "time": slot,
            "available": slot not in booked_times
        })

    return result