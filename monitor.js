const { chromium } = require("playwright");
const http = require("http");

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

// --------------------------------------------------
// HEALTH SERVER
// --------------------------------------------------

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });

    res.end("BINANCE SQUARE DIAGNOSTIC RUNNING");
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Health server running on port ${PORT}`);
});

// --------------------------------------------------
// TELEGRAM TEST
// --------------------------------------------------

async function telegramTest() {

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log("⚠️ Telegram variables not found");
        return;
    }

    try {

        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: "🔧 Binance Square diagnostic monitor started."
                })
            }
        );

        const data = await response.json();

        console.log(
            data.ok
                ? "✅ Telegram test successful"
                : "❌ Telegram test failed"
        );

    } catch (error) {

        console.log(
            "❌ Telegram error:",
            error.message
        );

    }
}

// --------------------------------------------------
// MAIN
// --------------------------------------------------

async function main() {

    console.log("");
    console.log("==========================================");
    console.log("🔧 BINANCE SQUARE API DIAGNOSTIC");
    console.log("==========================================");

    console.log("");
    console.log("👥 Creators we need to identify:");

    CREATORS.forEach((name, index) => {
        console.log(`${index + 1}. ${name}`);
    });

    console.log("");
    console.log("==========================================");

    await telegramTest();

    console.log("");
    console.log("🌐 Starting Chromium...");

    const browser = await chromium.launch({
        headless: true
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

    // --------------------------------------------------
    // NETWORK RESPONSE LISTENER
    // --------------------------------------------------

    page.on("response", async (response) => {

        const url = response.url();

        if (!url.includes("binance.com")) {
            return;
        }

        // We are interested in Binance API calls.
        if (
            !url.includes("/bapi/") &&
            !url.includes("/api/")
        ) {
            return;
        }

        console.log("");
        console.log("==========================================");
        console.log("📡 BINANCE API RESPONSE");
        console.log("==========================================");

        console.log(
            "URL:",
            url.substring(0, 500)
        );

        console.log(
            "STATUS:",
            response.status()
        );

        try {

            const contentType =
                response.headers()["content-type"] || "";

            console.log(
                "CONTENT TYPE:",
                contentType
            );

            if (!contentType.includes("json")) {
                console.log(
                    "⏭️ Not JSON - skipped"
                );
                return;
            }

            const data = await response.json();

            console.log(
                "✅ JSON RECEIVED"
            );

            // --------------------------------------------------
            // FIND POST OBJECTS RECURSIVELY
            // --------------------------------------------------

            const posts = [];

            function scan(value) {

                if (!value) {
                    return;
                }

                if (Array.isArray(value)) {

                    for (const item of value) {
                        scan(item);
                    }

                    return;
                }

                if (
                    typeof value !== "object"
                ) {
                    return;
                }

                // A likely Square post
                if (
                    value.id &&
                    (
                        value.webLink ||
                        value.shareLink ||
                        value.authorName ||
                        value.squareAuthorId
                    )
                ) {

                    posts.push(value);
                }

                for (const key of Object.keys(value)) {

                    try {
                        scan(value[key]);
                    } catch (_) {}

                }
            }

            scan(data);

            console.log(
                `📦 POST OBJECTS FOUND: ${posts.length}`
            );

            // --------------------------------------------------
            // PRINT FIRST 10 UNIQUE POSTS
            // --------------------------------------------------

            const printed = new Set();

            let count = 0;

            for (const post of posts) {

                const id = String(
                    post.id || ""
                );

                if (!id || printed.has(id)) {
                    continue;
                }

                printed.add(id);

                console.log("");
                console.log(
                    `--------- POST ${count + 1} ---------`
                );

                console.log(
                    "ID:",
                    post.id || "N/A"
                );

                console.log(
                    "AUTHOR NAME:",
                    post.authorName || "N/A"
                );

                console.log(
                    "USERNAME:",
                    post.username || "N/A"
                );

                console.log(
                    "AUTHOR USERNAME:",
                    post.authorUsername || "N/A"
                );

                console.log(
                    "NICKNAME:",
                    post.nickname || "N/A"
                );

                console.log(
                    "HANDLE:",
                    post.handle || "N/A"
                );

                console.log(
                    "CREATOR NAME:",
                    post.creatorName || "N/A"
                );

                console.log(
                    "SQUARE AUTHOR ID:",
                    post.squareAuthorId || "N/A"
                );

                console.log(
                    "AUTHOR LINK:",
                    post.authorLink || "N/A"
                );

                console.log(
                    "WEB LINK:",
                    post.webLink || "N/A"
                );

                console.log(
                    "SHARE LINK:",
                    post.shareLink || "N/A"
                );

                console.log(
                    "TITLE:",
                    post.title || "N/A"
                );

                console.log(
                    "CONTENT:",
                    String(
                        post.content ||
                        post.body ||
                        post.subTitle ||
                        ""
                    ).substring(0, 300)
                );

                count++;

                if (count >= 10) {
                    break;
                }
            }

        } catch (error) {

            console.log(
                "❌ Could not read response:",
                error.message
            );

        }

    });

    // --------------------------------------------------
    // OPEN BINANCE SQUARE
    // --------------------------------------------------

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

        console.log(
            "✅ Binance Square page loaded"
        );

    } catch (error) {

        console.log(
            "❌ Page error:",
            error.message
        );

    }

    // --------------------------------------------------
    // KEEP PAGE ALIVE
    // --------------------------------------------------

    while (true) {

        console.log("");
        console.log(
            "⏳ Waiting for Binance API responses..."
        );

        await page.waitForTimeout(30000);

        console.log(
            "🔄 Reloading Binance Square..."
        );

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

    }

}

main().catch(error => {

    console.log("");
    console.log("❌ FATAL ERROR");
    console.log(error);

    process.exit(1);

});
