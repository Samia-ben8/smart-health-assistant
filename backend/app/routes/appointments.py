from fastapi import APIRouter
from app.core.database import appointments_collection, patients_collection

router = APIRouter()


@router.get("/appointments")
def get_appointments():

    appointments = list(appointments_collection.find())

    result = []

    for appt in appointments:
        patient = patients_collection.find_one({"_id": appt["patient_id"]})

        result.append({
            "name": patient.get("name"),
            "phone": patient.get("phone"),
            "motif": appt.get("motif"),
            "urgence": appt.get("urgence"),
            "date": appt.get("date"),
            "time": appt.get("time")
        })

    return result