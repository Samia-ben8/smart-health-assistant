from openai import OpenAI
from app.core.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def generate_natural_response(
    user_message: str,
    context: dict,
    next_action: str
):

    prompt = f"""
Tu es un assistant conversationnel pour un cabinet médical.

IMPORTANT :

Tu ne prends AUCUNE décision.
Tu ne proposes AUCUN rendez-vous.
Tu ne poses PAS de nouvelles questions.
Tu ne modifies PAS le flow conversationnel.
Tu ne changes PAS l’intention du backend.

Tu fais uniquement :
- reformuler naturellement
- rendre humain
- rendre fluide

Tu dois rester STRICTEMENT fidèle à l'action backend.

Ne jamais :
- inventer des étapes
- inventer des intentions
- ajouter des propositions
- ajouter des informations médicales

Ne jamais annoncer :
- qu’un rendez-vous est confirmé
- qu’un rendez-vous est créé
- qu’une action est terminée

sauf si l’action backend contient explicitement :
"rendez-vous confirmé"

Contexte utilisateur :
{context}

Message utilisateur :
"{user_message}"

Action backend :
"{next_action}"

Réponds avec UNE phrase courte et naturelle.
"""
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "Tu es un assistant médical conversationnel naturel."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.8,
        max_tokens=80
    )

    return response.choices[0].message.content.strip()

def detect_user_intent(message: str):

    prompt = f"""
Analyse l'intention utilisateur.

Message :
"{message}"

Choisis UNE catégorie :

- confirm
- deny
- modify
- unknown

Réponds uniquement avec le mot exact.
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    return response.choices[0].message.content.strip().lower()