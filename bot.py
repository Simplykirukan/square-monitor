import os
import json
import time
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

CREATORS = [
    {"handle": "Square-Creator-1df1e693e2192"},
    {"handle": "Acqua_DY"},
    {"handle": "Square-Creator-5dd415213"},
    {"handle": "xiaoxiong"},
    {"handle": "sanmageshuai"},
    {"handle": "Square-Creator-4d698fecefd05"},
    {"handle": "susea"},
    {"handle": "Square-Creator-19579394c90dc"},
    {"handle": "Chungorcrypto"},
    {"handle": "SaMnAtIoN"},
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

def fetch_latest_post(handle):
    url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/user/query?handle={handle}&page=1&pageSize=1"
    try:
        res = requests.get(url, headers=HEADERS, timeout=5)
        if res.status_code == 200:
            items = res.json().get("data", {}).get("items", [])
            if items:
                return items[0]
    except Exception:
        pass
    return None

def send_alert(post, handle):
    post_id = post.get("id")
    body = post.get("body", "") or post.get("title", "")
    author = post.get("authorName") or handle
    post_url = f"https://www.binance.com/en/square/post/{post_id}"

    # Highlight if Red Packet keywords are detected
    alert_tag = "🧧 <b>RED PACKET ALERT!</b>\n\n" if any(w in body.lower() for w in ["packet", "code", "box", "crypto box", "bp", "claim", "red"]) else "📢 <b>New Square Post</b>\n\n"

    message = (
        f"{alert_tag}"
        f"👤 <b>{author}</b>\n\n"
        f"{body[:2500]}\n\n"
        f"⚡ <a href='{post_url}'>OPEN IN BINANCE NOW</a>"
    )

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload, timeout=5)

def main():
    print("🚀 Real-Time Red Packet Bot Started...")
    seen = {}

    # Initialize current latest posts
    for c in CREATORS:
        p = fetch_latest_post(c["handle"])
        if p:
            seen[c["handle"]] = str(p.get("id"))
    print("Tracking initialized. Watching live...")

    while True:
        for c in CREATORS:
            handle = c["handle"]
            post = fetch_latest_post(handle)
            if post:
                pid = str(post.get("id"))
                if handle not in seen:
                    seen[handle] = pid
                elif pid != seen[handle]:
                    print(f"🔥 NEW POST DETECTED: {handle}")
                    send_alert(post, handle)
                    seen[handle] = pid
            time.sleep(0.3)  # Small delay between creators to prevent rate-limiting

        time.sleep(2)  # Check all 10 creators every 2 seconds

if __name__ == "__main__":
    main()
