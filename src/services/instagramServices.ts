import puppeteer from "puppeteer";

export const isInstagramUrl = (url: string): boolean => {
  return url.toLowerCase().includes("instagram.com");
};

export const handleInstagram = async (url: string) => {
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
      timeout: 40000,
    });

    await new Promise((r) => setTimeout(r, 6000));

    const text = (await page.content()).toLowerCase();

    //  strong signals
    const isDead =
      text.includes("page isn't available") ||
      text.includes("user not found") ||
      text.includes("link you followed may be broken");

    if (isDead) {
      return { url, status: 404, message: "Not Found" };
    }

    // login detection
    const loginWall =
      text.includes("log in to continue") || text.includes("sign up to see");

    if (loginWall) {
      return { url, status: 403, message: "Login Required" };
    }

    //  use "something went wrong"
    return { url, status: 200, message: "Working" };
  } catch (err) {
    return { url, status: 500, message: "Browser Error" };
  } finally {
    if (browser) await browser.close();
  }
};
