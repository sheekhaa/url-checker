import puppeteer from "puppeteer";

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

    await new Promise((r) => setTimeout(r, 10000));

    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await new Promise((r) => setTimeout(r, 2000));
    }

    const visibleText = await page.evaluate(() => {
      return (document.body?.innerText || "")
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/\s+/g, " ")
        .trim();
    });

    const title = (await page.title()).toLowerCase();


    const hasWorkingContent = await page.evaluate(() => {
      const text = (document.body?.innerText || "").toLowerCase();

      const hasMembers =
        text.includes("members") ||
        text.includes("new posts today") ||
        text.includes("public group") ||
        text.includes("private group");

      const hasAbout =
        text.includes("about this group") || text.includes("group rules");

      const hasPosts = text.includes("posts") || text.includes("discussion");

      const hasTitle =
        (document.querySelector("h1")?.textContent || "").trim().length > 2;

      const imageCount = document.querySelectorAll("img").length;

      return hasMembers || hasAbout || hasPosts || hasTitle || imageCount > 5;
    });

    const loginPatterns = [
      "log into facebook",
      "email or mobile number",
      "forgot password",
      "create new account",
      "password",
      "log in",
      "sign up",
      "you must log in",
      "login to continue",
    ];

    const loginWall =
      title.includes("log in") ||
      loginPatterns.some((p) => visibleText.includes(p));

    if (loginWall && !hasWorkingContent) {
      return {
        url,
        status: 403,
        message: "Working",
      };
    }

    const deadPatterns = [
      "this content isn't available right now",
      "this content isn't available",
      "this page isn't available",
      "we can't find this page",
      "link you followed may be broken",
      "content unavailable",
      "content has been removed",
      "listing isn't available anymore",
      "item no longer available",
      "item isn't available anymore",
      "this item has been removed",
      "post unavailable",
      "video unavailable",
      "photo unavailable",
      "this reel is unavailable",
      "this story is unavailable",
      "sorry, this content isn't available",
    ];

    const isDead = deadPatterns.some((p) => visibleText.includes(p));

    if (isDead && !hasWorkingContent) {
      return {
        url,
        status: 404,
        message: "Not Found",
      };
    }

    if (visibleText.length < 30 && !hasWorkingContent) {
      return {
        url,
        status: 403,
        message: "Blocked",
      };
    }


    return {
      url,
      status: 200,
      message: "Working",
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

// import puppeteer from "puppeteer";

// export const isFacebookUrl = (url: string): boolean => {
//   return url.toLowerCase().includes("facebook.com");
// };

// export const handleFacebook = async (url: string) => {
//   let browser;

//   try {
//     browser = await puppeteer.launch({
//       headless: "shell",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
//     );

//     await page.setExtraHTTPHeaders({
//       "accept-language": "en-US,en;q=0.9",
//     });

//     await page.goto(url, {
//       waitUntil: "networkidle2",
//       timeout: 60000,
//     });

//     // IMPORTANT
//     await new Promise((r) => setTimeout(r, 12000));

//     // scroll multiple times
//     for (let i = 0; i < 8; i++) {
//       await page.evaluate(() => window.scrollBy(0, window.innerHeight));
//       await new Promise((r) => setTimeout(r, 2500));
//     }

//     const text = await page.evaluate(() => {
//       return (
//         document.body?.innerText + " " + document.documentElement?.innerHTML ||
//         ""
//       )
//         .toLowerCase()
//         .replace(/[’‘]/g, "'")
//         .replace(/\s+/g, " ")
//         .trim();
//     });

//     // console.log("FB TEXT SAMPLE:", text.slice(0, 3000));
//     const loginPatterns = [
//       "log into facebook",
//       "email or mobile number",
//       "password",
//       "forgot password",
//       "create new account",
//       "log in",
//       "sign up",
//       "you must log in",
//       "login to continue",
//     ];

//     const pageUrl = page.url();
//     const title = await page.title();

//     const loginWall =
//       pageUrl.includes("/login") ||
//       title.toLowerCase().includes("log in") ||
//       loginPatterns.some((p) => text.includes(p));

//     if (loginWall) {
//       return {
//         url,
//         status: 403,
//         message: "Not Found",
//       };
//     }

//     const deadPatterns = [
//       "this listing isn't available anymore",
//       "listing isn't available anymore",
//       "item isn't available anymore",
//       "item no longer available",
//       "this item is no longer available",
//       "it may have been sold or expired",
//       "may have been sold or expired",
//       "take a look at these other items",
//       "browse similar items",
//       "listing expired",
//       "listing removed",
//       "listing deleted",
//       "listing was deleted",
//       "expired listing",
//       "seller removed this listing",
//       "product unavailable",
//       "marketplace listing unavailable",
//       "removed by seller",
//       "this item has been removed",
//       "item deleted",
//       "this content isn't available",
//       "this content isn't available right now",
//       "content unavailable",
//       "content has been removed",
//       "page isn't available",
//       "this page isn't available",
//       "this page may have been removed",
//       "we can't find this page",
//       "may have been removed",
//       "link you followed may be broken",
//       "the link may be broken",
//       "this post is unavailable",
//       "post unavailable",
//       "video unavailable",
//       "photo unavailable",
//       "media not available",
//       "this reel is unavailable",
//       "this story is unavailable",
//       "sorry, this content isn't available",
//       "not available right now",
//       "this account is private",
//       "no longer available",
//     ];

//     const isDead = deadPatterns.some((p) => text.includes(p));

//     if (isDead) {
//       return {
//         url,
//         status: 404,
//         message: "Not Found",
//       };
//     }

//     const isEmpty = text.trim().length < 100;

//     if (isEmpty) {
//       return {
//         url,
//         status: 403,
//         message: "Blocked",
//       };
//     }

//     return {
//       url,
//       status: 200,
//       message: "Working",
//     };
//   } catch (err) {
//     console.log(err);

//     return {
//       url,
//       status: 500,
//       message: "Browser Error",
//     };
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// };
