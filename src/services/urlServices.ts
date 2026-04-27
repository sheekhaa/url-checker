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

// function to check single URL
const checkSingleUrl = async (url: string): Promise<Result> => {
  const timeoutMs = 8000;

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const fetchWithTimeout = async (method: "HEAD" | "GET") => {
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
        },
      });

      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  };

  const classifyStatus = async (res: Response): Promise<Result> => {
    const code = res.status;
    const text = await res.text();

    const blockedPatterns = [
      "content isn't available",
      "page isn't available",
      "not available right now",
      "removed content",
      "sorry, this page isn't available",
    ];

    const isFake200 = blockedPatterns.some((p) =>
      text.toLowerCase().includes(p),
    );

    if (isFake200) {
      return {
        url,
        status: 404,
        message: "Content Not Available",
      };
    }

    if (code >= 200 && code < 300) {
      return { url, status: code, message: "Working" };
    }
    if (code >= 300 && code < 400) {
      return { url, status: code, message: "Redirect" };
    }
    if (code === 403 || code === 400) {
      return { url, status: code, message: "Blocked" };
    }
    if (code === 404) {
      return { url, status: code, message: "Not Found" };
    }
    if (code >= 400 && code < 500) {
      return { url, status: code, message: "Client Error" };
    }
    if (code >= 500) {
      return { url, status: code, message: "Server Error" };
    }

    return { url, status: code, message: "Unknown" };
  };

  try {
    let res = await fetchWithTimeout("HEAD");

    if (res.status >= 400) {
      res = await fetchWithTimeout("GET");
    }

    return classifyStatus(res);
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

        //skip if URL came back empty
        if (!cleanUrl) {
          console.warn(`Skipping empty URL for site: ${item.site}`);
          return;
        }
        let result = await checkSingleUrl(cleanUrl);

        // fallback logic
        if (result.status === 403 || result.status === 400) {
          console.log(`Retrying with browser: ${cleanUrl}`);

          const browserResult = await checkWithBrowser(cleanUrl);

          // override only if browser succeeds
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
