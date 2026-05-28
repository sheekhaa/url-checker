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
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // IMPORTANT
    await new Promise((r) => setTimeout(r, 12000));

    // scroll multiple times
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 2500));
    }

    const text = await page.evaluate(() => {
      return (document.body?.innerText || "")
        .toLowerCase()

        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
    });

    // console.log("FB TEXT SAMPLE:", text.slice(0, 3000));
    const loginPatterns = [
      "log into facebook to continue",
      "you must log in to continue",
      "log in to continue",
      "login to continue",
      "sign up for facebook",
      "create new account to continue",
    ];

    const title = await page.title();

    const loginWall =
      title.toLowerCase().includes("log in to facebook") ||
      loginPatterns.some((p) => text.includes(p));

    if (loginWall) {
      return {
        url,
        status: 403,
        message: "Not Found",
      };
    }

    // LOCKED PROFILE
    const lockedProfile =
      text.includes("locked their profile") ||
      text.includes("locked this profile");

    if (lockedProfile) {
      return { url, status: 200, message: "Still Active (Locked Profile)" };
    }

    // EMPTY POSTS (NOT DEAD)
    const noPosts =
      text.includes("no new posts") ||
      text.includes("hasn't posted anything yet") ||
      text.includes("no posts yet");
    if (noPosts) {
      return { url, status: 200, message: "Still Active " };
    }

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
      "listing was deleted",
      "expired listing",
      "seller removed this listing",
      "product unavailable",
      "marketplace listing unavailable",
      "removed by seller",
      "this item has been removed",
      "item deleted",
      "this content isn't available",
      "this content isn't available right now",
      "content unavailable",
      "page isn't available",
      "this page isn't available",
      "this page may have been removed",
      "we can't find this page",
      "link you followed may be broken",
      "the link may be broken",
      "this post is unavailable",
      "post unavailable",
      "video unavailable",
      "photo unavailable",
      "media not available",
      "this reel is unavailable",
      "this story is unavailable",
      "sorry, this content isn't available",
    ];

    const deadMatches = deadPatterns.filter((p) => text.includes(p));

    const isDead = deadMatches.length >= 2;

    if (isDead) {
      return {
        url,
        status: 404,
        message: "Not Found",
      };
    }

    const isEmpty = text.trim().length < 100;

    if (isEmpty) {
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
    console.log(err);

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
