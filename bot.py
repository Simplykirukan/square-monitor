import os
import json
import time
import requests

# ----------------- CONFIGURATION -----------------
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Pre-configured list of your 10 creators
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
    {"handle": "SaMnAtIoN"}, # Test Account
]

STATE_FILE = "seen_posts.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
}

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def fetch_creator_feed(handle):
    # Query feed via Binance Square handle query
    url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/user/query?handle={handle}&page=1&pageSize=1"
    try:
        res = requests.get(url, headers=HEADERS, timeout=12)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("items", [])
            if items:
                return items[0]
    except Exception as e:
        print(f"Error fetching feed for {handle}: {e}")
    return None

def send_telegram_post(post, handle):
    post_id = post.get("id")
    body = post.get("body", "") or post.get("title", "")
    author_name = post.get("authorName") or handle
    
    # Telegram message character limit protection
    if len(body) > 3500:
        body = body[:3500] + "..."

    post_url = f"https://www.binance.com/en/square/post/{post_id}"
    message = (
        f"✍️ <b>{author_name} on Binance Square</b>\n\n"
        f"{body}\n\n"
        f"🔗 <a href='{post_url}'>View on Binance Square</a>"
    )

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json=payload,
            timeout=10
        )
    except Exception as e:
        print(f"Telegram send error: {e}")

def run():
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID secret.")
        return

    state = load_state()

    for item in CREATORS:
        handle = item["handle"]
        post = fetch_creator_feed(handle)
        
        if not post:
            continue

        post_id = str(post.get("id"))
        last_id = state.get(handle)

        if last_id is None:
            # First initialization: save latest post so it won't post old history
            state[handle] = post_id
            print(f"Initialized {handle} at post: {post_id}")
        elif post_id != last_id:
            # New post detected
            send_telegram_post(post, handle)
            state[handle] = post_id
            print(f"Forwarded new post from {handle}: {post_id}")
            time.sleep(1)

    save_state(state)

if __name__ == "__main__":
    run()
