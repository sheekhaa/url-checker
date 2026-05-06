import puppeteer from "puppeteer";

export const isFacebookUrl = (url: string): boolean => {
  return url.toLowerCase().includes("facebook.com");
};

export const handleFacebook = async (url: string) => {
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
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 5000));

    const text = (await page.content()).toLowerCase();

    // DEAD PAGE
    const isDead =
      text.includes("content isn't available") ||
      text.includes("page isn't available") ||
      text.includes("sorry, something went wrong") ||
      text.includes("this page isn't available") ||
      text.includes("this content isn't available right now");

    if (isDead) {
      return { url, status: 404, message: "Not Found (Facebook Dead)" };
    }

    // LOGIN WALL
    const loginWall =
      text.includes("log in to continue") || text.includes("you must log in");

    if (loginWall) {
      return { url, status: 403, message: "Not found" };
    }

    return { url, status: 200, message: "Working" };
  } catch (err) {
    return { url, status: 500, message: "Browser Error" };
  } finally {
    if (browser) await browser.close();
  }
};
