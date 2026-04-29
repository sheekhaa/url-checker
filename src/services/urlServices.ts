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
