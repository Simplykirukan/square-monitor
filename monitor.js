const { chromium } = require("playwright");
const http = require("http");

const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ==================================================
// BINANCE SQUARE CREATORS
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
  url: "https://www.binance.com/en/square/profile/Acqua_DY"
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
console.log("🚀 BINANCE SQUARE → TELEGRAM");
console.log("==========================================");
console.log(`👥 ${CREATORS.length} CREATOR MONITOR`);
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
// TELEGRAM
// ==================================================

async function sendTelegram(text) {

  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("❌ Telegram environment variables missing");
    return false;
  }

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
          text,
          disable_web_page_preview: true
        })
      }
    );

    if (response.ok) {
      console.log("✅ Telegram message sent");
      return true;
    }

    console.log(
      `❌ Telegram error ${response.status}: ${await response.text()}`
    );

    return false;

  } catch (error) {

    console.log(
      `❌ Telegram error: ${error.message}`
    );

    return false;
  }
}

// ==================================================
// FIND VALUES INSIDE UNKNOWN BINANCE JSON
// ==================================================

function findValue(obj, wantedKey) {

  if (!obj || typeof obj !== "object") {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(obj, wantedKey)
  ) {
    return obj[wantedKey];
  }

  for (const key of Object.keys(obj)) {

    try {

      const result = findValue(
        obj[key],
        wantedKey
      );

      if (result !== null && result !== undefined) {
        return result;
      }

    } catch (_) {}
  }

  return null;
}

// ==================================================
// FIND POSSIBLE POSTS
// ==================================================

function findPostArrays(obj, results = []) {

  if (!obj || typeof obj !== "object") {
    return results;
  }

  if (Array.isArray(obj)) {

    if (obj.length > 0) {

      const first = obj[0];

      if (
        first &&
        typeof first === "object" &&
        (
          first.content ||
          first.text ||
          first.postContent ||
          first.title ||
          first.description ||
          first.feedId ||
          first.id
        )
      ) {
        results.push(obj);
      }
    }

    for (const item of obj) {
      findPostArrays(item, results);
    }

    return results;
  }

  for (const key of Object.keys(obj)) {
    findPostArrays(obj[key], results);
  }

  return results;
}

// ==================================================
// CREATE SIMPLE POST TEXT
// ==================================================

function extractPostText(post) {

  if (!post || typeof post !== "object") {
    return "";
  }

  const possibleFields = [
    "content",
    "text",
    "postContent",
    "description",
    "title",
    "body"
  ];

  for (const field of possibleFields) {

    if (
      typeof post[field] === "string" &&
      post[field].trim()
    ) {
      return post[field].trim();
    }
  }

  return "";
}

// ==================================================
// GET CREATOR UID
// ==================================================

async function getCreatorUID(page, creator) {

  console.log("");
  console.log(`🔍 Finding Binance UID for ${creator.name}...`);

  let foundUID = null;

  const handler = async response => {

    const url = response.url();

    if (
      !url.includes(
        "/bapi/composite/v3/friendly/pgc/user/client"
      )
    ) {
      return;
    }

    try {

      const text = await response.text();

      if (!text) {
        return;
      }

      const data = JSON.parse(text);

      const uid =
        findValue(data, "targetSquareUid") ||
        findValue(data, "squareUid") ||
        findValue(data, "squareUID");

      if (uid) {

        foundUID = uid;

        console.log(
          `✅ UID FOUND: ${foundUID}`
        );
      }

    } catch (error) {

      console.log(
        `⚠️ UID response parse error: ${error.message}`
      );
    }
  };

  page.on("response", handler);

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
      `⚠️ Navigation error: ${error.message}`
    );
  }

  // Give Binance time to make the profile API calls.
  for (let i = 0; i < 10 && !foundUID; i++) {
    await page.waitForTimeout(1000);
  }

  page.off("response", handler);

  if (!foundUID) {

    console.log(
      `⚠️ Could not find UID for ${creator.name}`
    );

    return null;
  }

  return foundUID;
}

// ==================================================
// GET POSTS DIRECTLY FROM BINANCE CONTENT API
// ==================================================

