import os
import requests
from dotenv import load_dotenv

load_dotenv()

def SendTelegramMessage(message):
    botToken = os.getenv("TELEGRAM_BOT_TOKEN")
    chatId = os.getenv("TELEGRAM_CHAT_ID")

    if not botToken:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set")

    if not chatId:
        raise ValueError("TELEGRAM_CHAT_ID is not set")

    url = f"https://api.telegram.org/bot{botToken}/sendMessage"

    response = requests.post(
        url,
        json={
            "chat_id": chatId,
            "text": message,
        },
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    if not data.get("ok"):
        raise RuntimeError(f"Telegram API error: {data}")

if __name__ == "__main__":
    print("Starting Telegram test...")
    SendTelegramMessage("TEST MESSAGE")
    print("Telegram message sent successfully.")
