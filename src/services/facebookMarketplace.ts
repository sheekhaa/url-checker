import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleFacebookMarketplace = async (url: string) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    );

    await page.setViewport({
      width: 1366,
      height: 768,
    });

    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 8000));

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await new Promise((r) => setTimeout(r, 1500));
    }

    const currentUrl = page.url();

    const text = await page.evaluate(() => {
      return (
        (document.body?.innerText || "") +
        " " +
        (document.documentElement?.innerHTML || "")
      )
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
    });

    const deadPatterns = [
      "this listing isn't available anymore",
      "listing isn't available anymore",
      "item isn't available anymore",
      "item no longer available",
      "this item is no longer available",
      "it may have been sold or expired",
      "may have been sold or expired",
      "take a look at these other items",
      "browse similar items",
      "listing expired",
      "listing removed",
      "listing deleted",
      "seller removed this listing",
      "product unavailable",
      "marketplace listing unavailable",
    ];

    const isDead = deadPatterns.some((p) => text.includes(p));

    if (isDead) {
      return {
        url,
        status: 404,
        message: "Listing Removed",
      };
    }
    if (currentUrl.includes("/login")) {
      return {
        url,
        status: 404,
        message: "Not Found",
      };
    }
    if (text.length < 50) {
      return {
        url,
        status: 403,
        message: "Blocked",
      };
    }

    return {
      url,
      status: 200,
      message: "Still Active",
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
