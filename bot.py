import os
import sys
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PORT = int(os.getenv("PORT", 10000))

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
    {"handle": "samnation"}, # Test Account
]

# Health server for Render
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Bot Active")

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        return

def run_health_server():
    server = HTTPServer(("0.0.0.0", PORT), HealthHandler)
    server.serve_forever()

def fetch_latest_post(handle):
    # Binance App Open Gateway (Bypasses Cloudflare block on Render)
    url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/user/query?username={handle}&page=1&pageSize=1"
    headers = {
        "User-Agent": "okhttp/4.9.2 (Android; Mobile)",
        "clienttype": "android",
        "lang": "en",
        "B-Culture": "en",
        "Accept": "*/*"
    }
    
    try:
        res = requests.get(url, headers=headers, timeout=6)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("items", []) or data.get("list", [])
            if items:
                return items[0]
            return {"empty": True}
        else:
            # Secondary Gateway fallback
            fallback_url = f"https://www.binance.com/gateway-api/v1/public/square/feed/creator?handle={handle}&size=1"
            res2 = requests.get(fallback_url, headers=headers, timeout=6)
            if res2.status_code == 200:
                items = res2.json().get("data", {}).get("list", [])
                if items:
                    return items[0]
            print(f"[{handle}] Status: {res.status_code}", flush=True)
    except Exception as e:
        print(f"[{handle}] Network Error: {e}", flush=True)
    return None

def send_alert(post, handle):
    post_id = post.get("id") or post.get("feedId") or post.get("postId")
    body = post.get("body", "") or post.get("title", "") or post.get("content", "")
    author = post.get("authorName") or handle
    post_url = f"https://www.binance.com/en/square/post/{post_id}"

    keywords = ["packet", "code", "box", "crypto box", "bp", "claim", "red", "🧧"]
    is_red_packet = any(k in body.lower() for k in keywords)
    alert_tag = "🧧 <b>RED PACKET ALERT!</b>\n\n" if is_red_packet else "📢 <b>New Square Post</b>\n\n"

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
    
    try:
        r = requests.post(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage", json=payload, timeout=6)
        print(f"Sent Telegram Alert -> Status: {r.status_code}", flush=True)
    except Exception as e:
        print(f"Telegram error: {e}", flush=True)

def bot_loop():
    print("🚀 Initializing Android Open Gateway...", flush=True)
    seen = {}

    for c in CREATORS:
        handle = c["handle"]
        p = fetch_latest_post(handle)
        if p and not p.get("empty"):
            pid = str(p.get("id") or p.get("feedId") or p.get("postId"))
            seen[handle] = pid
            print(f"✅ Indexed {handle} -> Post ID: {pid}", flush=True)
        else:
            seen[handle] = "0"
            print(f"⚠️ {handle} ready (Awaiting new posts)", flush=True)
        time.sleep(0.3)

    print("✅ Live polling active (2-second intervals)...", flush=True)

    while True:
        for c in CREATORS:
            handle = c["handle"]
            post = fetch_latest_post(handle)
            if post and not post.get("empty"):
                pid = str(post.get("id") or post.get("feedId") or post.get("postId"))
                if handle in seen and seen[handle] != "0" and pid != seen[handle]:
                    print(f"🔥 NEW POST DETECTED: {handle}", flush=True)
                    send_alert(post, handle)
                    seen[handle] = pid
                elif seen.get(handle) == "0":
                    seen[handle] = pid
            time.sleep(0.2)

        time.sleep(1.5)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
            
