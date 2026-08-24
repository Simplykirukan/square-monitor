const http = require("http");

// ============================================================
// BINANCE SQUARE -> TELEGRAM
// DIRECT FEED VERSION
// NO PLAYWRIGHT
// ============================================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const PORT = Number(process.env.PORT || 10000);

// Check every 30 seconds
const CHECK_INTERVAL = 30000;

// Number of feed pages to scan.
// 20 posts per page.
const PAGES_TO_SCAN = 10;

// Your 10 creators
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

// Store latest post ID for every creator
const lastSeen = new Map();


// ============================================================
// RENDER HEALTH SERVER
// ============================================================

const server = http.createServer((req, res) => {

  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end(
    "Binance Square Telegram monitor is running"
  );
});

server.listen(PORT, "0.0.0.0", () => {

  console.log(
    `🌐 Health server listening on port ${PORT}`,
    );
});


// ============================================================
// TELEGRAM
// ============================================================

async function sendTelegram(message) {

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

    const url =
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        chat_id: TELEGRAM_CHAT_ID,

        text: message,

        parse_mode: "HTML",

        disable_web_page_preview: false

      })

    });


    const result =
      await response.json();


    console.log(
      `📡 Telegram status: ${response.status}`
    );


    if (!result.ok) {

      console.log(
        "❌ Telegram error:",
        JSON.stringify(result)
      );

      return false;
    }


    console.log(
      "✅ Telegram message sent"
    );

    return true;

  } catch (error) {

    console.log(
      "❌ Telegram error:",
      error.message
    );

    return false;
  }
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// NORMALIZE CREATOR NAME
// ============================================================

function normalizeName(name) {

  return String(name || "")
    .trim()
    .toLowerCase();

}


// ============================================================
// GET ARRAY FROM BINANCE RESPONSE
// ============================================================

function extractPosts(json) {

  if (!json) {
    return [];
  }


  // Most common structures
  if (Array.isArray(json)) {
    return json;
  }


  if (json.data) {

    if (Array.isArray(json.data)) {
      return json.data;
    }


    if (Array.isArray(json.data.list)) {
      return json.data.list;
    }


    if (Array.isArray(json.data.items)) {
      return json.data.items;
    }


    if (Array.isArray(json.data.records)) {
      return json.data.records;
    }


    if (Array.isArray(json.data.rows)) {
      return json.data.rows;
    }

  }


  if (Array.isArray(json.list)) {
    return json.list;
  }


  if (Array.isArray(json.items)) {
    return json.items;
  }


  return [];
}


// ============================================================
// FETCH ONE FEED PAGE
// ============================================================

async function fetchFeedPage(pageIndex) {

  const url =
    "https://www.binance.com/bapi/composite/v4/friendly/pgc/feed/news/list" +
    `?pageIndex=${pageIndex}&pageSize=20`;


  const headers = {

    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36",

    "Accept":
      "application/json,text/plain,*/*",

    "Accept-Language":
      "en-US,en;q=0.9",

    "Referer":
      "https://www.binance.com/en/square/trending",

    "Origin":
      "https://www.binance.com",

    "clienttype":
      "web",

    "lang":
      "en"

  };


  try {

    const response =
      await fetch(url, {

        method: "GET",

        headers: headers,

        signal:
          AbortSignal.timeout(15000)

      });


    console.log(
      `📡 Feed page ${pageIndex}: HTTP ${response.status}`
    );


    const text =
      await response.text();


    if (!response.ok) {

      console.log(
        `⚠️ Binance returned ${response.status}`
      );

      console.log(
        text.substring(0, 500)
      );

      return [];
    }


    let json;

    try {

      json =
        JSON.parse(text);

    } catch (error) {

      console.log(
        "❌ Response was not JSON"
      );

      console.log(
        text.substring(0, 500)
      );

      return [];
    }


    const posts =
      extractPosts(json);


    console.log(
      `📦 Page ${pageIndex}: ${posts.length} posts`
    );


    return posts;

  } catch (error) {

    console.log(
      `❌ Feed request error page ${pageIndex}:`,
      error.message
    );

    return [];
  }
}


// ============================================================
// FIND CREATOR IN POST
// ============================================================

function getAuthorName(post) {

  return (
    post.authorName ||
    post.author ||
    post.userName ||
    post.username ||
    post.creatorName ||
    post.handle ||
    post.nickName ||
    post.authorNickname ||
    ""
  );
}


// ============================================================
// GET POST ID
// ============================================================

function getPostId(post) {

  return String(
    post.id ||
    post.postId ||
    post.feedId ||
    post.contentId ||
    ""
  );
}


// ============================================================
// GET POST TEXT
// ============================================================

function getPostText(post) {

  return (
    post.content ||
    post.body ||
    post.bodyText ||
    post.title ||
    post.text ||
    ""
  );
}


// ============================================================
// GET POST URL
// ============================================================

function getPostUrl(post, postId) {

  if (post.webLink) {
    return post.webLink;
  }

  if (post.url) {
    return post.url;
  }

  if (post.link) {
    return post.link;
  }

  if (postId) {

    return (
      `https://www.binance.com/en/square/post/${postId}`
    );
  }

  return "https://www.binance.com/en/square";
}


// ============================================================
// SCAN ALL PAGES
// ============================================================

