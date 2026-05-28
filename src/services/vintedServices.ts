import puppeteer from "puppeteer";

interface Result {
  url: string;
  status: number;
  message: string;
}

export const handleVinted = async (url: string): Promise<Result> => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 4000));

    const text = await page.evaluate(() => {
      return document.body?.innerText.toLowerCase() || "";
    });

    const isDead =
      text.includes("item is no longer available") ||
      text.includes("listing not found") ||
      text.includes("this item is no longer available");

    if (isDead) {
      return {
        url,
        status: 404,
        message: "Not Found",
      };
    }

    const loginWall =
      text.includes("sign in") ||
      text.includes("log in") ||
      text.includes("you need to be logged in");

    if (loginWall) {
      return {
        url,
        status: 403,
        message: "Not Found",
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
    if (browser) await browser.close();
  }
};
