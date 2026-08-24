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

const CHECK_INTERVAL = 30000;
const RENDER_WAIT = 8000;

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
// FIND POSTS ON PROFILE
// ==========================================

async function getLatestPost(handle) {

  const page = await context.newPage();

  try {

    const profileUrl =
      `https://www.binance.com/en/square/profile/${handle}`;

    console.log("");
    console.log(`🔎 Checking ${handle}`);
    console.log(`🌐 ${profileUrl}`);

    await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    console.log(
      `⏳ Waiting ${RENDER_WAIT / 1000}s for Binance Square...`
    );

    await page.waitForTimeout(RENDER_WAIT);


    // Scroll down slightly to force the Posts section
    // to render if it is lazy-loaded.
    await page.evaluate(() => {
      window.scrollTo(0, 700);
    });

    await page.waitForTimeout(3000);


    const result = await page.evaluate(() => {

      const links = Array.from(
        document.querySelectorAll("a[href]")
      );

      const postLinks = links
        .map(link => ({
          href: link.href,
          text: link.innerText || "",
          aria: link.getAttribute("aria-label") || ""
        }))
        .filter(item =>
          /\/square\/post\//i.test(item.href)
        );


      // Remove duplicates.
      const unique = [];

      const seen = new Set();

      for (const item of postLinks) {

        if (!seen.has(item.href)) {
          seen.add(item.href);
          unique.push(item);
        }
      }


      return {
        postLinks: unique.slice(0, 10),
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 2000)
      };
    });


    console.log(
      `📄 Page title: ${result.title}`
    );

    console.log(
      `🔗 Post links found: ${result.postLinks.length}`
    );


    if (!result.postLinks.length) {

      console.log(
        `⚠️ ${handle}: no post links found after rendering`
      );

      console.log(
        `📄 Page URL: ${result.url}`
      );

      console.log(
        `📝 Page text preview:`
      );

      console.log(
        result.bodyText.substring(0, 500)
      );

      return null;
    }


    const newest = result.postLinks[0];


    const match =
      newest.href.match(
        /\/square\/post\/([^/?#]+)/i
      );


    if (!match) {

      console.log(
        `⚠️ ${handle}: couldn't extract post ID`
      );

      return null;
    }


    const postId = match[1];


    // Open the actual post so we can get
    // the full visible text.
    const postPage =
      await context.newPage();

    try {

      await postPage.goto(
        newest.href,
        {
          waitUntil: "domcontentloaded",
          timeout: 45000
        }
      );

      await postPage.waitForTimeout(5000);


      const postText =
        await postPage.evaluate(() => {

          return document.body.innerText || "";
        });


      return {
        id: postId,
        url: newest.href,
        text: postText.substring(0, 5000)
      };

    } finally {

      await postPage.close();
    }

  } catch (error) {

    console.log(
      `❌ ${handle}: ${error.message}`
    );

    return null;

  } finally {

    await page.close();
  }
}


// ==========================================
// PROCESS CREATOR
// ==========================================

async function processCreator(handle) {

  const post =
    await getLatestPost(handle);


  if (!post) {
