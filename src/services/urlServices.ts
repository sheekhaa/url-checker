// import { createChunks } from "../utils/chunk";
// import { checkWithBrowser } from "../config/browserCheck";
// import { normalizeUrl } from "../utils/url";
// import pLimit from "p-limit";
// import { UrlData } from "../config/excelReader";

// interface Result {
//   url: string;
//   status: number;
//   message: string;
// }

// // function to check single URL
// const checkSingleUrl = async (url: string): Promise<Result> => {
//   const timeoutMs = 8000;

//   if (!/^https?:\/\//i.test(url)) {
//     url = "https://" + url;
//   }

//   const fetchWithTimeout = async (method: "HEAD" | "GET") => {
//     const controller = new AbortController();
//     const timeout = setTimeout(() => controller.abort(), timeoutMs);

//     try {
//       const res = await fetch(url, {
//         method,
//         redirect: "follow",
//         signal: controller.signal,
//         headers: {
//           "User-Agent":
//             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
//         },
//       });

//       clearTimeout(timeout);
//       return res;
//     } catch (err) {
//       clearTimeout(timeout);
//       throw err;
//     }
//   };

//   const classifyStatus = async (res: Response): Promise<Result> => {
//     const code = res.status;
//     const text = await res.text();

//     const blockedPatterns = [
//       "content isn't available",
//       "page isn't available",
//       "not available right now",
//       "removed content",
//       "sorry, this page isn't available",
//     ];

//     const isFake200 = blockedPatterns.some((p) =>
//       text.toLowerCase().includes(p),
//     );

//     if (isFake200) {
//       return {
//         url,
//         status: 404,
//         message: "Content Not Available",
//       };
//     }

//     if (code >= 200 && code < 300) {
//       return { url, status: code, message: "Working" };
//     }
//     if (code >= 300 && code < 400) {
//       return { url, status: code, message: "Redirect" };
//     }
//     if (code === 403 || code === 400) {
//       return { url, status: code, message: "Blocked" };
//     }
//     if (code === 404) {
//       return { url, status: code, message: "Not Found" };
//     }
//     if (code >= 400 && code < 500) {
//       return { url, status: code, message: "Client Error" };
//     }
//     if (code >= 500) {
//       return { url, status: code, message: "Server Error" };
//     }

//     return { url, status: code, message: "Unknown" };
//   };

//   try {
//     let res = await fetchWithTimeout("HEAD");

//     if (res.status >= 400) {
//       res = await fetchWithTimeout("GET");
//     }

//     return classifyStatus(res);
//   } catch (err: any) {
//     return {
//       url,
//       status: 0,
//       message: err.name === "AbortError" ? "Timeout" : "Network Error",
//     };
//   }
// };
// export const processUrls = async (urls: UrlData[], sheet: any) => {
//   const limit = pLimit(2);
//   let completed = 0;

//   const chunks = createChunks(urls, 10);

//   for (const chunk of chunks) {
//     const tasks = chunk.map((item) =>
//       limit(async () => {
//         const cleanUrl = normalizeUrl(item.url);

//         //skip if URL came back empty
//         if (!cleanUrl) {
//           console.warn(`Skipping empty URL for site: ${item.site}`);
//           return;
//         }
//         let result = await checkSingleUrl(cleanUrl);

//         // fallback logic
//         if (result.status === 403 || result.status === 400) {
//           console.log(`Retrying with browser: ${cleanUrl}`);

//           const browserResult = await checkWithBrowser(cleanUrl);

//           // override only if browser succeeds
//           if (browserResult.status === 200) {
//             result = browserResult;
//           }
//         }

//         completed++;

//         sheet
//           .addRow({
//             url: result.url,
//             site: item.site,
//             status: result.status,
//             message: result.message,
//             time: new Date().toISOString(),
//           })
//           .commit();

//         if (completed % 10 === 0) {
//           console.log(`Processed: ${completed}/${urls.length}`);
//         }

//         return result;
//       }),
//     );

//     await Promise.all(tasks);
//   }
// };

import { createChunks } from "../utils/chunk";
import { checkWithBrowser } from "../config/browserCheck";
import { normalizeUrl } from "../utils/url";
import pLimit from "p-limit";
import { UrlData } from "../config/excelReader";

interface Result {
  url: string;
  status: number;
  message: string;
}

