const { chromium } = require("playwright");
const http = require("http");

const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ==================================================
// 10 BINANCE SQUARE CREATOR PROFILES
// ==================================================

const CREATORS = [
  {
    name: "SaMnAtIoN00",
    url: "https://app.binance.com/uni-qr/cpro/SaMnAtIoN00?l=en"
  },
  {
    name: "Square-Creator-1df1e693e2192",
    url: "https://app.binance.com/uni-qr/cpro/Square-Creator-1df1e693e2192?l=en&r=K24ZYWQM&uc=app_square_share_link&us=telegram"
  },
  {
    name: "Acqua_DY",
    url: "https://app.binance.com/uni-qr/cpro/Acqua_DY?l=en&r=M4BDZ6KL&uc=app_square_share_link&us=telegram"
  },
  {
    name: "Square-Creator-5dd415213",
    url: "https://app.binance.com/uni-qr/cpro/Square-Creator-5dd415213?l=en&r=BM3RTM2G&uc=web_square_share_link&us=copylink"
  },
  {
    name: "xiaoxiong",
    url: "https://app.binance.com/uni-qr/cpro/xiaoxiong?l=en&r=OVAOU1IB&uc=app_square_share_link&us=copylink"
  },
  {
    name: "sanmageshuai",
    url: "https://app.binance.com/uni-qr/cpro/sanmageshuai?l=en&r=SDR9QGU2&uc=app_square_share_link&us=copylink"
  },
  {
    name: "Square-Creator-4d698fecefd05",
    url: "https://app.binance.com/uni-qr/cpro/Square-Creator-4d698fecefd05?l=en&r=ELIAA7DF&uc=app_square_share_link&us=copylink"
  },
  {
    name: "susea",
    url: "https://app.binance.com/uni-qr/cpro/susea?l=en&r=CXOE1FC0&uc=app_square_share_link&us=copylink"
  },
  {
    name: "Square-Creator-19579394c90dc",
    url: "https://app.binance.com/uni-qr/cpro/Square-Creator-19579394c90dc?l=en&r=SW55NRP9&uc=app_square_share_link&us=copylink"
  },
  {
    name: "Chungorcrypto",
    url: "https://app.binance.com/uni-qr/cpro/Chungorcrypto?l=en&r=V3PR8MCA&uc=app_square_share_link&us=copylink"
  }
];

console.log("");
console.log("==========================================");
console.log("🚀 BINANCE SQUARE CREATOR DIAGNOSTIC");
console.log("==========================================");
console.log(`👥 ${CREATORS.length} CREATORS`);
console.log("==========================================");

CREATORS.forEach((creator, index) => {
  console.log(`${index + 1}. ${creator.name}`);
});

console.log("==========================================");
console.log("");

// ==================================================
// HEALTH SERVER
// ==================================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Binance Square monitor is running");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server running on port ${PORT}`);
});

// ==================================================
// TELEGRAM TEST
// ==================================================

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("❌ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing");
    return false;
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
        text: text,
        disable_web_page_preview: true
      })
    });

    const result = await response.text();

    if (response.ok) {
      console.log("✅ Telegram message sent");
      return true;
    }

    console.log(
      `❌ Telegram error ${response.status}: ${result}`
    );

    return false;

  } catch (error) {
    console.log(
      `❌ Telegram connection error: ${error.message}`
    );

    return false;
  }
}

// ==================================================
// MAIN BROWSER
// ==================================================

