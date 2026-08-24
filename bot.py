import os
import sys
import re
import time
import json
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
    {"handle": "SaMnAtIoN"}, # Test Account
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.binance.com/en/square",
    "clienttype": "web",
    "lang": "en"
}

# Mini web server for Render keep-alive
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
    # Method 1: Binance Profile API (POST)
    api_url = "https://www.binance.com/bapi/composite/v1/friendly/pgc/feed/profile/feed/list"
    payload = {"handle": handle, "pageIndex": 1, "pageSize": 5}
    try:
        res = requests.post(api_url, json=payload, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("list", []) or data.get("items", [])
            if items:
                post = items[0]
                pid = str(post.get("id") or post.get("feedId") or post.get("postId"))
                text = post.get("body") or post.get("title") or post.get("content") or ""
                return {"id": pid, "text": text, "author": handle}
    except Exception:
        pass

    # Method 2: Public Profile Page Scraper (Direct Web Fallback)
    try:
        web_url = f"https://www.binance.com/en/square/profile/{handle}"
        res_web = requests.get(web_url, headers=HEADERS, timeout=6)
        if res_web.status_code == 200:
            html = res_web.text
            # Extract post IDs from public HTML
            post_ids = re.findall(r'/square/post/(\d+)', html) or re.findall(r'"postId":"?(\d+)"?', html) or re.findall(r'"id":"?(\d{10,25})"?', html)
            if post_ids:
                return {"id": post_ids[0], "text": f"New post from {handle}", "author": handle}
    except Exception as e:
        print(f"Error checking {handle}: {e}", flush=True)

    return None

def send_alert(post, handle):
    post_id = post.get("id")
    body = post.get("text", "")
    author = post.get("author", handle)
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
        print(f"Alert forwarded for {handle} -> Status: {r.status_code}", flush=True)
    except Exception as e:
        print(f"Telegram error: {e}", flush=True)

def bot_loop():
    print("🚀 Initializing Red Packet Watcher...", flush=True)
    seen = {}

    for c in CREATORS:
        handle = c["handle"]
        p = fetch_latest_post(handle)
        if p:
            pid = str(p["id"])
            seen[handle] = pid
            print(f"✅ Indexed {handle} -> Last Post ID: {pid}", flush=True)
        else:
            seen[handle] = "0"
            print(f"⚠️ {handle} ready (Awaiting new post)", flush=True)
        time.sleep(0.3)

    print("✅ Live polling active (2-second intervals)...", flush=True)

    while True:
        for c in CREATORS:
            handle = c["handle"]
            post = fetch_latest_post(handle)
            if post:
                pid = str(post["id"])
                if handle in seen and seen[handle] != "0" and pid != seen[handle]:
                    print(f"🔥 NEW POST: {handle} (ID: {pid})", flush=True)
                    send_alert(post, handle)
                    seen[handle] = pid
                elif seen.get(handle) == "0":
                    seen[handle] = pid
            time.sleep(0.2)

        time.sleep(1.5)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
        
