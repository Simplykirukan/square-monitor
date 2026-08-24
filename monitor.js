const { chromium } = require("playwright");
const http = require("http");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = Number(process.env.PORT || 10000);

const CREATORS = [
  {
    name: "SaMnAtIoN00",
    url: "https://app.binance.com/uni-qr/cpro/SaMnAtIoN00?l=en&r=K24ZYWQM&uc=app_square_share_link&us=telegram"
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

const CHECK_INTERVAL = 30000;
const WAIT_AFTER_LOAD = 10000;

const lastSeen = new Map();

let browser = null;
let context = null;


// ==========================================
// RENDER HEALTH SERVER
// ==========================================

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Binance Square monitor is running");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Health server listening on port ${PORT}`);
});


// ==========================================
// TELEGRAM
// ==========================================

async function sendTelegram(text) {

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("❌ Telegram variables missing");
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

    console.log(`[TELEGRAM] ${response.status}`);

    if (!result.ok) {
      console.log("❌ Telegram error:", result);
      return false;
    }

    console.log("✅ Telegram message sent");

    return true;

  } catch (error) {

    console.log(
      "❌ Telegram error:",
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
// CHECK ONE PROFILE
// ==========================================

async function checkCreator(creator) {

  const page = await context.newPage();

  try {

    console.log("");
    console.log(
      "=========================================="
    );

    console.log(
      `🔎 Checking ${creator.name}`
    );

    console.log(
      `🌐 ${creator.url}`
    );


    const response = await page.goto(
      creator.url,
      {
        waitUntil: "domcontentloaded",
        timeout: 60000
      }
    );


    if (response) {

      console.log(
        `📡 Initial HTTP status: ${response.status()}`
      );

    } else {

      console.log(
        "⚠️ No initial response object"
      );
    }


    console.log(
      `⏳ Waiting ${WAIT_AFTER_LOAD / 1000}s...`
    );


    await page.waitForTimeout(
      WAIT_AFTER_LOAD
    );


    // Scroll several times.
    // Binance Square can lazy-load content.

    for (let i = 0; i < 3; i++) {

      await page.evaluate(() => {
        window.scrollBy(
          0,
          window.innerHeight
        );
      });

      await page.waitForTimeout(2000);
    }


    // --------------------------------------
    // COLLECT PAGE INFORMATION
    // --------------------------------------

    const info =
      await page.evaluate(() => {

        const links =
          Array.from(
            document.querySelectorAll("a[href]")
          );


        const allLinks =
          links.map(
            a => ({
              href: a.href,
              text: (a.innerText || "").trim()
            })
          );


        const postLinks =
          allLinks.filter(
            item =>
              /\/square\/post\//i.test(
                item.href
              )
          );


        const appPostLinks =
          allLinks.filter(
            item =>
              /app\.binance\.com\/uni-qr\/cpo/i.test(
                item.href
              )
          );


        const body =
          document.body
            ? document.body.innerText || ""
            : "";


        return {

          title:
            document.title || "",

          url:
            window.location.href,

          postLinks:
            postLinks.slice(0, 20),

          appPostLinks:
            appPostLinks.slice(0, 20),

          totalLinks:
            allLinks.length,

          bodyText:
            body.substring(0, 4000)
        };

      });


    console.log(
      `📄 TITLE: ${info.title}`
    );

    console.log(
      `📍 FINAL URL: ${info.url}`
    );

    console.log(
      `🔗 TOTAL LINKS: ${info.totalLinks}`
    );

    console.log(
      `📝 /square/post/ LINKS: ${info.postLinks.length}`
    );

    console.log(
      `📱 APP POST LINKS: ${info.appPostLinks.length}`
    );


    // --------------------------------------
    // SHOW PAGE TEXT
    // --------------------------------------

    console.log(
      "📝 PAGE TEXT PREVIEW:"
    );

    console.log(
      info.bodyText.substring(0, 1000)
    );


    // --------------------------------------
    // SHOW FOUND POST LINKS
    // --------------------------------------

    if (info.postLinks.length > 0) {

      console.log(
        "🎯 FOUND SQUARE POSTS:"
      );

      for (
        const post of info.postLinks
      ) {

        console.log(
          `➡️ ${post.href}`
        );

      }

    } else {

      console.log(
        "⚠️ NO /square/post/ LINKS FOUND"
      );

    }


    // --------------------------------------
    // TAKE SCREENSHOT
    // --------------------------------------

    try {

      const safeName =
        creator.name.replace(
          /[^a-zA-Z0-9_-]/g,
          "_"
        );

      await page.screenshot({
        path: `/tmp/${safeName}.png`,
        fullPage: false
      });

      console.log(
        `📸 Screenshot captured: ${safeName}.png`
      );

    } catch (error) {

      console.log(
        `⚠️ Screenshot failed: ${error.message}`
      );

    }


    // --------------------------------------
    // CURRENT RESULT
    // --------------------------------------

    if (info.postLinks.length === 0) {

      console.log(
        `⚠️ ${creator.name}: no post links detected`
      );

      return null;
    }


    const newest =
      info.postLinks[0];


    const match =
      newest.href.match(
        /\/square\/post\/([^/?#]+)/i
      );


    if (!match) {

      console.log(
        "⚠️ Post ID extraction failed"
      );

      return null;
    }


    const postId =
      match[1];


    console.log(
      `🎯 LATEST POST ID: ${postId}`
    );


    return {
      id: postId,
      url: newest.href,
      text: newest.text
    };


  } catch (error) {

    console.log(
      `❌ ${creator.name}: ${error.message}`
    );

    return null;

  } finally {

    await page.close();
  }
}


// ==========================================
// PROCESS CREATOR
// ==========================================

async function processCreator(creator) {

  const post =
    await checkCreator(creator);


  if (!post) {
    return;
  }


  const previous =
    lastSeen.get(
      creator.name
    );


  // First scan.
  if (!previous) {

    lastSeen.set(
      creator.name,
      post.id
    );

    console.log(
      `🟢 ${creator.name}: registered ${post.id}`
    );

    return;
  }


  if (previous === post.id) {

    console.log(
      `✓ ${creator.name}: no new post`
    );

    return;
  }


  // --------------------------------------
  // NEW POST
  // --------------------------------------

  console.log("");
  console.log(
    "🔥🔥🔥 NEW POST DETECTED 🔥🔥🔥"
  );

  console.log(
    `👤 Creator: ${creator.name}`
  );

  console.log(
    `🆔 Post: ${post.id}`
  );


  lastSeen.set(
    creator.name,
    post.id
  );


  const packetWords = [
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


  const lower =
    (post.text || "").toLowerCase();


  const isPacket =
    packetWords.some(
      word =>
        lower.includes(word)
    );


  const title =
    isPacket
      ? "🧧 <b>RED PACKET ALERT!</b>"
      : "📢 <b>NEW BINANCE SQUARE POST</b>";


  const message =
    `${title}\n\n` +
    `👤 <b>${escapeHtml(creator.name)}</b>\n\n` +
    `${escapeHtml(
      (post.text || "").substring(0, 3000)
    )}\n\n` +
    `⚡ <a href="${post.url}">OPEN IN BINANCE</a>`;


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


  for (
    const creator of CREATORS
  ) {

    await processCreator(
      creator
    );


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1500
        )
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
    "   BINANCE SQUARE → TELEGRAM"
  );

  console.log(
    "   10 CREATOR APP PROFILE MONITOR"
  );

  console.log(
    "=========================================="
  );


  CREATORS.forEach(
    (creator, index) => {

      console.log(
        `${index + 1}. ${creator.name}`
      );

    }
  );


  console.log(
    "=========================================="
  );


  browser =
    await chromium.launch({

      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]

    });


  context =
    await browser.newContext({

      viewport: {
        width: 1366,
        height: 900
      },

      locale: "en-US",

      timezoneId: "Asia/Kolkata",

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36"

    });


  console.log(
    "🚀 Playwright started"
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
    "10 creator profiles are being monitored."
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
      "🔄 RUNNING NEXT SCAN..."
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


  try {

    if (browser) {
      await browser.close();
    }

  } catch {}


  server.close(
    () => process.exit(0)
  );
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
