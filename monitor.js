const { chromium } = require("playwright");
const http = require("http");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = Number(process.env.PORT || 10000);

const CREATORS = [
  "SaMnAtIoN00",
  "Square-Creator-1df1e693e2192",
  "Acqua_DY",
  "Square-Creator-5dd415213",
  "xiaoxiong",
  "sanmageshuai",
  "Square-Creator-4d698fecefd05",
  "susea",
  "Square-Creator-19579394c90dc",
  "Chungorcrypto"
];

const CHECK_INTERVAL = 15000;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/124.0.0.0 Safari/537.36",

  "Accept":
    "application/json, text/plain, */*",

  "Accept-Language":
    "en-US,en;q=0.9",

  "Origin":
    "https://www.binance.com",

  "Referer":
    "https://www.binance.com/en/square",

  "clienttype":
    "web",

  "lang":
    "en",

  "Content-Type":
    "application/json"
};

const lastSeen = new Map();

let browser = null;
let page = null;


// ==========================================
// RENDER HEALTH SERVER
// ==========================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end(
    "Binance Square Telegram Monitor is running"
  );
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🌐 Health server listening on port ${PORT}`
  );
});


// ==========================================
// TELEGRAM
// ==========================================

async function sendTelegram(text) {

  if (!TELEGRAM_BOT_TOKEN) {
    console.log(
      "❌ TELEGRAM_BOT_TOKEN is missing"
    );
    return false;
  }

  if (!TELEGRAM_CHAT_ID) {
    console.log(
      "❌ TELEGRAM_CHAT_ID is missing"
    );
    return false;
  }

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: "HTML",
          disable_web_page_preview: false
        })
      }
    );

    const result = await response.json();

    console.log(
      `[TELEGRAM] ${response.status}`
    );

    if (!result.ok) {
      console.log(
        "❌ Telegram error:",
        result
      );

      return false;
    }

    console.log(
      "✅ Telegram message sent"
    );

    return true;

  } catch (error) {

    console.log(
      "❌ Telegram request error:",
      error.message
    );

    return false;
  }
}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(text) {

  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ==========================================
// BINANCE API
// ==========================================

async function fetchLatestPost(handle) {

  const url =
    "https://www.binance.com/" +
    "bapi/composite/v1/public/pgc/feed/author/posts";

  const payload = {
    handle: handle,
    pageIndex: 1,
    pageSize: 5
  };

  try {

    const response = await fetch(
      url,
      {
        method: "POST",

        headers: HEADERS,

        body: JSON.stringify(payload)
      }
    );

    console.log(
      `[${handle}] API Status: ${response.status}`
    );

    if (!response.ok) {

      const errorText =
        await response.text();

      console.log(
        `[${handle}] API response:`,
        errorText.substring(0, 300)
      );

      return [];
    }

    const json =
      await response.json();

    const data =
      json.data || {};

    const items =
      data.list ||
      data.items ||
      [];

    if (!Array.isArray(items)) {
      return [];
    }

    const posts = [];

    for (const item of items) {

      if (!item || typeof item !== "object") {
        continue;
      }

      const id =
        item.id ||
        item.feedId ||
        item.postId;

      const body =
        item.body ||
        item.title ||
        item.content ||
        "";

      if (!id) {
        continue;
      }

      posts.push({
        id: String(id),
        body: String(body)
      });
    }

    return posts;

  } catch (error) {

    console.log(
      `[${handle}] API ERROR:`,
      error.message
    );

    return [];
  }
}


// ==========================================
// PROCESS CREATOR
// ==========================================

async function processCreator(handle) {

  console.log(
    `🔎 Checking ${handle}`
  );

  const posts =
    await fetchLatestPost(handle);

  if (!posts.length) {

    console.log(
      `⚠️ ${handle}: no posts returned`
    );

    return;
  }

  const newest =
    posts[0];

  const postId =
    newest.id;

  console.log(
    `📌 ${handle}: latest post ${postId}`
  );


  // First scan.
  // Register the current post but DON'T send it.
  if (!lastSeen.has(handle)) {

    lastSeen.set(
      handle,
      postId
    );

    console.log(
      `🟢 ${handle}: initial post registered`
    );

    return;
  }


  const previousId =
    lastSeen.get(handle);


  if (previousId === postId) {

    console.log(
      `✓ ${handle}: no new post`
    );

    return;
  }


  // NEW POST
  console.log(
    `🔥 NEW POST DETECTED: ${handle}`
  );

  lastSeen.set(
    handle,
    postId
  );


  const body =
    newest.body || "";


  const lowerBody =
    body.toLowerCase();


  const packetKeywords = [
    "packet",
    "red packet",
    "crypto box",
    "crypto packet",
    "box",
    "claim",
    "code",
    "bp",
    "🧧"
  ];


  const isPacket =
    packetKeywords.some(
      word =>
        lowerBody.includes(word)
    );


  const title =
    isPacket
      ? "🧧 <b>RED PACKET ALERT!</b>"
      : "📢 <b>NEW BINANCE SQUARE POST</b>";


  const postUrl =
    `https://www.binance.com/en/square/post/${postId}`;


  const safeBody =
    escapeHtml(
      body.substring(0, 3000)
    );


  const message =
    `${title}\n\n` +
    `👤 <b>${escapeHtml(handle)}</b>\n\n` +
    `${safeBody}\n\n` +
    `⚡ <a href="${postUrl}">OPEN IN BINANCE</a>`;


  await sendTelegram(
    message
  );
}


// ==========================================
// CHECK ALL 10
// ==========================================

async function checkAllCreators() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "🔄 CHECKING ALL 10 CREATORS"
  );
  console.log(
    "=========================================="
  );


  for (const creator of CREATORS) {

    await processCreator(
      creator
    );

    await new Promise(
      resolve =>
        setTimeout(resolve, 1000)
    );
  }
}


// ==========================================
// START
// ==========================================

async function startMonitor() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "     BINANCE SQUARE → TELEGRAM"
  );
  console.log(
    "        10 CREATOR MONITOR"
  );
  console.log(
    "=========================================="
  );


  for (
    let i = 0;
    i < CREATORS.length;
    i++
  ) {

    console.log(
      `${i + 1}. ${CREATORS[i]}`
    );
  }


  console.log(
    "=========================================="
  );


  browser =
    await chromium.launch({

      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });


  page =
    await browser.newPage({

      viewport: {
        width: 1366,
        height: 900
      },

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36"
    });


  console.log(
    "🚀 Playwright started"
  );


  console.log(
    "🔍 First scan starting..."
  );


  await checkAllCreators();


  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "✅ INITIAL SCAN COMPLETE"
  );
  console.log(
    "=========================================="
  );


  await sendTelegram(
    "🟢 <b>Binance Square Monitor Online</b>\n\n" +
    "Monitoring <b>10 creators</b>.\n" +
    "New posts will be sent automatically."
  );


  while (true) {

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          CHECK_INTERVAL
        )
    );


    console.log("");
    console.log(
      "🔄 Running new-post check..."
    );


    await checkAllCreators();
  }
}


// ==========================================
// SHUTDOWN
// ==========================================

async function shutdown() {

  console.log(
    "🛑 Shutting down..."
  );


  if (browser) {

    try {
      await browser.close();
    } catch {}
  }


  server.close(() => {
    process.exit(0);
  });
}


process.on(
  "SIGTERM",
  shutdown
);

process.on(
  "SIGINT",
  shutdown
);


// ==========================================
// RUN
// ==========================================

startMonitor().catch(
  error => {

    console.error(
      "💥 FATAL ERROR:",
      error
    );

    process.exit(1);
  }
);
