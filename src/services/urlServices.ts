import { createChunks } from "../utils/chunk";
import { checkWithBrowser } from "../config/browserCheck";
import { normalizeUrl } from "../utils/url";
import pLimit from "p-limit";
import { UrlData } from "../config/excelReader";
import { handleEbayResponse } from "./ebayServices";
import { handleFacebook } from "./facebookServices";
import { handleInstagram } from "./instagramServices";
import { handlePinterest } from "./pinterestServices";
import { handleTiktok } from "./tiktokServies";
import { handleBazos } from "./bazosServices";
import { handleTutti } from "./tuttiServices";
import { handleAukro } from "./aukroServices";
import { handleVinted } from "./vintedServices";
import { detectPlatform } from "../utils/detectPlatform";
import { handleFacebookMarketplace } from "./facebookMarketplace";
interface Result {
  url: string;
  status: number;
  message: string;
}

// Generic blocked patterns (non-eBay only now)
const BLOCKED_PATTERNS = [
  "page not found",
  "page isn't available",
  "this page is missing",
  "we can't find this page",
  "content isn't available",
  "removed content",
  "no longer available",
  "this post is unavailable",
  "404 - page not found",
  "error 404",
  "nothing here",
  "looks like something went wrong",
];

// Login / age gate
const GATED_PATTERNS = [
  "sign in to continue",
  "log in to continue",
  "please sign in",
  "you must be logged in",
  "login to view",
  "verify your age",
  "age-restricted",
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
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
    // HEAD request
    let statusCode: number;
    try {
      const headRes = await fetchWithTimeout(url, "HEAD", timeoutMs);
      statusCode = headRes.status;
    } catch {
      statusCode = 200;
    }

    // Hard errors
    if (statusCode === 404) return { url, status: 404, message: "Not Found" };
    if (statusCode === 410)
      return { url, status: 410, message: "Gone (Deleted)" };
    if (statusCode >= 500)
      return { url, status: statusCode, message: "Server Error" };
    if (statusCode === 401)
      return { url, status: 401, message: "Unauthorized" };

    // GET request
    const getRes = await fetchWithTimeout(url, "GET", timeoutMs);
    const finalCode = getRes.status;
    const body = await getRes.text();

    const platform = detectPlatform(url);

    switch (platform) {
      case "facebook-marketplace":
        return await handleFacebookMarketplace(url);
      case "facebook":
        return await handleFacebook(url);

      case "instagram":
        return await handleInstagram(url);

      case "tiktok":
        return await handleTiktok(url);

      case "pinterest":
        return await handlePinterest(url);

      case "bazos":
        return handleBazos(url, body);

      case "tutti":
        return handleTutti(url, body);

      case "aukro":
        return handleAukro(url, body);

      case "vinted":
        return await handleVinted(url);

      case "ebay":
        const ebayResult = handleEbayResponse(finalCode, body);
        return {
          url,
          status: ebayResult.status,
          message: ebayResult.message,
        };
      default:
        break;
    }
    // Generic fake 404
    if (checkPatterns(body, BLOCKED_PATTERNS)) {
      return { url, status: 404, message: "Not Found (Page Error)" };
    }

    // Gated content
    if (checkPatterns(body, GATED_PATTERNS)) {
      return { url, status: 403, message: "Gated (Login Required)" };
    }

    // Status handling
    if (finalCode >= 200 && finalCode < 300) {
      return { url, status: finalCode, message: "Still Active" };
    }

    if (finalCode >= 300 && finalCode < 400) {
      return { url, status: finalCode, message: "Redirect" };
    }

    if (finalCode === 403 || finalCode === 400) {
      return { url, status: finalCode, message: "Blocked" };
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

        if (result.status === 500 || result.status === 0) {
          console.log(`Retrying (browser error): ${cleanUrl}`);
          result = await checkSingleUrl(cleanUrl);
        }
        // Browser fallback
        if (result.status === 403 && result.message === "Blocked") {
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
