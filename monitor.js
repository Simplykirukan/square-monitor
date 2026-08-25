const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");

// ==================================================
// SETTINGS
// ==================================================

const PORT = process.env.PORT || 10000;

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.BOT_TOKEN;

const CHAT_ID =
  process.env.TELEGRAM_CHAT_ID ||
  "-1003905966313";

const CHECK_INTERVAL = 5000;

const SEEN_FILE = "seen_posts.json";

// ==================================================
// BINANCE CREATOR PROFILES
// ==================================================

const CREATORS = [
  {
    name: "SaMnAtIoN00",
    url: "https://www.binance.com/en/square/profile/SaMnAtIoN00"
  },
  {
    name: "Square-Creator-1df1e693e2192",
    url: "https://www.binance.com/en/square/profile/Square-Creator-1df1e693e2192"
  },
  {
    name: "Acqua_DY",
    url: "https://www.binance.com/en/square/profile/Acqua_DY"
  },
  {
    name: "Square-Creator-5dd415213",
    url: "https://www.binance.com/en/square/profile/Square-Creator-5dd415213"
  },
  {
    name: "xiaoxiong",
    url: "https://www.binance.com/en/square/profile/xiaoxiong"
  },
  {
    name: "sanmageshuai",
    url: "https://www.binance.com/en/square/profile/sanmageshuai"
  },
  {
    name: "Square-Creator-4d698fecefd05",
    url: "https://www.binance.com/en/square/profile/Square-Creator-4d698fecefd05"
  },
  {
    name: "susea",
    url: "https://www.binance.com/en/square/profile/susea"
  },
  {
    name: "Square-Creator-19579394c90dc",
    url: "https://www.binance.com/en/square/profile/Square-Creator-19579394c90dc"
  },
  {
    name: "Chungorcrypto",
    url: "https://www.binance.com/en/square/profile/Chungorcrypto"
  }
];

// ==================================================
// STARTUP
// ==================================================

console.log("");
console.log("==========================================");
console.log("🚀 BINANCE SQUARE → TELEGRAM");
console.log("==========================================");
console.log(`👥 CREATORS: ${CREATORS.length}`);
console.log(`⏱️ CHECK: ${CHECK_INTERVAL / 1000}s`);
console.log("==========================================");

CREATORS.forEach((creator, i) => {
  console.log(`${i + 1}. ${creator.name}`);
});

console.log("==========================================");

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
  console.log(`🌐 Health server: ${PORT}`);
});

// ==================================================
// SEEN POSTS
// ==================================================

let seenPosts = new Set();

function loadSeenPosts() {

  try {

    if (!fs.existsSync(SEEN_FILE)) {
      console.log("🆕 No previous seen_posts.json");
      return;
    }

    const data = JSON.parse(
      fs.readFileSync(SEEN_FILE, "utf8")
    );

    if (Array.isArray(data)) {

      seenPosts = new Set(data);

      console.log(
        `💾 Loaded ${seenPosts.size} saved posts`
      );
    }

  } catch (error) {

    console.log(
      `⚠️ Could not load seen posts: ${error.message}`
    );
  }
}

function saveSeenPosts() {

  try {

    fs.writeFileSync(
      SEEN_FILE,
      JSON.stringify(
        Array.from(seenPosts),
        null,
        2
      )
    );

  } catch (error) {

    console.log(
      `⚠️ Could not save seen posts: ${error.message}`
    );
  }
}

// ==================================================
// TELEGRAM
// ==================================================

async function sendTelegram(
  creator,
  postId
) {

  if (!BOT_TOKEN) {

    console.log(
      "❌ TELEGRAM_BOT_TOKEN / BOT_TOKEN missing"
    );

    return false;
  }

  const postUrl =
    `https://www.binance.com/en/square/post/${postId}`;

  const message =
    `🚨 BINANCE SQUARE\n\n` +
    `👤 ${creator}\n\n` +
    `🔗 ${postUrl}`;

  try {

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          disable_web_page_preview: false
        })
      }
    );

    const result =
      await response.json();

    if (result.ok) {

      console.log(
        `⚡ TELEGRAM SENT: ${creator} → ${postId}`
      );

      return true;
    }

    console.log(
      `❌ TELEGRAM ERROR:`,
      result
    );

    return false;

  } catch (error) {

    console.log(
      `❌ TELEGRAM CONNECTION ERROR: ${error.message}`
    );

    return false;
  }
}

// ==================================================
// GET POST IDS FROM PAGE
// ==================================================

async function getPosts(page) {

  try {

    const hrefs =
      await page.evaluate(() => {

        return Array.from(
          document.querySelectorAll(
            'a[href*="/square/post/"]'
          )
        )
          .map(a => a.href)
          .filter(Boolean);

      });

    const posts = [];

    for (const href of hrefs) {

      if (
        !href.includes(
          "/square/post/"
        )
      ) {
        continue;
      }

      const postId =
        href
          .split("/square/post/")[1]
          .split("?")[0]
          .split("#")[0]
          .trim();

      if (
        postId &&
        !posts.includes(postId)
      ) {

        posts.push(postId);
      }
    }

    return posts;

  } catch (error) {

    console.log(
      `⚠️ getPosts error: ${error.message}`
    );

    return [];
  }
}

// ==================================================
// CREATE CREATOR TABS
// ==================================================

