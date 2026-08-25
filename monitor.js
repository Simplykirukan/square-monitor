const { chromium } = require("playwright");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = process.env.PORT || 10000;

// =====================================================
// 10 BINANCE SQUARE CREATORS
// =====================================================

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

// =====================================================
// STATE
// =====================================================

const seenPosts = new Set();

// =====================================================
// TELEGRAM
// =====================================================

async function sendTelegram(message) {

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("❌ Telegram environment variables missing");
        return;
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

        const data = await response.json();

        if (data.ok) {
            console.log("✅ Telegram message sent");
        } else {
            console.log("❌ Telegram error:", JSON.stringify(data));
        }

    } catch (error) {

        console.log("❌ Telegram request failed:", error.message);

    }
}

// =====================================================
// HEALTH SERVER
// =====================================================

const http = require("http");

const server = http.createServer((req, res) => {

    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("BINANCE SQUARE MONITOR ACTIVE");

});

server.listen(PORT, "0.0.0.0", () => {

    console.log(`🌐 Health server running on port ${PORT}`);

});

// =====================================================
// FIND CREATOR
// =====================================================

function creatorMatches(post) {

    if (!post) return false;

    const possibleNames = [

        post.username,
        post.authorName,
        post.authorUsername,
        post.nickname,
        post.handle,
        post.creatorName,
        post.userName

    ]
        .filter(Boolean)
        .map(x => String(x).toLowerCase());

    return CREATORS.some(
        creator =>
            possibleNames.includes(creator.toLowerCase())
    );
}

// =====================================================
// GET CREATOR NAME
// =====================================================

function getCreatorName(post) {

    return (
        post.username ||
        post.authorName ||
        post.authorUsername ||
        post.nickname ||
        post.handle ||
        post.creatorName ||
        post.userName ||
        "Unknown Creator"
    );

}

// =====================================================
// GET POST CONTENT
// =====================================================

function getPostText(post) {

    return (
        post.content ||
        post.body ||
        post.title ||
        post.subTitle ||
        post.text ||
        ""
    );

}

// =====================================================
// GET POST ID
// =====================================================

function getPostId(post) {

    return String(
        post.id ||
        post.postId ||
        post.feedId ||
        post.articleId ||
        ""
    );

}

// =====================================================
// GET POST URL
// =====================================================

function getPostUrl(post) {

    if (post.webLink) {
        return post.webLink;
    }

    const id = getPostId(post);

    if (id) {
        return `https://www.binance.com/en/square/post/${id}`;
    }

    return "https://www.binance.com/en/square";

}

// =====================================================
// RED PACKET DETECTOR
// =====================================================

function isRedPacket(text) {

    const keywords = [
        "packet",
        "red packet",
        "redpack",
        "crypto box",
        "box code",
        "claim",
        "code",
        "🧧"
    ];

    const lower = text.toLowerCase();

    return keywords.some(word =>
        lower.includes(word.toLowerCase())
    );

}

// =====================================================
// SEND POST TO TELEGRAM
// =====================================================

async function sendPostToTelegram(post) {

    const creator = getCreatorName(post);
    const text = getPostText(post);
    const url = getPostUrl(post);

    let message;

    if (isRedPacket(text)) {

        message =
            `🧧 <b>RED PACKET ALERT!</b>\n\n` +
            `👤 <b>${creator}</b>\n\n` +
            `${escapeHtml(text).substring(0, 3000)}\n\n` +
            `⚡ <a href="${url}">OPEN IN BINANCE</a>`;

    } else {

        message =
            `📢 <b>NEW BINANCE SQUARE POST</b>\n\n` +
            `👤 <b>${creator}</b>\n\n` +
            `${escapeHtml(text).substring(0, 3000)}\n\n` +
            `⚡ <a href="${url}">OPEN IN BINANCE</a>`;

    }

    await sendTelegram(message);

}

// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(text) {

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

// =====================================================
// EXTRACT POSTS FROM PAGE
// =====================================================

