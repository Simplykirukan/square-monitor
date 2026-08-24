import os
import sys
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PORT = int(os.getenv("PORT", 10000))

# Your verified Binance account UID
MY_UID = "1195199098"
MY_HANDLE = "SaMnAtIoN00"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.binance.com",
    "Referer": "https://www.binance.com/en/square",
    "clienttype": "web",
    "lang": "en"
}

# Web server for Render health checks
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Bot is active and polling UID!")

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()

    def log_message(self, format, *args):
        return

def run_health_server():
    server = HTTPServer(("0.0.0.0", PORT), HealthHandler)
    server.serve_forever()

def send_telegram(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    try:
        r = requests.post(url, json=payload, timeout=6)
        print(f"📡 TG Alert Sent -> Status: {r.status_code}", flush=True)
    except Exception as e:
        print(f"❌ TG Send Error: {e}", flush=True)

def fetch_latest_post():
    # Direct numeric authorId query targeting UID 1195199098
    url = f"https://www.binance.com/bapi/composite/v1/public/pgc/feed/user/query?authorId={MY_UID}&page=1&pageSize=1"
    try:
        res = requests.get(url, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("items", []) or data.get("list", [])
            if items:
                post = items[0]
                pid = str(post.get("id") or post.get("feedId") or post.get("postId"))
                body = post.get("body") or post.get("title") or post.get("content") or ""
                return {"id": pid, "body": body}
    except Exception as e:
        print(f"Fetch error: {e}", flush=True)
    return None

def send_alert(post):
    post_id = post["id"]
    body = post.get("body", "")
    post_url = f"https://www.binance.com/en/square/post/{post_id}"

    keywords = ["packet", "code", "box", "crypto box", "bp", "claim", "red", "🧧"]
    is_red_packet = any(k in body.lower() for k in keywords)
    alert_tag = "🧧 <b>RED PACKET ALERT!</b>\n\n" if is_red_packet else "📢 <b>New Square Post</b>\n\n"

    message = (
        f"{alert_tag}"
        f"👤 <b>{MY_HANDLE}</b>\n\n"
        f"{body[:2500]}\n\n"
        f"⚡ <a href='{post_url}'>OPEN IN BINANCE NOW</a>"
    )
    send_telegram(message)

def bot_loop():
    print("🚀 Initializing Single UID Scanner...", flush=True)
    send_telegram("🧪 <b>UID Scanner Online. Monitoring UID: 1195199098!</b>")

    last_post = fetch_latest_post()
    last_id = last_post["id"] if last_post else "0"
    print(f"✅ Initialized. Last Seen Post ID: {last_id}", flush=True)

    while True:
        post = fetch_latest_post()
        if post:
            pid = post["id"]
            if last_id != "0" and pid != last_id:
                print(f"🔥 NEW POST DETECTED: {pid}", flush=True)
                send_alert(post)
                last_id = pid
            elif last_id == "0":
                last_id = pid
        time.sleep(1.5)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
    
