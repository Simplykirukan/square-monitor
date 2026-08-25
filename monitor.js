const { chromium } = require("playwright");
const http = require("http");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

const seenPosts = new Set();

console.log("==========================================");
console.log("🚀 BINANCE SQUARE → TELEGRAM");
console.log("==========================================");
console.log("👥 10 CREATOR MONITOR");
console.log("==========================================");

CREATORS.forEach((creator, i) => {
  console.log(`${i + 1}. ${creator}`);
});

console.log("==========================================");

// --------------------------------------------------
// HEALTH SERVER
// --------------------------------------------------

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Binance Square Telegram monitor is running");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// --------------------------------------------------
// TELEGRAM
// --------------------------------------------------

async function sendTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("⚠️ Telegram variables are missing");
    return;
  }

  try {
    const url =
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        disable_web_page_preview: false
      })
    });

    if (response.ok) {
      console.log("✅ Telegram message sent");
    } else {
      const text = await response.text();
      console.log("❌ Telegram error:", response.status, text);
    }
  } catch (error) {
    console.log("❌ Telegram connection error:", error.message);
  }
}

// --------------------------------------------------
// CHECK WHETHER RESPONSE LOOKS LIKE SQUARE DATA
// --------------------------------------------------

function looksInteresting(url, data) {
  const lowerUrl = url.toLowerCase();

  const interestingUrlWords = [
    "square",
    "pgc",
    "feed",
    "article",
    "buzz",
    "creator",
    "content",
    "recommend",
    "timeline",
    "author"
  ];

  if (interestingUrlWords.some(word => lowerUrl.includes(word))) {
    return true;
  }

  if (!data) {
    return false;
  }

  const text = JSON.stringify(data).toLowerCase();

  const interestingDataWords = [
    "squareauthorid",
    "authorname",
    "webLink".toLowerCase(),
    "sharelink",
    "contenttype",
    "cardtype",
    "username",
    "postid",
    "feedid"
  ];

  return interestingDataWords.some(word => text.includes(word));
}

// --------------------------------------------------
// EXTRACT POSTS FROM UNKNOWN RESPONSE
// --------------------------------------------------

function findPosts(obj, found = []) {
  if (!obj || typeof obj !== "object") {
    return found;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      findPosts(item, found);
    }

    return found;
  }

  // A Binance Square post usually contains an id and author information
  if (
    obj.id &&
    (
      obj.authorName ||
      obj.username ||
      obj.squareAuthorId ||
      obj.contentType ||
      obj.cardType
    )
  ) {
    found.push(obj);
  }

  for (const key of Object.keys(obj)) {
    try {
      findPosts(obj[key], found);
    } catch (_) {}
  }

  return found;
}

// --------------------------------------------------
// PROCESS POSSIBLE POSTS
// --------------------------------------------------

async function processPosts(posts) {
  if (!posts || posts.length === 0) {
    return;
  }

  for (const post of posts) {
    const id = String(post.id || "");

    if (!id) {
      continue;
    }

    const author =
      post.authorName ||
      post.username ||
      post.author ||
      "";

    const content =
      post.title ||
      post.subTitle ||
      post.content ||
      post.body ||
      "";

    const webLink =
      post.webLink ||
      post.shareLink ||
      `https://www.binance.com/en/square/post/${id}`;

    // Only show posts that could potentially belong to our creators.
    const authorMatches = CREATORS.some(
      creator =>
        String(author).toLowerCase() ===
        String(creator).toLowerCase()
    );

    if (authorMatches) {
      console.log("");
      console.log("🎯 ========================================");
      console.log("🎯 TARGET CREATOR POST FOUND!");
      console.log("🎯 ========================================");
      console.log(`👤 Author: ${author}`);
      console.log(`🆔 ID: ${id}`);
      console.log(`📝 Content: ${String(content).slice(0, 500)}`);
      console.log(`🔗 Link: ${webLink}`);
      console.log("🎯 ========================================");
      console.log("");

      if (!seenPosts.has(id)) {
        seenPosts.add(id);

        const message =
          `📢 <b>NEW BINANCE SQUARE POST</b>\n\n` +
          `👤 <b>${escapeHtml(author)}</b>\n\n` +
          `${escapeHtml(String(content).slice(0, 3000))}\n\n` +
          `⚡ <a href="${webLink}">OPEN IN BINANCE</a>`;

        await sendTelegram(message);
      }
    }
  }
}

// --------------------------------------------------
// HTML ESCAPE
// --------------------------------------------------

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --------------------------------------------------
// MAIN BROWSER MONITOR
// --------------------------------------------------

