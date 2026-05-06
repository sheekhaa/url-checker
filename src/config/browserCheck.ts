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
    const blockedPatterns = [
      "content isn't available",
      "this page is missing",
      "we looked everywhere",
      "page not found",
      "item not found",
      "this listing has ended",
      "no longer available",
    ];

    const blocked = blockedPatterns.some((p) =>
      content.toLowerCase().includes(p),
    );

    await browser.close();

    return {
      url,
      status: blocked ? 404 : 200,
      message: blocked ? "Not Available (Detected in Browser)" : "Working",
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

// export const checkWithBrowser = async (url: string) => {
//   let browser;

//   try {
//     browser = await puppeteer.launch({
//       headless: "shell",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     await page.goto(url, {
//       waitUntil: "networkidle2",
//       timeout: 30000,
//     });

//     // WAIT for full render
//     await new Promise((r) => setTimeout(r, 3000));
//     const content = await page.evaluate(() => {
//       return document.body?.innerText || "";
//     });

//     const data = await page.evaluate(() => {
//       return {
//         text: document.body?.innerText || "",
//         html: document.documentElement?.innerHTML || "",
//       };
//     });

//     const text = (data.text + " " + data.html).toLowerCase();

//     const blockedPatterns = [
//       "this page isn't available",
//       "this content isn't available",
//       "content isn't available",
//       "page isn't available",
//       "page is not available",
//       "may have been removed",
//       "broken link",
//       "not available right now",
//       "page may have been removed",
//       "the link you followed may be broken",
//     ];

//     const isBlocked = blockedPatterns.some((p) => text.includes(p));

//     const isEmpty =
//       data.text.trim().length < 40 && text.includes("facebook") === false;

//     const finalBlocked = isBlocked || isEmpty;

//     await browser.close();

//     return {
//       url,
//       status: finalBlocked ? 404 : 200,
//       message: finalBlocked ? "Not Available" : "Working",
//     };
//   } catch (err) {
//     if (browser) await browser.close();

//     return {
//       url,
//       status: 500,
//       message: "Browser Error",
//     };
//   }
// };