async function getCreatorPosts(page, uid, creatorName) {

  console.log("");
  console.log(
    `📡 Requesting Square posts for ${creatorName}`
  );

  const apiURL =
    "https://www.binance.com/bapi/composite/v2/friendly/pgc/content/" +
    `queryUserProfilePageContentsWithFilter?` +
    `targetSquareUid=${encodeURIComponent(uid)}` +
    `&timeOffset=-1&filterType=ALL`;

  console.log(`🔗 ${apiURL}`);

  try {

    const result = await page.evaluate(async url => {

      const response = await fetch(
        url,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Accept": "application/json, text/plain, */*"
          }
        }
      );

      const text = await response.text();

      return {
        status: response.status,
        text
      };

    }, apiURL);

    console.log(
      `📡 CONTENT API STATUS: ${result.status}`
    );

    if (result.status !== 200) {

      console.log(
        `⚠️ Content API returned ${result.status}`
      );

      console.log(
        result.text.slice(0, 1000)
      );

      return null;
    }

    if (!result.text) {

      console.log(
        "⚠️ Empty content response"
      );

      return null;
    }

    console.log(
      `📦 CONTENT RESPONSE: ${result.text.length} bytes`
    );

    let data;

    try {
      data = JSON.parse(result.text);
    } catch (error) {

      console.log(
        `⚠️ JSON parse failed: ${error.message}`
      );

      console.log(
        result.text.slice(0, 2000)
      );

      return null;
    }

    console.log("");
    console.log("✅ CONTENT API JSON RECEIVED");

    const postArrays = findPostArrays(data);

    console.log(
      `📊 POSSIBLE POST ARRAYS FOUND: ${postArrays.length}`
    );

    let posts = [];

    for (const array of postArrays) {

      for (const post of array) {

        const text = extractPostText(post);

        if (text) {
          posts.push({
            text,
            raw: post
          });
        }
      }
    }

    // Remove duplicates.
    const unique = [];
    const seen = new Set();

    for (const post of posts) {

      const key = post.text.trim();

      if (!seen.has(key)) {

        seen.add(key);
        unique.push(post);
      }
    }

    console.log(
      `📝 POSTS EXTRACTED: ${unique.length}`
    );

    // Print first few posts for diagnostic.
    unique.slice(0, 5).forEach((post, index) => {

      console.log("");
      console.log(
        `---------- POST ${index + 1} ----------`
      );

      console.log(
        post.text.slice(0, 1500)
      );

      console.log(
        "-----------------------------------"
      );
    });

    return unique;

  } catch (error) {

    console.log(
      `❌ Content API error: ${error.message}`
    );

    return null;
  }
}

// ==================================================
// MAIN MONITOR
// ==================================================

async function startMonitor() {

  console.log("");
  console.log("==========================================");
  console.log("🔧 STARTING BINANCE SQUARE MONITOR");
  console.log("==========================================");

  await sendTelegram(
    "🔧 Binance Square monitor started\n\n" +
    `👥 Monitoring ${CREATORS.length} creators\n` +
    "🌐 Binance Square connection test running..."
  );

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
  // LIGHTWEIGHT NETWORK LOG
  // ==================================================

  page.on("response", async response => {

    const url = response.url();

    if (
      url.includes(
        "queryUserProfilePageContentsWithFilter"
      )
    ) {

      console.log("");
      console.log(
        "🎯 BINANCE CONTENT ENDPOINT DETECTED"
      );

      console.log(
        `STATUS: ${response.status()}`
      );

      console.log(
        `URL: ${url}`
      );
    }

  });

  page.on("pageerror", error => {

    console.log(
      `⚠️ PAGE ERROR: ${error.message}`
    );

  });

  // ==================================================
  // PROCESS CREATORS
  // ==================================================

  for (let i = 0; i < CREATORS.length; i++) {

    const creator = CREATORS[i];

    console.log("");
    console.log("");
    console.log("==========================================");
    console.log(
      `👤 CREATOR ${i + 1}/${CREATORS.length}`
    );
    console.log(
      `👤 ${creator.name}`
    );
    console.log("==========================================");

    try {

      const uid =
        await getCreatorUID(
          page,
          creator
        );

      if (!uid) {

        console.log(
          `❌ SKIPPING ${creator.name} - UID unavailable`
        );

        continue;
      }

      console.log(
        `🎯 Creator UID: ${uid}`
      );

      const posts =
        await getCreatorPosts(
          page,
          uid,
          creator.name
        );

      if (!posts) {

        console.log(
          `⚠️ No usable posts response for ${creator.name}`
        );

        continue;
      }

      console.log("");
      console.log(
        `✅ ${creator.name}: ${posts.length} posts detected`
      );

    } catch (error) {

      console.log(
        `❌ Creator error: ${error.message}`
      );
    }

    // Small delay between creators.
    await page.waitForTimeout(3000);
  }

  // ==================================================
  // TEST COMPLETE
  // ==================================================

  console.log("");
  console.log("==========================================");
  console.log("🏁 INITIAL TEST COMPLETE");
  console.log("==========================================");

  await sendTelegram(
    "✅ Binance Square monitor test completed\n\n" +
    "The system successfully tested the creator profiles.\n\n" +
    "Check Render logs for:\n" +
    "🎯 UID FOUND\n" +
    "📡 CONTENT API STATUS\n" +
    "📝 POSTS EXTRACTED"
  );

  console.log("");
  console.log(
    "💓 Keeping service alive..."
  );

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