async function scanFeed() {

  console.log("");
  console.log(
    "=============================================="
  );

  console.log(
    "🔍 SCANNING BINANCE SQUARE DIRECT FEED"
  );

  console.log(
    "=============================================="
  );


  const allPosts = [];


  for (
    let page = 1;
    page <= PAGES_TO_SCAN;
    page++
  ) {

    const posts =
      await fetchFeedPage(page);


    if (posts.length === 0) {

      console.log(
        `⚠️ Page ${page} empty`
      );

      // Don't immediately stop.
      // Continue in case Binance skips a page.

    }


    allPosts.push(
      ...posts
    );


    // Small delay between pages

    if (page < PAGES_TO_SCAN) {

      await new Promise(
        resolve =>
          setTimeout(resolve, 700)
      );
    }
  }


  console.log(
    `📊 TOTAL POSTS RECEIVED: ${allPosts.length}`
  );


  return allPosts;
}


// ============================================================
// PROCESS POSTS
// ============================================================

async function processPosts(posts) {

  let matched = 0;


  for (const creator of CREATORS) {

    const target =
      normalizeName(creator);


    // Find posts belonging to this creator

    const creatorPosts =
      posts.filter(post => {

        const author =
          normalizeName(
            getAuthorName(post)
          );

        return author === target;

      });


    console.log(
      `👤 ${creator}: ${creatorPosts.length} matching posts`
    );


    if (creatorPosts.length === 0) {

      continue;
    }


    matched +=
      creatorPosts.length;


    // Newest is normally first.
    // Sort by date when available.

    creatorPosts.sort(
      (a, b) => {

        const dateA =
          Number(
            a.date ||
            a.createTime ||
            a.createdAt ||
            a.publishTime ||
            0
          );

        const dateB =
          Number(
            b.date ||
            b.createTime ||
            b.createdAt ||
            b.publishTime ||
            0
          );

        return dateB - dateA;
      }
    );


    const newest =
      creatorPosts[0];


    const postId =
      getPostId(newest);


    if (!postId) {

      console.log(
        `⚠️ ${creator}: post has no ID`
      );

      continue;
    }


    const previous =
      lastSeen.get(creator);


    // ----------------------------------------
    // FIRST TIME SEEN
    // ----------------------------------------

    if (!previous) {

      lastSeen.set(
        creator,
        postId
      );


      console.log(
        `🟢 ${creator}: initial post registered ${postId}`
      );

      continue;
    }


    // ----------------------------------------
    // SAME POST
    // ----------------------------------------

    if (previous === postId) {

      console.log(
        `✓ ${creator}: no new post`
      );

      continue;
    }


    // ----------------------------------------
    // NEW POST
    // ----------------------------------------

    console.log("");
    console.log(
      "🔥🔥🔥 NEW POST DETECTED 🔥🔥🔥"
    );

    console.log(
      `👤 Creator: ${creator}`
    );

    console.log(
      `🆔 Post ID: ${postId}`
    );


    const content =
      getPostText(newest);


    const postUrl =
      getPostUrl(
        newest,
        postId
      );


    console.log(
      `🔗 ${postUrl}`
    );


    lastSeen.set(
      creator,
      postId
    );


    const lower =
      content.toLowerCase();


    const keywords = [

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
      keywords.some(
        word =>
          lower.includes(word)
      );


    const alertTitle =
      isPacket
        ? "🧧 <b>RED PACKET ALERT!</b>"
        : "📢 <b>NEW BINANCE SQUARE POST</b>";


    const message =
      `${alertTitle}\n\n` +
      `👤 <b>${escapeHtml(creator)}</b>\n\n` +
      `${escapeHtml(
        content.substring(0, 3000)
      )}\n\n` +
      `⚡ <a href="${escapeHtml(postUrl)}">OPEN IN BINANCE</a>`;


    await sendTelegram(
      message
    );
  }


  console.log(
    `🎯 Matching posts found: ${matched}`
  );
}


// ============================================================
// MAIN SCAN
// ============================================================

async function runScan() {

  try {

    const posts =
      await scanFeed();


    if (posts.length > 0) {

      await processPosts(
        posts
      );

    } else {

      console.log(
        "⚠️ No posts received from Binance feed"
      );
    }


  } catch (error) {

    console.log(
      "❌ Scan error:",
      error.message
    );
  }
}


// ============================================================
// START
// ============================================================

async function start() {

  console.log("");
  console.log(
    "=============================================="
  );

  console.log(
    "🚀 BINANCE SQUARE → TELEGRAM"
  );

  console.log(
    "🚀 DIRECT FEED MONITOR"
  );

  console.log(
    "🚫 NO PLAYWRIGHT"
  );

  console.log(
    "=============================================="
  );


  console.log(
    `👥 Monitoring ${CREATORS.length} creators`
  );


  CREATORS.forEach(
    (creator, index) => {

      console.log(
        `${index + 1}. ${creator}`
      );
    }
  );


  console.log(
    "=============================================="
  );


  // First scan

  await runScan();


  // Tell Telegram

  await sendTelegram(
    "🟢 <b>Binance Square Monitor Online</b>\n\n" +
    "Direct feed monitor started.\n" +
    "10 creators are being monitored."
  );


  // Continuous monitoring

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
      "🔄 NEXT SCAN"
    );


    await runScan();
  }
}


// ============================================================
// SHUTDOWN
// ============================================================

function shutdown() {

  console.log(
    "🛑 Shutting down..."
  );


  server.close(
    () => {
      process.exit(0);
    }
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


// ============================================================
// RUN
// ============================================================

start().catch(
  error => {

    console.error(
      "💥 FATAL ERROR:",
      error
    );

    process.exit(1);
  }
);
