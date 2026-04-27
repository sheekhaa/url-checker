import puppeteer from "puppeteer";

export const checkWithBrowser = async (url: string) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 20000,
    });

    const content = await page.content();

    const blocked = content.toLowerCase().includes("content isn't available");

    await browser.close();

    return {
      url,
      status: blocked ? 404 : 200,
      message: blocked
        ? "Not Available (Detected in Browser)"
        : "Working (Browser Verified)",
    };
  } catch (err) {
    if (browser) await browser.close();

    return {
      url,
      status: 500,
      message: "Browser Error",
    };
  }
};
