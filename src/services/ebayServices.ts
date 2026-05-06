// services/ebayService.ts

interface EbayResult {
  status: number;
  message: string;
}

const EBAY_BLOCKED_PATTERNS = [
  "this listing has ended",
  "item not found",
  "this item is no longer available",
  "listing ended",
  "no longer available",
];

const EBAY_GATED_PATTERNS = [
  "sign in to continue",
  "log in to continue",
  "please sign in",
];

export const isEbayUrl = (url: string): boolean => {
  return url.toLowerCase().includes("ebay.com");
};

const checkPatterns = (text: string, patterns: string[]): boolean => {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
};

export const handleEbayResponse = (
  statusCode: number,
  body: string,
): EbayResult => {
  const text = body.toLowerCase();

  // Hard status handling
  if (statusCode === 404) {
    return { status: 404, message: "Not Found" };
  }

  if (statusCode === 410) {
    return { status: 410, message: "Gone (Deleted)" };
  }

  if (statusCode >= 500) {
    return { status: statusCode, message: "Server Error" };
  }

  // Fake 404 detection
  if (checkPatterns(text, EBAY_BLOCKED_PATTERNS)) {
    return {
      status: 404,
      message: "Not Found (eBay Listing Removed)",
    };
  }

  // Gated / login required
  if (checkPatterns(text, EBAY_GATED_PATTERNS)) {
    return {
      status: 403,
      message: "Gated (Login Required)",
    };
  }

  // Success
  if (statusCode >= 200 && statusCode < 300) {
    return { status: statusCode, message: "Working" };
  }

  if (statusCode >= 300 && statusCode < 400) {
    return { status: statusCode, message: "Redirect" };
  }

  if (statusCode === 403 || statusCode === 400) {
    return { status: statusCode, message: "Blocked" };
  }

  if (statusCode >= 400 && statusCode < 500) {
    return { status: statusCode, message: "Client Error" };
  }

  return { status: statusCode, message: "Unknown" };
};
