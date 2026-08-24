import os
import time
import json
import requests

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

CREATORS = [
    "SaMnAtIoN00",
    "Square-Creator-1df1e693e2192",
    "Acqua_DY",
    "Square-Creator-5dd415213",
    "xiaoxiong",
    "sanmageshuai",
    "Square-Creator-4d698fecefd05",
    "susea",
    "Square-Creator-19579394c90dc",
    "Chungorcrypto",
]

STATE_FILE = "seen_posts.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.binance.com",
    "Referer": "https://www.binance.com/en/square",
    "clienttype": "web",
    "lang": "en",
    "Content-Type": "application/json",
}


def load_state():
    if not os.path.exists(STATE_FILE):
        return {}

    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def send_telegram(text):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("ERROR: Telegram secrets are missing.")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            timeout=15
        )

        print(
            f"[TELEGRAM] Status: {response.status_code}",
            flush=True
        )

        if response.status_code != 200:
            print(
                f"[TELEGRAM] {response.text[:500]}",
                flush=True
            )
            return False

        return True

    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}", flush=True)
        return False


def fetch_posts(handle):
    url = (
        "https://www.binance.com/"
        "bapi/composite/v1/public/pgc/feed/author/posts"
    )

    payload = {
        "handle": handle,
        "pageIndex": 1,
        "pageSize": 5,
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=HEADERS,
            timeout=15
        )

        print(
            f"[{handle}] API: {response.status_code}",
            flush=True
        )

        if response.status_code != 200:
            return []

        data = response.json().get("data", {})

        if not isinstance(data, dict):
            return []

        items = (
            data.get("list")
            or data.get("items")
            or []
        )

        if not isinstance(items, list):
            return []

        posts = []

        for item in items:
            if not isinstance(item, dict):
                continue

            post_id = (
                item.get("id")
                or item.get("feedId")
                or item.get("postId")
            )

            body = (
                item.get("body")
                or item.get("title")
                or item.get("content")
                or ""
            )

            if not post_id:
                continue

            posts.append({
                "id": str(post_id),
                "body": str(body),
            })

        return posts

    except Exception as e:
        print(
            f"[{handle}] API ERROR: {e}",
            flush=True
        )
        return []


def send_post(handle, post):
    post_id = post["id"]
    body = post["body"]

    post_url = (
        f"https://www.binance.com/en/square/post/{post_id}"
    )

    keywords = [
        "packet",
        "red packet",
        "crypto box",
        "box",
        "claim",
        "code",
        "bp",
        "🧧",
    ]

    lower_body = body.lower()

    is_packet = any(
        keyword in lower_body
        for keyword in keywords
    )

    if is_packet:
        title = "🧧 <b>RED PACKET ALERT!</b>"
    else:
        title = "📢 <b>NEW BINANCE SQUARE POST</b>"

    message = (
        f"{title}\n\n"
        f"👤 <b>{handle}</b>\n\n"
        f"{body[:3000]}\n\n"
        f"⚡ "
        f"<a href=\"{post_url}\">OPEN IN BINANCE</a>"
    )

    return send_telegram(message)


def check_creator(handle, state):
    posts = fetch_posts(handle)

    if not posts:
        print(
            f"[{handle}] No posts returned.",
            flush=True
        )
        return

    newest = posts[0]
    newest_id = newest["id"]

    previous_id = state.get(handle)

    # First run:
    # register the current newest post without sending it.
    if previous_id is None:
        state[handle] = newest_id

        print(
            f"[{handle}] Initial post registered: "
            f"{newest_id}",
            flush=True
        )

        return

    if newest_id == previous_id:
        print(
            f"[{handle}] No new post.",
            flush=True
        )
        return

    print(
        f"🔥 [{handle}] NEW POST: {newest_id}",
        flush=True
    )

    if send_post(handle, newest):
        state[handle] = newest_id
        print(
            f"✅ [{handle}] Sent to Telegram.",
            flush=True
        )
    else:
        print(
            f"❌ [{handle}] Telegram send failed.",
            flush=True
        )


def main():
    print("=" * 60)
    print("BINANCE SQUARE → TELEGRAM")
    print("10 CREATOR MONITOR")
    print("=" * 60)

    state = load_state()

    print(
        f"Creators: {len(CREATORS)}",
        flush=True
    )

    for number, creator in enumerate(CREATORS, 1):
        print(
            f"{number}. {creator}",
            flush=True
        )

    print("=" * 60)

    if not TELEGRAM_BOT_TOKEN:
        print("ERROR: BOT_TOKEN is missing.")

    if not TELEGRAM_CHAT_ID:
        print("ERROR: CHAT_ID is missing.")

    for creator in CREATORS:
        check_creator(creator, state)

    save_state(state)

    print("=" * 60)
    print("CHECK COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
