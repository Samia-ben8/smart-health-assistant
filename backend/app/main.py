from fastapi import FastAPI
from app.routes.chat import router as chat_router
from app.routes.appointments import router as appointments_router
from app.routes.availability import router as availability_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

app.include_router(chat_router)
app.include_router(appointments_router)
app.include_router(availability_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ou ["http://localhost:8080"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
