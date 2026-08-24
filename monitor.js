const http = require("http");

const PORT = Number(process.env.PORT || 10000);

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });
  res.end("Binance API diagnostic is running");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Server running on port ${PORT}`);
});


async function testBinance() {

  console.log("");
  console.log("==========================================");
  console.log("🔍 BINANCE SQUARE API DIAGNOSTIC");
  console.log("==========================================");


  const url =
    "https://www.binance.com/bapi/composite/v4/friendly/pgc/feed/news/list" +
    "?pageIndex=1&pageSize=20";


  console.log(`🌐 URL: ${url}`);


  try {

    const response = await fetch(url, {

      method: "GET",

      headers: {

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
      },

      signal:
        AbortSignal.timeout(15000)
    });


    console.log("");
    console.log(
      `📡 HTTP STATUS: ${response.status}`
    );


    const text =
      await response.text();


    console.log("");
    console.log(
      `📦 RESPONSE LENGTH: ${text.length} characters`
    );


    console.log("");
    console.log("==========================================");
    console.log("📄 RAW BINANCE RESPONSE");
    console.log("==========================================");


    // Print the first 10000 characters.
    // This is only for diagnosis.

    console.log(
      text.substring(0, 10000)
    );


    console.log("");
    console.log("==========================================");
    console.log("🔎 TRYING JSON PARSE");
    console.log("==========================================");


    try {

      const json =
        JSON.parse(text);


      console.log(
        "✅ JSON PARSE SUCCESS"
      );


      console.log("");
      console.log(
        "TOP LEVEL KEYS:"
      );


      console.log(
        Object.keys(json)
      );


      if (json.data) {

        console.log("");
        console.log(
          "DATA TYPE:"
        );

        console.log(
          typeof json.data
        );


        if (
          typeof json.data === "object"
        ) {

          console.log(
            "DATA KEYS:"
          );

          console.log(
            Object.keys(json.data)
          );

        }

      }


      console.log("");
      console.log(
        "=========================================="
      );

      console.log(
        "FULL JSON STRUCTURE"
      );

      console.log(
        "=========================================="
      );


      console.log(
        JSON.stringify(
          json,
          null,
          2
        ).substring(0, 15000)
      );


    } catch (error) {

      console.log(
        "❌ JSON PARSE FAILED:",
        error.message
      );

    }


  } catch (error) {

    console.log(
      "❌ REQUEST ERROR:",
      error.message
    );

  }


  console.log("");
  console.log(
    "=========================================="
  );

  console.log(
    "🏁 DIAGNOSTIC COMPLETE"
  );

  console.log(
    "=========================================="
  );
}


testBinance();