// ─── Expanded blocked patterns (covers eBay, Instagram, Facebook, LinkedIn, etc.) ───
const BLOCKED_PATTERNS = [
  // Generic not found
  "page not found",
  "page isn't available",
  "page is not available",
  "this page is missing",
  "we looked everywhere",
  "we can't find this page",
  "couldn't find that page",
  "the page you requested was not found",
  "sorry, this page isn't available",
  "content isn't available",
  "content is not available",
  "this content isn't available",
  "not available right now",
  "removed content",
  "no longer available",
  "this post is unavailable",
  "this listing has ended", // eBay listing ended
  "item not found", // eBay
  "this item is no longer available",

  // Soft 404s / error pages
  "404 - page not found",
  "error 404",
  "hmm. we couldn't find that page",
  "the link you followed may be broken",
  "nothing here",
  "looks like something went wrong",
];

// ─── Age gate / login wall patterns (fake 200 but content is gated) ───
const GATED_PATTERNS = [
  "sign in to continue",
  "log in to continue",
  "please sign in",
  "you must be logged in",
  "login to view",
  "you must be 18",
  "age verification",
  "verify your age",
  "this content is age-restricted",
  "adults only",
  "confirm your age",
  "you need to be signed in",
  "create an account to view",
];

const checkPatterns = (text: string, patterns: string[]): boolean => {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
};

const fetchWithTimeout = async (
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

const checkSingleUrl = async (url: string): Promise<Result> => {
  const timeoutMs = 10000;

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    // Step 1: Quick HEAD check to get the HTTP status code
    let statusCode: number;
    try {
      const headRes = await fetchWithTimeout(url, "HEAD", timeoutMs);
      statusCode = headRes.status;
    } catch {
      // HEAD not supported by some servers — fall through to GET
      statusCode = 200; // assume ok, GET will validate
    }

    // Step 2: Hard HTTP errors — no need to fetch body
    if (statusCode === 404) {
      return { url, status: 404, message: "Not Found" };
    }
    if (statusCode === 410) {
      return { url, status: 410, message: "Gone (Deleted)" };
    }
    if (statusCode >= 500) {
      return { url, status: statusCode, message: "Server Error" };
    }
    if (statusCode === 401) {
      return { url, status: 401, message: "Unauthorized" };
    }

    // Step 3: For 200/301/302/403/400 — fetch GET body to detect fake 200s and gates
    const getRes = await fetchWithTimeout(url, "GET", timeoutMs);
    const finalCode = getRes.status;
    const body = await getRes.text();

    // Step 4: Check body for fake 404 pages (site returns 200 but shows error page)
    if (checkPatterns(body, BLOCKED_PATTERNS)) {
      return { url, status: 404, message: "Not Found (Page Error)" };
    }

    // Step 5: Check for age gate or login wall (fake 200 but gated)
    if (checkPatterns(body, GATED_PATTERNS)) {
      return { url, status: 403, message: "Gated (Age/Login Required)" };
    }

    // Step 6: Classify by actual HTTP status
    if (finalCode >= 200 && finalCode < 300) {
      return { url, status: finalCode, message: "Working" };
    }
    if (finalCode >= 300 && finalCode < 400) {
      return { url, status: finalCode, message: "Redirect" };
    }
    if (finalCode === 403 || finalCode === 400) {
      return { url, status: finalCode, message: "Blocked" };
    }
    if (finalCode === 404) {
      return { url, status: 404, message: "Not Found" };
    }
    if (finalCode >= 400 && finalCode < 500) {
      return { url, status: finalCode, message: "Client Error" };
    }
    if (finalCode >= 500) {
      return { url, status: finalCode, message: "Server Error" };
    }

    return { url, status: finalCode, message: "Unknown" };
  } catch (err: any) {
    return {
      url,
      status: 0,
      message: err.name === "AbortError" ? "Timeout" : "Network Error",
    };
  }
};

export const processUrls = async (urls: UrlData[], sheet: any) => {
  const limit = pLimit(2);
  let completed = 0;
  const chunks = createChunks(urls, 10);

  for (const chunk of chunks) {
    const tasks = chunk.map((item) =>
      limit(async () => {
        const cleanUrl = normalizeUrl(item.url);

        if (!cleanUrl) {
          console.warn(`Skipping empty URL for site: ${item.site}`);
          return;
        }

        let result = await checkSingleUrl(cleanUrl);

        // Browser fallback: only for hard "Blocked" (403/400), not for gated pages
        if (result.status === 403 && result.message === "Blocked") {
          console.log(`Retrying with browser: ${cleanUrl}`);
          const browserResult = await checkWithBrowser(cleanUrl);
          if (browserResult.status === 200) {
            result = browserResult;
          }
        }

        completed++;

        sheet
          .addRow({
            url: result.url,
            site: item.site,
            status: result.status,
            message: result.message,
            time: new Date().toISOString(),
          })
          .commit();

        if (completed % 10 === 0) {
          console.log(`Processed: ${completed}/${urls.length}`);
        }

        return result;
      }),
    );

    await Promise.all(tasks);
  }
};
