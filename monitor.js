const { chromium } = require("playwright");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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

let browser;
let context;

const lastSeen = new Map();

async function sendTelegram(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("❌ Telegram environment variables are missing");
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
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false
        })
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.log("❌ Telegram error:", result);
      return false;
    }

    console.log("✅ Telegram message sent");
    return true;

  } catch (error) {
    console.log("❌ Telegram request failed:", error.message);
    return false;
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function checkCreator(handle) {
  const page = await context.newPage();

  try {
    const url =
      `https://www.binance.com/en/square/profile/${handle}`;

    console.log(`🔎 Checking ${handle}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    const posts = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll("a[href]")
      );

      return links
        .map(link => ({
          href: link.href,
          text: link.innerText || ""
        }))
        .filter(item =>
          item.href.includes("/square/post/")
        );
    });

    if (!posts.length) {
      console.log(`⚠️ ${handle}: no Square posts detected`);
      return;
    }

    const newest = posts[0];

    const match = newest.href.match(
      /\/square\/post\/([^/?#]+)/i
    );

    if (!match) {
      console.log(`⚠️ ${handle}: post ID not found`);
      return;
    }

    const postId = match[1];

    console.log(
      `📌 ${handle}: latest post ${postId}`
    );

    if (!lastSeen.has(handle)) {
      lastSeen.set(handle, postId);

      console.log(
        `🟢 ${handle}: initial post registered`
      );

      return;
    }

    const previousId = lastSeen.get(handle);

    if (previousId === postId) {
      console.log(`✓ ${handle}: no new post`);
      return;
    }

    console.log(
      `🔥 NEW POST DETECTED from ${handle}`
    );

    lastSeen.set(handle, postId);

    const body = (newest.text || "").trim();

    const lowerBody = body.toLowerCase();

    const packetWords = [
      "packet",
      "red packet",
      "crypto box",
      "box",
      "claim",
      "code",
      "bp",
      "🧧"
    ];

    const isPacket = packetWords.some(
      word => lowerBody.includes(word)
    );

    const title = isPacket
      ? "🧧 <b>RED PACKET ALERT!</b>"
      : "📢 <b>NEW BINANCE SQUARE POST</b>";

    const safeBody = escapeHtml(
      body.substring(0, 3000)
    );

    const message =
      `${title}\n\n` +
      `👤 <b>${escapeHtml(handle)}</b>\n\n` +
      `${safeBody}\n\n` +
      `⚡ <a href="${newest.href}">OPEN IN BINANCE</a>`;

    await sendTelegram(message);

  } catch (error) {
    console.log(
      `❌ ${handle}: ${error.message}`
    );
  } finally {
    await page.close();
  }
}

async function checkAllCreators() {
  console.log("");
  console.log("========================================");
  console.log("🔄 CHECKING ALL 10 CREATORS");
  console.log("========================================");

  for (const creator of CREATORS) {
    await checkCreator(creator);

    await new Promise(
      resolve => setTimeout(resolve, 1000)
    );
  }
}

async function start() {
  console.log("");
  console.log("========================================");
  console.log("BINANCE SQUARE → TELEGRAM");
  console.log("10 CREATOR MONITOR");
  console.log("========================================");

  CREATORS.forEach((creator, index) => {
    console.log(
      `${index + 1}. ${creator}`
    );
  });

  console.log("========================================");

  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  context = await browser.newContext({
    viewport: {
      width: 1366,
      height: 900
    },

    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36"
  });

  console.log("🚀 Playwright started");

  await checkAllCreators();

  await sendTelegram(
    "🟢 <b>Binance Square Monitor Started</b>\n\n" +
    "Monitoring 10 creators for new posts."
  );

  while (true) {
    await new Promise(
      resolve => setTimeout(resolve, CHECK_INTERVAL)
    );

    await checkAllCreators();
  }
}

process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received");

  if (browser) {
    await browser.close();
  }

  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received");

  if (browser) {
    await browser.close();
  }

  process.exit(0);
});

start().catch(error => {
  console.error("💥 FATAL ERROR:", error);
  process.exit(1);
});
