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
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 8000));

    const result = await page.evaluate(() => {
      const text = document.body?.innerText?.toLowerCase() || "";

      const sigi = (window as any).SIGI_STATE;
      const isDeadText =
        text.includes("video unavailable") ||
        text.includes("this video is unavailable") ||
        text.includes("couldn't find this account") ||
        text.includes("page not available");
      text.includes("Something went wrong") ||
        text.includes("Sorry about that! Please try again later");
      if (isDeadText) {
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
          }
        }
      } catch {}

      const hasVideo =
        !!document.querySelector("video") ||
        !!document.querySelector('[data-e2e="video-player"]');

      const hasImages = document.querySelectorAll("img").length > 3;

      const hasMeta =
        !!document.querySelector('meta[property="og:url"]') ||
        !!document.querySelector('meta[property="og:title"]');

      const hasContent = hasVideo || hasImages || hasMeta;

      const loginWall =
        (text.includes("log in") || text.includes("sign up")) && !hasContent;

      if (loginWall && !hasMeta) {
        return {
          status: 404,
          message: "Working",
        };
      }

      if (!hasContent) {
        return {
          status: 200,
          message: "Working",
        };
      }

      return {
        status: 200,
        message: "Working",
      };
    });

    return { url, ...result };
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