async function extractPosts(page) {

    return await page.evaluate(() => {

        const result = [];

        function walk(value) {

            if (!value || typeof value !== "object") {
                return;
            }

            if (Array.isArray(value)) {

                for (const item of value) {
                    walk(item);
                }

                return;
            }

            // Detect Binance Square post objects
            if (
                value.id &&
                (
                    value.webLink ||
                    value.shareLink ||
                    value.authorName ||
                    value.username ||
                    value.squareAuthorId
                )
            ) {

                result.push(value);

            }

            for (const key of Object.keys(value)) {

                try {
                    walk(value[key]);
                } catch (_) {}

            }

        }

        walk(window.__BINANCE_DATA__);

        return result;

    });

}

// =====================================================
// MAIN SCANNER
// =====================================================

async function startMonitor() {

    console.log("");
    console.log("==========================================");
    console.log("🚀 BINANCE SQUARE → TELEGRAM");
    console.log("==========================================");
    console.log("👥 10 CREATOR MONITOR");
    console.log("==========================================");

    CREATORS.forEach((creator, index) => {

        console.log(`${index + 1}. ${creator}`);

    });

    console.log("==========================================");

    await sendTelegram(
        "🚀 <b>Binance Square Monitor Started</b>\n\n" +
        "👥 Monitoring 10 creators..."
    );

    const browser = await chromium.launch({
    headless: true,
    channel: "chromium"
});

    const context = await browser.newContext({

        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/124.0.0.0 Safari/537.36",

        viewport: {
            width: 1366,
            height: 768
        },

        locale: "en-US"

    });

    const page = await context.newPage();

    // =================================================
    // CAPTURE BINANCE API RESPONSES
    // =================================================

    page.on("response", async response => {

        const url = response.url();

        if (!url.includes("binance.com")) {
            return;
        }

        if (
            !url.includes("/bapi/") &&
            !url.includes("/api/")
        ) {
            return;
        }

        try {

            const contentType =
                response.headers()["content-type"] || "";

            if (!contentType.includes("json")) {
                return;
            }

            const data = await response.json();

            // Store API response globally in browser
            await page.evaluate((data) => {

                window.__BINANCE_DATA__ = data;

            }, data);

            const posts = await extractPosts(page);

            if (!posts.length) {
                return;
            }

            console.log(
                `📦 Binance response contains ${posts.length} post objects`
            );

            // =================================================
            // CHECK POSTS
            // =================================================

            for (const post of posts) {

                const id = getPostId(post);

                if (!id) continue;

                // Only our 10 creators
                if (!creatorMatches(post)) {
                    continue;
                }

                const creator = getCreatorName(post);

                console.log(
                    `🎯 MATCH: ${creator} → ${id}`
                );

                // First time = register
                if (!seenPosts.has(id)) {

                    seenPosts.add(id);

                    console.log(
                        `🆕 NEW POST: ${creator} → ${id}`
                    );

                    await sendPostToTelegram(post);

                }

            }

        } catch (error) {

            // Ignore non-JSON / inaccessible responses

        }

    });

    // =================================================
    // OPEN BINANCE SQUARE
    // =================================================

    console.log("");
    console.log("🌐 Opening Binance Square...");

    try {

        await page.goto(
            "https://www.binance.com/en/square",
            {
                waitUntil: "domcontentloaded",
                timeout: 60000
            }
        );

    } catch (error) {

        console.log(
            "⚠️ Initial page navigation:",
            error.message
        );

    }

    // =================================================
    // CONTINUOUS SCAN
    // =================================================

    while (true) {

        console.log("");
        console.log("==========================================");
        console.log("🔎 SCANNING BINANCE SQUARE");
        console.log("==========================================");

        try {

            await page.reload({
                waitUntil: "domcontentloaded",
                timeout: 60000
            });

        } catch (error) {

            console.log(
                "⚠️ Reload error:",
                error.message
            );

        }

        // Give Binance time to load feed/API
        await page.waitForTimeout(10000);

        console.log(
            `📊 Known posts: ${seenPosts.size}`
        );

        console.log(
            "⏳ Waiting 15 seconds before next scan..."
        );

        await page.waitForTimeout(15000);

    }

}

// =====================================================
// START
// =====================================================

startMonitor().catch(error => {

    console.error("❌ FATAL ERROR");
    console.error(error);

    process.exit(1);

});
