from pymongo import MongoClient
from app.core.config import MONGO_URI

client = MongoClient(MONGO_URI)

db = client["medical_ai"]

patients_collection = db["patients"]
appointments_collection = db["appointments"]