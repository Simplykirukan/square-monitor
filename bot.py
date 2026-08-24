import os
import sys
import re
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
PORT = int(os.getenv("PORT", 10000))

# Test Handle
MY_HANDLE = "SaMnAtIoN00"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
}

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
        print(f"📡 TG Sent -> Status: {r.status_code}", flush=True)
    except Exception as e:
        print(f"❌ TG Error: {e}", flush=True)

def fetch_latest_post():
    url = f"https://www.binance.com/en/square/profile/{MY_HANDLE}"
    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        print(f"[DEBUG] Profile Page HTTP Status: {res.status_code}", flush=True)

        if res.status_code == 200:
            html = res.text
            # Method A: Extract Next.js embedded JSON data
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
            if match:
                data = json.loads(match.group(1))
                page_props = data.get("props", {}).get("pageProps", {})
                feed_list = page_props.get("feedList", []) or page_props.get("list", []) or page_props.get("items", [])
                if feed_list:
                    p = feed_list[0]
                    pid = str(p.get("id") or p.get("postId") or p.get("feedId"))
                    body = p.get("body") or p.get("title") or p.get("content") or ""
                    return {"id": pid, "body": body}

            # Method B: Regex search for any post ID URL in HTML
            post_links = re.findall(r'/square/post/(\d+)', html)
            if post_links:
                pid = post_links[0]
                return {"id": pid, "body": f"Post detected on {MY_HANDLE} profile."}

    except Exception as e:
        print(f"[DEBUG] Fetch exception: {e}", flush=True)

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
    print("🚀 Initializing HTML Next.js Watcher...", flush=True)
    send_telegram(f"🔍 <b>Profile Watcher Starting for: {MY_HANDLE}</b>")

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
                print(f"🎯 First post registered -> ID: {pid}", flush=True)
                last_id = pid
        time.sleep(2)

if __name__ == "__main__":
    threading.Thread(target=run_health_server, daemon=True).start()
    bot_loop()