async function startMonitor() {

  console.log("");
  console.log("==========================================");
  console.log("🔧 STARTING PROFILE DIAGNOSTIC");
  console.log("==========================================");

  const telegramOK = await sendTelegram(
    "🔧 <b>Binance Square diagnostic started</b>\n\n" +
    "👥 Testing 10 creator profiles\n" +
    "🌐 Capturing Binance network responses..."
  );

  if (telegramOK) {
    console.log("✅ Telegram test successful");
  }

  console.log("");
  console.log("🌐 Starting Chromium...");

  const browser = await chromium.launch({
    headless: true,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled"
    ]
  });

  const context = await browser.newContext({
    viewport: {
      width: 1440,
      height: 900
    },

    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",

    locale: "en-US"
  });

  const page = await context.newPage();

  // ==================================================
  // REQUEST LOGGER
  // ==================================================

  page.on("request", request => {

    const url = request.url();

    if (!url.includes("binance")) {
      return;
    }

    const type = request.resourceType();

    if (
      type === "xhr" ||
      type === "fetch" ||
      url.includes("/bapi/") ||
      url.includes("/api/")
    ) {

      console.log("");
      console.log("➡️ BINANCE REQUEST");
      console.log(`METHOD: ${request.method()}`);
      console.log(`TYPE: ${type}`);
      console.log(`URL: ${url}`);

      try {
        const postData = request.postData();

        if (postData) {
          console.log(
            `📦 POST DATA: ${postData.slice(0, 2000)}`
          );
        }
      } catch (_) {}
    }
  });

  // ==================================================
  // RESPONSE LOGGER
  // ==================================================

  page.on("response", async response => {

    const url = response.url();

    if (!url.includes("binance")) {
      return;
    }

    const type = response.request().resourceType();

    if (
      type !== "xhr" &&
      type !== "fetch"
    ) {
      return;
    }

    const status = response.status();

    console.log("");
    console.log("📡 BINANCE RESPONSE");
    console.log(`STATUS: ${status}`);
    console.log(`TYPE: ${type}`);
    console.log(`URL: ${url}`);

    if (status < 200 || status >= 300) {
      console.log("⚠️ Non-success response");
      return;
    }

    try {

      const contentType =
        response.headers()["content-type"] || "";

      if (
        !contentType.includes("json") &&
        !url.includes("/bapi/") &&
        !url.includes("/api/")
      ) {
        return;
      }

      const text = await response.text();

      if (!text) {
        return;
      }

      console.log(
        `📦 RESPONSE SIZE: ${text.length} bytes`
      );

      // Print first 4000 characters only.
      console.log(
        text.slice(0, 4000)
      );

      console.log("");
      console.log(
        "------------------------------------------"
      );

    } catch (error) {

      console.log(
        `⚠️ Could not read response: ${error.message}`
      );
    }
  });

  // ==================================================
  // PAGE ERRORS
  // ==================================================

  page.on("pageerror", error => {
    console.log(
      `⚠️ PAGE ERROR: ${error.message}`
    );
  });

  // ==================================================
  // CONSOLE
  // ==================================================

  page.on("console", msg => {

    const text = msg.text();

    if (
      text.toLowerCase().includes("error") ||
      text.toLowerCase().includes("square")
    ) {
      console.log(
        `🌐 BINANCE PAGE: ${text.slice(0, 1500)}`
      );
    }
  });

  // ==================================================
  // TEST EACH CREATOR
  // ==================================================

  for (let i = 0; i < CREATORS.length; i++) {

    const creator = CREATORS[i];

    console.log("");
    console.log("");
    console.log("==========================================");
    console.log(`👤 CREATOR ${i + 1}/${CREATORS.length}`);
    console.log(`👤 ${creator.name}`);
    console.log("==========================================");
    console.log(`🔗 ${creator.url}`);
    console.log("");

    try {

      await page.goto(
        creator.url,
        {
          waitUntil: "domcontentloaded",
          timeout: 60000
        }
      );

      console.log(
        `✅ Profile page loaded: ${creator.name}`
      );

    } catch (error) {

      console.log(
        `⚠️ Page navigation error: ${error.message}`
      );
    }

    console.log(
      "⏳ Waiting 15 seconds for Binance API..."
    );

    await page.waitForTimeout(15000);

    // Print page URL after redirects.
    console.log(
      `📍 FINAL PAGE URL: ${page.url()}`
    );

    // Print page title.
    try {
      console.log(
        `📄 PAGE TITLE: ${await page.title()}`
      );
    } catch (_) {}

    console.log("");
    console.log(
      `✅ Finished diagnostic for ${creator.name}`
    );
  }

  // ==================================================
  // FINISHED
  // ==================================================

  console.log("");
  console.log("==========================================");
  console.log("🏁 ALL 10 PROFILES TESTED");
  console.log("==========================================");
  console.log("");
  console.log(
    "⏳ Keeping browser alive for another 5 minutes..."
  );

  // Keep process alive.
  while (true) {
    await new Promise(resolve =>
      setTimeout(resolve, 30000)
    );

    console.log(
      "💓 Monitor still running..."
    );
  }
}

// ==================================================
// START
// ==================================================

startMonitor().catch(async error => {

  console.log("");
  console.log("==========================================");
  console.log("❌ FATAL ERROR");
  console.log("==========================================");

  console.log(error);

  try {
    await sendTelegram(
      "❌ Binance Square monitor crashed\n\n" +
      error.message
    );
  } catch (_) {}

  setTimeout(() => {
    process.exit(1);
  }, 3000);
});