async function startMonitor() {
  console.log("");
  console.log("==========================================");
  console.log("🔧 BINANCE SQUARE API DIAGNOSTIC");
  console.log("==========================================");
  console.log("");

  console.log("👥 Creators we need to identify:");

  CREATORS.forEach((creator, i) => {
    console.log(`${i + 1}. ${creator}`);
  });

  console.log("");

  await sendTelegram(
    "🚀 <b>Binance Square monitor started</b>\n\n" +
    "👥 Monitoring 10 creators\n" +
    "🔎 Searching Binance Square API responses..."
  );

  console.log("✅ Telegram test successful");
  console.log("");
  console.log("🌐 Starting Chromium...");

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",
    viewport: {
      width: 1440,
      height: 900
    }
  });

  const page = await context.newPage();

  // ------------------------------------------------
  // REQUEST LOGGING
  // ------------------------------------------------

  page.on("request", request => {
    const url = request.url();

    if (
      url.includes("binance.com") &&
      (
        url.includes("/bapi/") ||
        url.includes("/api/") ||
        url.includes("square") ||
        url.includes("pgc") ||
        url.includes("feed")
      )
    ) {
      console.log(`➡️ API REQUEST: ${request.method()} ${url}`);
    }
  });

  // ------------------------------------------------
  // RESPONSE CAPTURE
  // ------------------------------------------------

  page.on("response", async response => {
    const url = response.url();

    if (!url.includes("binance.com")) {
      return;
    }

    const status = response.status();

    // We only care about likely API responses.
    const looksLikeApi =
      url.includes("/bapi/") ||
      url.includes("/api/") ||
      url.includes("square") ||
      url.includes("pgc") ||
      url.includes("feed") ||
      url.includes("buzz") ||
      url.includes("article");

    if (!looksLikeApi) {
      return;
    }

    console.log("");
    console.log("📡 RESPONSE");
    console.log(`STATUS: ${status}`);
    console.log(`URL: ${url}`);

    if (status !== 200) {
      console.log("⚠️ Non-200 response");
      return;
    }

    try {
      const contentType =
        response.headers()["content-type"] || "";

      if (!contentType.includes("json")) {
        console.log(`ℹ️ Content-Type: ${contentType}`);
        return;
      }

      const data = await response.json();

      if (looksInteresting(url, data)) {
        console.log("🔥 INTERESTING BINANCE RESPONSE");

        // Print only a manageable amount to Render logs.
        let preview = JSON.stringify(data);

        if (preview.length > 5000) {
          preview = preview.slice(0, 5000) +
            "... [TRUNCATED]";
        }

        console.log(preview);

        const posts = findPosts(data);

        if (posts.length > 0) {
          console.log(
            `🔎 Possible Square posts found: ${posts.length}`
          );

          await processPosts(posts);
        }
      }
    } catch (error) {
      console.log(
        `⚠️ Could not read JSON response: ${error.message}`
      );
    }
  });

  // ------------------------------------------------
  // CONSOLE LOGS FROM BINANCE PAGE
  // ------------------------------------------------

  page.on("console", msg => {
    const text = msg.text();

    if (
      text.includes("error") ||
      text.includes("Error") ||
      text.includes("square")
    ) {
      console.log(`🌐 PAGE: ${text.slice(0, 1000)}`);
    }
  });

  // ------------------------------------------------
  // PAGE ERRORS
  // ------------------------------------------------

  page.on("pageerror", error => {
    console.log(`⚠️ PAGE ERROR: ${error.message}`);
  });

  // ------------------------------------------------
  // OPEN BINANCE SQUARE
  // ------------------------------------------------

  console.log("");
  console.log("==========================================");
  console.log("🌐 OPENING BINANCE SQUARE");
  console.log("==========================================");

  try {
    await page.goto(
      "https://www.binance.com/en/square",
      {
        waitUntil: "domcontentloaded",
        timeout: 60000
      }
    );

    console.log("✅ Binance Square page loaded");
  } catch (error) {
    console.log(
      `⚠️ Page load warning: ${error.message}`
    );
  }

  // Give Binance time to make API requests.
  console.log("");
  console.log("⏳ Waiting for Binance API responses...");

  await page.waitForTimeout(30000);

  // ------------------------------------------------
  // CONTINUOUS MONITOR
  // ------------------------------------------------

  while (true) {
    try {
      console.log("");
      console.log("🔄 Reloading Binance Square...");

      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: 60000
      });

      console.log("⏳ Waiting for Binance API responses...");

      await page.waitForTimeout(30000);
    } catch (error) {
      console.log(
        `⚠️ Reload error: ${error.message}`
      );

      await new Promise(resolve =>
        setTimeout(resolve, 10000)
      );
    }
  }
}

// --------------------------------------------------
// START
// --------------------------------------------------

startMonitor().catch(async error => {
  console.log("");
  console.log("❌ FATAL ERROR");
  console.log(error);

  try {
    await sendTelegram(
      "❌ <b>Binance Square monitor crashed</b>\n\n" +
      escapeHtml(error.message)
    );
  } catch (_) {}

  // Keep Render alive briefly so logs can be read.
  setTimeout(() => process.exit(1), 3000);
});
