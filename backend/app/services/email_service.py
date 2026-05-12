import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = "yassineelhoudaigui1221@gmail.com"
EMAIL_PASSWORD = "jcci exhx thvu heka"


def send_email(to_email, data, date, time):

    subject = "Confirmation de rendez-vous médical"

    body = f"""
Bonjour {data['name']},

Votre rendez-vous a été confirmé.

📅 Date : {date}
⏰ Heure : {time}
📌 Motif : {data['motif']}
🚨 Urgence : {'Oui' if data['urgence'] else 'Non'}

Merci.
Si vous avez un changement vous pouvez modifier le créneau choisi en fournissant le meme nom et num de tel.
Cabinet Médical Intelligent
"""

    msg = MIMEMultipart()
    msg["From"] = EMAIL_ADDRESS
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    server.send_message(msg)
    server.quit()