import os
import sys
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PORT = int(os.getenv("PORT", 10000))

# Target handle to monitor
MY_HANDLE = "SaMnAtIoN00"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.binance.com",
    "Referer": "https://www.binance.com/en/square",
    "clienttype": "web",
    "lang": "en",
    "Content-Type": "application/json"
}

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Bot is active")

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
        print(f"📡 TG Alert -> Status: {r.status_code}", flush=True)
    except Exception as e:
        print(f"❌ TG Error: {e}", flush=True)

def fetch_latest_post():
    # Active public endpoint for Binance Square author posts
    url = "https://www.binance.com/bapi/composite/v1/public/pgc/feed/author/posts"
    payload = {
        "handle": MY_HANDLE,
        "pageIndex": 1,
        "pageSize": 2
    }
    
    try:
        res = requests.post(url, json=payload, headers=HEADERS, timeout=6)
        print(f"[DEBUG] API Status: {res.status_code}", flush=True)
        
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("list", []) or data.get("items", []) or []
            if items:
                p = items[0]
                pid = str(p.get("id") or p.get("feedId") or p.get("postId"))
                body = p.get("body") or p.get("title") or p.get("content") or ""
                return {"id": pid, "body": body}
            else:
                print(f"[DEBUG] Empty list returned for handle: {MY_HANDLE}", flush=True)
    except Exception as e:
        print(f"[DEBUG] API Error: {e}", flush=True)

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
    print("🚀 Initializing Live Author Post Scanner...", flush=True)
    send_telegram(f"🔍 <b>Live Author Scanner Active for: {MY_HANDLE}</b>")

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
                print(f"🎯 Post Registered: {pid}", flush=True)
                last_id = pid
        time.sleep(1.5)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
    
