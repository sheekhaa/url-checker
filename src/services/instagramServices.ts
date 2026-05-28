import puppeteer from "puppeteer";

export const handleInstagram = async (url: string) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "shell",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((r) => setTimeout(r, 8000));

    const finalUrl = page.url().toLowerCase();

    const result = await page.evaluate((finalUrl) => {
      const text = (document.body?.innerText || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      const deadPatterns = [
        "sorry, this page isn't available",
        "page isn't available",
        "post isn't available",
        "user not found",
        "link you followed may be broken",
        "content unavailable",
        "this account is private",
        "the page may have been removed",
        "photo unavailable",
        "video unavailable",
        "reel unavailable",
      ];

      const isDead = deadPatterns.some((p) => text.includes(p));

      if (isDead) {
        return {
          status: 404,
          message: "Not Found",
        };
      }

      const blockedPatterns = [
        "help us confirm",
        "suspicious activity",
        "temporarily blocked",
        "challenge_required",
        "confirm your identity",
        "security check",
        "captcha",
      ];

      const isBlocked = blockedPatterns.some((p) => text.includes(p));

      if (isBlocked) {
        return {
          status: 403,
          message: "Blocked",
        };
      }

      const loginPatterns = ["log in", "sign up", "login", "password"];

      const isLoginWall =
        finalUrl.includes("/accounts/login") ||
        loginPatterns.some((p) => text.includes(p));

      const hasArticle = !!document.querySelector("article");

      const hasImages = document.querySelectorAll("img").length > 3;

      const hasVideo = document.querySelectorAll("video").length > 0;

      const hasMetaDescription = !!document.querySelector(
        'meta[property="og:description"]',
      );

      const hasUsername =
        !!document.querySelector("header section") ||
        !!document.querySelector("header h2");

      const hasLikeButton = !!document.querySelector('svg[aria-label="Like"]');

      const repeatedInstagram = (text.match(/instagram/g) || []).length > 25;

      const hasRealContent =
        (hasArticle ||
          hasVideo ||
          hasLikeButton ||
          hasMetaDescription ||
          hasUsername) &&
        hasImages &&
        !repeatedInstagram;

      if (isLoginWall && hasRealContent) {
        return {
          status: 200,
          message: "Still Active",
        };
      }

      if (hasRealContent) {
        return {
          status: 200,
          message: "Still Active",
        };
      }

      return {
        status: 404,
        message: "Not Found",
      };
    }, finalUrl);

    return {
      url,
      ...result,
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
