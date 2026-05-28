import puppeteer from "puppeteer";

export const checkWithBrowser = async (url: string) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((r) => setTimeout(r, 5000));

    const text = await page.evaluate(() => {
      return document.body?.innerText || "";
    });

    const lower = text.toLowerCase();

    const blockedPatterns = [
      "this page isn't available",
      "this content isn't available",
      "content isn't available",
      "page isn't available",
      "not available right now",
      "may have been removed",
      "link you followed may be broken",
      "item is no longer available",
      "listing not found",
      "video unavailable",
    ];

    const isBlocked = blockedPatterns.some((p) => lower.includes(p));

    //empty page
    const isEmpty = lower.trim().length < 50;

    const finalBlocked = isBlocked || isEmpty;

    return {
      url,
      status: finalBlocked ? 404 : 200,
      message: finalBlocked ? "Not Available" : "Still Active",
    };
  } catch (err) {
    return {
      url,
      status: 500,
      message: "Browser Error",
    };
  } finally {
    if (browser) await browser.close();
  }
};
