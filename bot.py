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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "clienttype": "web",
    "lang": "en"
}

# Mini web server for Render health checks
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Bot Active")

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()

    def log_message(self, format, *args):
        return

def run_health_server():
    server = HTTPServer(("0.0.0.0", PORT), HealthHandler)
    server.serve_forever()

def fetch_latest_post(handle):
    url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/user/query?username={handle}&page=1&pageSize=1"
    try:
        res = requests.get(url, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("items", []) or data.get("list", [])
            if items:
                return items[0]
        else:
            # Fallback query attempt
            alt_url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/query?searchKey={handle}&page=1&pageSize=1"
            res_alt = requests.get(alt_url, headers=HEADERS, timeout=6)
            if res_alt.status_code == 200:
                items = res_alt.json().get("data", {}).get("items", [])
                if items:
                    return items[0]
    except Exception as e:
        print(f"Error fetching {handle}: {e}", flush=True)
    return None

def send_alert(post, handle):
    post_id = post.get("id") or post.get("feedId")
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
        print(f"Telegram response: {r.status_code} - {r.text}", flush=True)
    except Exception as e:
        print(f"Failed to send to Telegram: {e}", flush=True)

def bot_loop():
    print("🚀 Initializing Red Packet Watcher...", flush=True)
    seen = {}

    for c in CREATORS:
        handle = c["handle"]
        p = fetch_latest_post(handle)
        if p:
            pid = str(p.get("id") or p.get("feedId"))
            seen[handle] = pid
            print(f"Indexed {handle} -> Last Post ID: {pid}", flush=True)
        else:
            print(f"Could not reach {handle} on initial pass.", flush=True)
        time.sleep(0.2)

    print("✅ Initialization complete. Watching live...", flush=True)

    while True:
        for c in CREATORS:
            handle = c["handle"]
            post = fetch_latest_post(handle)
            if post:
                pid = str(post.get("id") or post.get("feedId"))
                if handle not in seen:
                    seen[handle] = pid
                elif pid != seen[handle]:
                    print(f"🔥 NEW POST DETECTED: {handle} (ID: {pid})", flush=True)
                    send_alert(post, handle)
                    seen[handle] = pid
            time.sleep(0.3)

        time.sleep(2)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
    
