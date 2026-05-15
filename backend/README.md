Plan — Corriger le voicebot (créneaux + email épelé)

Problème

Le voicebot partage actuellement la même logique que le chatbot (generate_response dans ai_service.py). Deux étapes ne fonctionnent pas au téléphone :





Choix du créneau — le backend renvoie [SLOT_PICKER] qui suppose une UI calendrier. Au téléphone, il n'y a pas d'UI → l'utilisateur ne peut rien choisir → boucle infinie.



Email — collecté en une fois via reconnaissance vocale, donc presque toujours mal transcrit (ex. "yassine arobase gmail point com" devient n'importe quoi). Pas de vérification.

Objectif

Garder le chatbot inchangé. Ajouter un mode voice dans le backend qui :





demande a l utilisateur quel slot qui lui convient le plus , si ce slot est valide donc on accepte , sinon on demande a l utilisateur de choisir un autre slot ,
ex : voicebot -> quel sera la date et l heure de votre reservation ? 
user -> je souhaite reserver le 19-05-2026 vers 13h .
voicebot -> votre rendez vous est bien enregistré vers mardi prochain a 13h 
ou
voicebot -> quel sera la date et l heure de votre reservation ? 
user -> je souhaite reserver le 18 mai vers 13h .
voicebot -> je m excuse , ce creneaux est indiponible car il est deja reservé par un autre patient , veuillez choisir un autre creneau . 
ou
voicebot -> quel sera la date et l heure de votre reservation ? 
user -> je souhaite reserver le 18 mai vers 19h .
voicebot -> je m excuse , les heures de travail sont de 9h a 17h , veuillez choisir un crenenau entre ces heures 
ou
voicebot -> quel sera la date et l heure de votre reservation ? 
user -> je souhaite reserver le 1 avril vers 15h .
voicebot -> je m excuse , cette date est invalide , choisissez une date a partir de {this_date +1}
 
 



collecte l'email par épellation lettre par lettre, puis fait répéter pour confirmation.



corriger ces fautes de conversation 
Bonjour 👋 Je suis l'assistant du Cabinet Médical Intelligent.

Je peux vous aider à :
• Prendre un rendez-vous
• Modifier un rendez-vous
• Répondre à vos questions

Quel est votre nom et prénom ?

je voudrais creer un nouveau rendez vous

Pour commencer, pourriez-vous me donner votre nom, s’il vous plaît ?

yassine el hodiguy

Pourriez-vous me communiquer votre numéro de téléphone, s’il vous plaît ?

0688503615

Pouvez-vous me communiquer votre adresse email, s’il vous plaît ?

elhodiguyyassine@gmail.com

Voici les informations que j’ai notées : Yassine El Hodiguy, téléphone 06 88 50 36 15, email elhodiguyyassine@gmail.com, pour créer un nouveau rendez-vous, sans urgence. Est-ce exact ?

non , le motif c est mal au jambe

D'accord, j'ai mis à jour votre motif avec "mal au jambe".

ok

Merci, yassine el hodiguy, voici les informations que vous avez fournies : nom, téléphone, email, motif et urgence ; pouvez-vous confirmer que c'est bien cela ?

les info sont vide

Je vais corriger vos informations.

nom yassine num de tel 0688503615 email elhodiguyyassine@gmail.com

Merci, j’ai bien noté vos informations : Yassine, téléphone 0688503615, email elhodiguyyassine@gmail.com. Confirmez-vous ?

oui

Pouvez-vous choisir une date et un créneau qui vous conviennent dans le calendrier ?

jeudi 14 mai 2026

Créneaux disponibles

09:0009:3010:0010:3011:0011:3012:0012:3013:0013:3014:0014:3015:0015:3016:0016:3017:0017:30

📅 jeudi 14 mai 2026 à 13:30

Votre rendez-vous est prévu pour le 14 mai 2026 à 13h30.

ok

Votre rendez-vous pour le 14 mai 2026 à 13h30 est bien confirmé.

merci

de facon a ce que l utilisateur doit choisir aux debut si  c est une nouvelle reservation ou bien la modification d une rerservation deja existante , si c est une nouvelle reservation on collecte les info sans sauter aucune : nom complet , num de tel , email , motif , urgence ! 
si c est la modification d une reservation deja existante , on demande juste le num de tel associé a la reservation puis on fait fetch cette reservation dans notre /appoitement et puis on donne la main a l utilisateur de mlodifier son crenenaux 

et juste enfin de la conversation avec le chatbot , apres cette phrase de confirmation "Votre rendez-vous pour le 14 mai 2026 à 13h30 est bien confirmé." , je voudrais ajouter cette phrase "un email de confirmation est envoyé a votre boite mail associé" pour dire a l utilisateur qu il pourra consulter les info de son rdv dans sa boite mail 

Changements

1. Route /chat — accepter un canal

backend/app/routes/chat.py et backend/app/models/schemas.py :





Ajouter un champ optionnel channel: "chat" | "voice" dans ChatRequest (défaut "chat").



Transmettre à generate_response(message, session_id, channel).

n8n (Workflow 2) ajoutera "channel": "voice" dans le body envoyé à FastAPI. Aucun changement TwiML structurel — on continue d'utiliser <Gather input="speech"> avec la réponse texte du backend.

2. ai_service.py — branchement par canal

Stocker channel dans la session. Adapter deux étapes uniquement :

A. Étape propose_slots / waiting_slot en mode voice





Au lieu d'envoyer [SLOT_PICKER], appeler get_available_slots(limit=3) et stocker la liste dans session["slots"].



Réponse parlée : "Voici les créneaux disponibles : 1, aujourd'hui à 9h00. 2, aujourd'hui à 9h30. 3, aujourd'hui à 10h00. Dites le numéro souhaité."



En waiting_slot, parser un chiffre prononcé (1/2/3, "un"/"deux"/"trois", "le premier"…) via une petite fonction parse_spoken_choice(message) → index → session["slots"][i].



Si invalide : reformuler la liste.

B. Étapes email en mode voice — nouveau sous-flux

Ajouter deux étapes dédiées :





waiting_email_spell : prompt "Veuillez épeler votre adresse email lettre par lettre, dites 'arobase' pour @ et 'point' pour le point."



waiting_email_confirm : reconstruire l'email à partir de la transcription, le relire caractère par caractère "j'ai compris : y, a, s, s, i, n, e, arobase, g, m, a, i, l, point, c, o, m. Est-ce correct ?"





confirm → enregistrer data["email"], continuer le flow normal.



deny/modify → retour à waiting_email_spell.

Helper spelled_to_email(transcript) :





Normaliser la transcription : minuscules, mapper mots-clés français (arobase/at → @, point/tiret/underscore/trait d'union → ./-/_), retirer les espaces et la ponctuation, garder a-z 0-9 . _ - @.



Validation finale via is_valid_email.

En mode chat, le comportement email reste identique (extraction IA en une fois).

3. Détails techniques





parse_spoken_choice : regex sur chiffres + dictionnaire {"un":1, "premier":1, "deux":2, "deuxième":2, "trois":3, ...}.



Mode voice ne renvoie jamais [SLOT_PICKER] (le frontend voice n'en a pas besoin, et n8n ne saurait pas l'interpréter).



generate_natural_response est conservé tel quel ; on lui passe juste des next_action plus explicites pour l'épellation.



Les nouvelles étapes (waiting_email_spell, waiting_email_confirm) sont ajoutées à la liste qui exclut l'extraction IA automatique du message courant.

4. Hors scope





Pas de modification du frontend chatbot ni de SlotPicker.



Pas de modification des workflows n8n (sauf l'ajout de "channel": "voice" dans le body — à faire côté n8n par l'utilisateur, je documenterai).



Pas de changement Twilio/TwiML.

Fichiers touchés





backend/app/models/schemas.py — ajouter channel optionnel.



backend/app/routes/chat.py — passer channel au service.



backend/app/services/ai_service.py — logique voice (slots numérotés + épellation email).

Action côté n8n (à faire par l'utilisateur après merge)

Dans le node HTTP qui appelle /chat, ajouter au JSON body :

{ "message": "{{$json.SpeechResult}}", "session_id": "{{$json.CallSid}}", "channel": "voice" }