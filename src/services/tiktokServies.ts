import puppeteer from "puppeteer";

export const handleTiktok = async (url: string) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() || "";

      const sigi = (window as any).SIGI_STATE;

      const deadTexts = [
        "video unavailable",
        "video currently unavailable",
        "this video is unavailable",
        "couldn't find this account",
        "page not available",
        "something went wrong",
        "sorry about that",
        "unable to load",
        "content unavailable",
        "this page is not available",
      ];

      const hasDeadText = deadTexts.some((t) => text.includes(t));

      if (hasDeadText) {
        return {
          status: 404,
          message: "Not Found",
        };
      }

      try {
        if (sigi?.ItemModule) {
          const keys = Object.keys(sigi.ItemModule);

          if (keys.length > 0) {
            const item = sigi.ItemModule[keys[0]];

            if (item?.statusCode === 10204 || item?.statusCode === 10222) {
              return {
                status: 404,
                message: "Video Removed",
              };
            }

            // valid item found
            return {
              status: 200,
              message: "Still Active",
            };
          }
        }
      } catch {}

      const hasVideo =
        !!document.querySelector("video") ||
        !!document.querySelector('[data-e2e="video-player"]');

      if (hasVideo) {
        return {
          status: 200,
          message: "Still Active",
        };
      }

      const loginWall = text.includes("log in") || text.includes("sign up");

      if (loginWall && !hasVideo) {
        return {
          status: 404,
          message: "Unavailable",
        };
      }

      return {
        status: 404,
        message: "Not Found",
      };
    });

    return {
      url,
      ...result,
    };
  } catch (err) {
    return {
      url,
      status: 500,
      message: "Browser Error",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
