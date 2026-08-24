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
    {"handle": "SaMnAtIoN00"}, # Test Account
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.binance.com",
    "Referer": "https://www.binance.com/en/square",
    "clienttype": "web",
    "lang": "en"
}

# Mini web server for Render health checks
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.end_headers()
        self.wfile.write(b"Bot is online and polling!")

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
        print(f"📡 TG Alert Result: {r.status_code}", flush=True)
    except Exception as e:
        print(f"❌ TG Send Error: {e}", flush=True)

def fetch_latest_post(handle):
    # Binance Global Search Gateway for Creator Content
    url = "https://www.binance.com/bapi/composite/v1/public/pgc/search/content"
    payload = {
        "keyword": handle,
        "type": "USER_CONTENT",
        "pageIndex": 1,
        "pageSize": 3
    }
    try:
        res = requests.post(url, json=payload, headers=HEADERS, timeout=6)
        if res.status_code == 200:
            data = res.json().get("data", {})
            items = data.get("list", []) or data.get("items", [])
            for item in items:
                author_name = item.get("authorName") or item.get("handle") or ""
                # Match handle
                if handle.lower() in author_name.lower():
                    pid = str(item.get("id") or item.get("postId") or item.get("feedId"))
                    body = item.get("body") or item.get("title") or item.get("content") or ""
                    return {"id": pid, "body": body, "author": author_name}
    except Exception as e:
        print(f"Fetch error for {handle}: {e}", flush=True)
    return None

def send_alert(post, handle):
    post_id = post["id"]
    body = post.get("body", "")
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
    send_telegram(message)

def bot_loop():
    print("🚀 Initializing Live Search Watcher...", flush=True)
    # Send verification message to Telegram on start
    send_telegram("🚀 <b>Red Packet Watcher is now LIVE and monitoring!</b>")
    
    seen = {}

    for c in CREATORS:
        handle = c["handle"]
        post = fetch_latest_post(handle)
        if post:
            seen[handle] = post["id"]
            print(f"✅ Indexed {handle} (Latest ID: {post['id']})", flush=True)
        else:
            seen[handle] = "0"
            print(f"⚠️ {handle} ready (Awaiting new post)", flush=True)
        time.sleep(0.3)

    print("✅ Full 2-second scan loop active!", flush=True)

    while True:
        for c in CREATORS:
            handle = c["handle"]
            post = fetch_latest_post(handle)
            if post:
                pid = post["id"]
                if handle in seen and seen[handle] != "0" and pid != seen[handle]:
                    print(f"🔥 NEW POST FOUND FOR {handle} -> {pid}", flush=True)
                    send_alert(post, handle)
                    seen[handle] = pid
                elif seen.get(handle) == "0":
                    seen[handle] = pid
            time.sleep(0.2)

        time.sleep(1.5)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
        
