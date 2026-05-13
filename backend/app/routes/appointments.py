from fastapi import APIRouter, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timedelta
from collections import Counter

from app.core.database import appointments_collection, patients_collection

router = APIRouter()


def _serialize(appt, patient):
    return {
        "id": str(appt["_id"]),
        "name": (patient or {}).get("name"),
        "phone": (patient or {}).get("phone"),
        "motif": appt.get("motif"),
        "urgence": appt.get("urgence"),
        "date": appt.get("date"),
        "time": appt.get("time"),
    }


@router.get("/appointments")
def get_appointments():
    appointments = list(appointments_collection.find())
    result = []
    for appt in appointments:
        patient = patients_collection.find_one({"_id": appt["patient_id"]})
        result.append(_serialize(appt, patient))
    return result


@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: str):
    try:
        oid = ObjectId(appointment_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID invalide")

    res = appointments_collection.delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable")
    return {"deleted": True}


@router.get("/appointments/stats")
def appointments_stats():
    appointments = list(appointments_collection.find())
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_dt = datetime.now().date()
    week_start = today_dt - timedelta(days=today_dt.weekday())
    week_end = week_start + timedelta(days=6)

    total = len(appointments)
    urgent = sum(1 for a in appointments if a.get("urgence"))
    non_urgent = total - urgent
    today_count = sum(1 for a in appointments if a.get("date") == today_str)

    this_week = 0
    for a in appointments:
        d = a.get("date")
        if not d:
            continue
        try:
            dd = datetime.strptime(d, "%Y-%m-%d").date()
            if week_start <= dd <= week_end:
                this_week += 1
        except (ValueError, TypeError):
            pass

    # 14 derniers jours (incluant aujourd'hui)
    by_day = []
    for i in range(13, -1, -1):
        d = (today_dt - timedelta(days=i)).strftime("%Y-%m-%d")
        count = sum(1 for a in appointments if a.get("date") == d)
        by_day.append({"date": d, "count": count})

    motif_counter = Counter(
        (a.get("motif") or "—").strip().lower() for a in appointments if a.get("motif")
    )
    by_motif = [{"motif": m, "count": c} for m, c in motif_counter.most_common(5)]

    return {
        "total": total,
        "urgent": urgent,
        "non_urgent": non_urgent,
        "today": today_count,
        "this_week": this_week,
        "by_day": by_day,
        "by_motif": by_motif,
    }
