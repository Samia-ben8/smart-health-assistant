# Medical Multi-Agent Clinical Workflow System

An AI-powered medical workflow platform built using **LangGraph**, **FastAPI**, **OpenAI**, **MCP**, and a modern **Lovable React frontend**.

This project demonstrates a **multi-agent clinical workflow** with:

- Dynamic AI-generated patient interview
- Human-in-the-loop physician validation
- Shared state orchestration using LangGraph
- Interim care recommendations
- Final structured medical report generation
- FastAPI backend and React frontend integration
- MCP tool integration
- LangGraph Studio visualization

---

# Project Architecture

```text
Frontend (Lovable / React)
            ↓
FastAPI Backend
            ↓
LangGraph Multi-Agent Workflow
            ↓
OpenAI + MCP Tools
```

---

# Main Features

## Dynamic Clinical Interview
- Patient describes initial symptoms
- AI generates **5 adaptive clinical questions**
- Questions change according to patient context

## Multi-Agent Workflow
The system uses:

- Supervisor Agent
- Diagnostic Agent
- Care Recommendation Tool
- Physician Review Agent
- Report Generation Agent

## Human-in-the-loop (HITL)
The workflow pauses and waits for:

- Physician validation
- Clinical recommendation input

before generating the final report.

## Final Medical Report
Generated report contains:

- Patient information
- Clinical summary
- Interim recommendations
- Physician notes
- Disclaimer

---

# Repository Structure

```text
medical-multi-agent-system/
│
├── backend/
│
├── frontend/
│
├── README.md
│
└── .gitignore
```

---

# Backend Installation

Go inside backend:

```bash
cd backend
```

---

# Environment Variables

Create:

```text
.env
```

Example:

```env
OPENAI_API_KEY=your_openai_key
LANGCHAIN_TRACING_V2=false
```

Do NOT push `.env`.

---

# Terminal 1 — Backend API

## Windows

### Create virtual environment

```powershell
python -m venv venv
```

### Activate environment

```powershell
.\venv\Scripts\activate
```

### Install dependencies

```powershell
pip install -r requirements.txt
```

### Run FastAPI backend

```powershell
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

## Mac / Linux

### Create virtual environment

```bash
python3 -m venv venv
```

### Activate

```bash
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run backend

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

---

# Terminal 2 — LangGraph Studio

LangGraph Studio allows:

- Workflow visualization
- Node inspection
- State debugging
- Execution tracing

---

## Windows

Open a SECOND terminal.

Activate environment:

```powershell
.\venv\Scripts\activate
```

Run:

```powershell
langgraph dev
```

Studio:

```text
http://127.0.0.1:2024
```

---

## Mac / Linux

Open second terminal:

```bash
source venv/bin/activate
```

Run:

```bash
langgraph dev
```

Studio:

```text
http://127.0.0.1:2024
```

---

# Terminal 3 — Frontend

Go inside frontend:

```bash
cd frontend
```

---

## Windows

Install:

```powershell
npm install
```

Run:

```powershell
npm run dev
```

---

## Mac / Linux

Install:

```bash
npm install
```

Run:

```bash
npm run dev
```

Frontend usually runs on:

```text
http://localhost:5173
```

---

# Workflow Demonstration

The application follows this workflow:

## Screen 1 — Patient Initial Intake
Patient enters:

- Full name
- Initial symptoms

Example:

> I have chest pain and dizziness.

---

## Screen 2 — Dynamic Clinical Interview
AI generates:

- 5 contextual clinical questions

Patient answers sequentially.

---

## Screen 3 — Physician Review
System displays:

- Diagnostic summary
- Interim recommendations

Physician adds:

- Clinical recommendation

---

## Screen 4 — Final Report
The system generates:

- Final medical report
- Patient ID = session thread_id
- Current date
- Physician notes
- Disclaimer

---

# Technologies Used

Backend:

- Python
- FastAPI
- LangGraph
- LangChain
- OpenAI API
- MCP

Frontend:

- React
- Lovable
- TypeScript
- Modern medical dashboard UI

---

# Important Notes

Do NOT push:

```text
.env
venv/
node_modules/
```

Make sure:

- Backend is running before frontend
- OpenAI key is configured
- LangGraph Studio runs in separate terminal

---

# Academic Objective

This project demonstrates:

- Agentic AI systems
- Multi-agent orchestration
- Human-in-the-loop workflows
- Adaptive clinical reasoning
- Modern AI application architecture

It is designed as a demonstrable AI-powered clinical workflow platform using LangGraph and FastAPI.