async function startMonitor() {

  loadSeenPosts();

  console.log("");
  console.log("🌐 Starting Chromium...");

  const browser =
    await chromium.launch({
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

  const context =
    await browser.newContext({

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

  const pages = [];

  // ==================================================
  // OPEN ALL CREATOR PROFILES
  // ==================================================

  console.log("");
  console.log("==========================================");
  console.log("🌐 OPENING CREATOR PROFILES");
  console.log("==========================================");

  for (
    let i = 0;
    i < CREATORS.length;
    i++
  ) {

    const creator = CREATORS[i];

    const page =
      await context.newPage();

    page.on(
      "pageerror",
      error => {

        // Don't flood Render logs with
        // Binance React errors.
        if (
          !error.message.includes(
            "Minified React error"
          )
        ) {

          console.log(
            `⚠️ ${creator.name}: ${error.message}`
          );
        }
      }
    );

    try {

      console.log(
        `🔗 ${i + 1}/${CREATORS.length} ${creator.name}`
      );

      await page.goto(
        creator.url,
        {
          waitUntil: "domcontentloaded",
          timeout: 60000
        }
      );

      console.log(
        `✅ Loaded: ${creator.name}`
      );

    } catch (error) {

      console.log(
        `⚠️ Navigation failed: ${creator.name}`
      );

      console.log(
        error.message
      );
    }

    pages.push(page);

    await page.waitForTimeout(2000);
  }

  console.log("");
  console.log("==========================================");
  console.log(
    `✅ ${pages.length} CREATOR TABS READY`
  );
  console.log("==========================================");

  // ==================================================
  // INITIAL SCAN
  // ==================================================

  console.log("");
  console.log("==========================================");
  console.log("🧠 INITIAL SCAN");
  console.log("==========================================");

  console.log(
    "Current posts will be marked OLD."
  );

  console.log(
    "🚫 NOTHING WILL BE SENT TO TELEGRAM."
  );

  console.log("");

  let initialTotal = 0;

  for (
    let i = 0;
    i < CREATORS.length;
    i++
  ) {

    const creator =
      CREATORS[i];

    const page =
      pages[i];

    try {

      await page.bringToFront();

      // Give Binance time to render posts.
      await page.waitForTimeout(3000);

      const posts =
        await getPosts(page);

      console.log(
        `📌 ${creator.name}: ${posts.length} posts`
      );

      for (
        const postId of posts
      ) {

        const key =
          `${creator.name.toLowerCase()}:${postId}`;

        if (!seenPosts.has(key)) {

          seenPosts.add(key);

          initialTotal++;
        }
      }

    } catch (error) {

      console.log(
        `⚠️ Initial scan error: ${creator.name}`
      );

      console.log(
        error.message
      );
    }
  }

  saveSeenPosts();

  console.log("");
  console.log(
    `💾 Initial posts stored: ${initialTotal}`
  );

  console.log(
    `💾 Total remembered: ${seenPosts.size}`
  );

  console.log("");
  console.log("==========================================");
  console.log("🔥 LIVE MONITOR STARTED");
  console.log("==========================================");

  // ==================================================
  // LIVE MONITOR
  // ==================================================

  while (true) {

    const start =
      Date.now();

    let newPosts = 0;

    for (
      let i = 0;
      i < CREATORS.length;
      i++
    ) {

      const creator =
        CREATORS[i];

      const page =
        pages[i];

      try {

        await page.bringToFront();

        // Reload periodically so newly
        // published posts appear.
        await page.reload({
          waitUntil: "domcontentloaded",
          timeout: 60000
        }).catch(() => {});

        await page.waitForTimeout(1200);

        const posts =
          await getPosts(page);

        if (!posts.length) {

          console.log(
            `🔎 ${creator.name}: 0 posts found`
          );

          continue;
        }

        for (
          const postId of posts
        ) {

          const key =
            `${creator.name.toLowerCase()}:${postId}`;

          if (seenPosts.has(key)) {
            continue;
          }

          console.log("");
          console.log(
            "=========================================="
          );
          console.log(
            "🔥 NEW BINANCE SQUARE POST"
          );
          console.log(
            `👤 CREATOR: ${creator.name}`
          );
          console.log(
            `🆔 POST: ${postId}`
          );
          console.log(
            "=========================================="
          );

          const sent =
            await sendTelegram(
              creator.name,
              postId
            );

          if (sent) {

            seenPosts.add(key);

            saveSeenPosts();

            newPosts++;
          }
        }

      } catch (error) {

        console.log(
          `⚠️ Monitor error: ${creator.name}`
        );

        console.log(
          error.message
        );
      }
    }

    const elapsed =
      Date.now() - start;

    console.log(
      `💓 Scan complete | ` +
      `Time: ${(elapsed / 1000).toFixed(1)}s | ` +
      `New: ${newPosts} | ` +
      `Remembered: ${seenPosts.size}`
    );

    const wait =
      Math.max(
        1000,
        CHECK_INTERVAL - elapsed
      );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          wait
        )
    );
  }
}

// ==================================================
// START
// ==================================================

startMonitor().catch(
  async error => {

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      "❌ FATAL ERROR"
    );
    console.log(
      "=========================================="
    );

    console.log(
      error
    );

    try {

      await sendTelegram(
        "SYSTEM",
        `ERROR: ${error.message}`
      );

    } catch (_) {}

    process.exit(1);
  }
);
