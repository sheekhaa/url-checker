import puppeteer from "puppeteer";

export const isPinterestUrl = (url: string): boolean => {
  return url.toLowerCase().includes("pinterest.com");
};

export const handlePinterest = async (url: string) => {
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
      timeout: 30000,
    });

    // wait for JS rendering
    await new Promise((r) => setTimeout(r, 4000));

    const html = await page.content();
    const text = html.toLowerCase();

    const isDead =
      text.includes("this page could not be found") ||
      text.includes("page not found") ||
      text.includes("sorry, we couldn’t find") ||
      text.includes("this content is no longer available") ||
      text.includes("we can’t find that idea") ||
      text.includes("idea not found");

    if (isDead) {
      return { url, status: 404, message: "Not found" };
    }

    // const isGated =
    //   text.includes("log in") ||
    //   text.includes("sign up") ||
    //   text.includes("continue with f+acebook") ||
    //   text.includes("pinterest");

    // Pinterest often always mentions "log in", so we keep it softer
    const strongGate = text.includes("log in") && text.includes("save ideas");

    if (strongGate) {
      return { url, status: 403, message: "Not found" };
    }

    return { url, status: 200, message: "Working" };
  } catch (err) {
    return { url, status: 500, message: "Browser Error" };
  } finally {
    if (browser) await browser.close();
  }
};
