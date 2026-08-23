import requests
import json
import time
import os
from datetime import datetime

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

CREATORS = {
    "Square-Creator-1df1e693e2192": "Creator 1",
    "Acqua_DY": "Acqua_DY",
    "Square-Creator-5dd415213": "Creator 3",
    "xiaoxiong": "xiaoxiong",
    "sanmageshuai": "sanmageshuai",
    "Square-Creator-4d698fecefd05": "Creator 6",
    "susea": "susea",
    "Square-Creator-19579394c90dc": "Creator 8",
    "Chungorcrypto": "Chungorcrypto",
    "SaMnAtIoN": "My Account (Test)",
}

POLL_INTERVAL = 45
SEEN_FILE = "seen.json"

def load_seen():
    if os.path.exists(SEEN_FILE):
        with open(SEEN_FILE, "r") as f:
            return json.load(f)
    return {}

def save_seen(seen):
    with open(SEEN_FILE, "w") as f:
        json.dump(seen, f)

def send_telegram(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "disable_web_page_preview": False
    }
    try:
        r = requests.post(url, json=payload, timeout=15)
        return r.status_code == 200
    except Exception as e:
        print("Telegram error:", e)
        return False

def fetch_posts(square_uid):
    url = "https://www.binance.com/bapi/composite/v2/friendly/pgc/content/queryUserProfilePageContentsWithFilter"
    params = {
        "targetSquareUid": square_uid,
        "timeOffset": -1,
        "filterType": "ALL"
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json",
        "clienttype": "android",
        "lang": "en"
    }
    try:
        r = requests.get(url, params=params, headers=headers, timeout=15)
        return r.json()
    except Exception as e:
        print(f"Fetch error for {square_uid}:", e)
        return None

def main():
    print("Starting Binance Square → Telegram monitor...")
    print(f"Polling every {POLL_INTERVAL} seconds")
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set")
        return

    seen = load_seen()

    while True:
        for uid, name in CREATORS.items():
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Checking {name}...")
            data = fetch_posts(uid)

            if not data or data.get("code") != "000000":
                print("  → No data or error")
                continue

            posts = data.get("data", {}).get("list") or data.get("data", {}).get("vos") or []
            
            if not posts:
                print("  → Empty list")
                continue

            for post in posts[:5]:
                post_id = str(post.get("id") or post.get("contentId") or "")
                if not post_id:
                    continue

                key = f"{uid}_{post_id}"
                if key in seen:
                    continue

                content = post.get("bodyTextOnly") or post.get("content") or post.get("title") or "No text"
                link = f"https://www.binance.com/en/square/post/{post_id}"

                message = f"📢 New post from {name}\n\n{content[:800]}\n\n🔗 {link}"
                
                if send_telegram(message):
                    print(f"  → Sent new post {post_id}")
                    seen[key] = int(time.time())
                    save_seen(seen)
                else:
                    print("  → Failed to send to Telegram")

        print(f"Sleeping {POLL_INTERVAL}s...\n")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
