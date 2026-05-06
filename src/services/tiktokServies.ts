import puppeteer from "puppeteer";

export const isTiktokUrl = (url: string): boolean => {
  return url.toLowerCase().includes("tiktok.com");
};

export const handleTiktok = async (url: string) => {
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

    await new Promise((r) => setTimeout(r, 6000));

    const html = await page.content();
    const text = html.toLowerCase();

    const loginWall =
      text.includes("log in to continue") || text.includes("login to continue");

    if (loginWall) {
      return { url, status: 403, message: "Login Required" };
    }

    if (url.includes("/photo/")) {
      return { url, status: 200, message: "Working" };
    }

    const isDead =
      text.includes("this video is unavailable") && text.includes("tiktok");

    if (isDead) {
      return { url, status: 404, message: "Video Removed" };
    }

    return { url, status: 200, message: "Working" };
  } catch (err) {
    return { url, status: 500, message: "Browser Error" };
  } finally {
    if (browser) await browser.close();
  }
};
