import { createPage } from "../utils/browser";

interface Result {
  url: string;
  status: number;
  message: string;
}

export const handleVinted = async (url: string): Promise<Result> => {
  const { browser, page } = await createPage();

  try {
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
        message: "Not found ",
      };
    }

    return {
      url,
      status: 200,
      message: "Working",
    };
  } catch (err) {
    return {
      url,
      status: 500,
      message: "Browser Error",
    };
  } finally {
    await browser.close();
  }
};
