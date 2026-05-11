import puppeteer from "puppeteer";

export const handleInstagram = async (url: string) => {
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

    // Hide webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // allow React hydration
    await new Promise((r) => setTimeout(r, 8000));

    const finalUrl = page.url().toLowerCase();

    const result = await page.evaluate((finalUrl) => {
      const text = document.body?.innerText?.toLowerCase() || "";

      const isDead =
        text.includes("sorry, this page isn't available") ||
        text.includes("post isn't available") ||
        text.includes("user not found") ||
        text.includes("link you followed may be broken");

      if (isDead) {
        return {
          status: 404,
          message: "Not Found",
        };
      }

      const isBlocked =
        text.includes("help us confirm") ||
        text.includes("suspicious activity") ||
        text.includes("temporarily blocked");

      if (isBlocked) {
        return {
          status: 403,
          message: "Blocked",
        };
      }

      if (finalUrl.includes("/accounts/login")) {
        return {
          status: 200,
          message: "Working (Login Protected)",
        };
      }

      const hasArticle = !!document.querySelector("article");

      const hasMedia =
        document.querySelectorAll("img").length > 2 ||
        document.querySelectorAll("video").length > 0;

      const hasButtons =
        !!document.querySelector('svg[aria-label="Like"]') ||
        !!document.querySelector('svg[aria-label="Comment"]');

      if (hasArticle || hasMedia || hasButtons) {
        return {
          status: 200,
          message: "Working",
        };
      }
      return {
        status: 200,
        message: "Working (Weak Detection)",
      };
    }, finalUrl);

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
