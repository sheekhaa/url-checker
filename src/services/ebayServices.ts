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

const EBAY_SOFT_404_PATTERNS = [
  "we looked everywhere",
  "looks like this page is missing",
  "page you're looking for is not available",
  "this page is missing",
  "the page you're looking for can't be found",
];

const checkPatterns = (text: string, patterns: string[]): boolean => {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
};

export const handleEbayResponse = (
  statusCode: number,
  body: string,
): EbayResult => {
  const text = body.toLowerCase();

  if (statusCode === 404) {
    return { status: 404, message: "Not Found" };
  }

  if (statusCode === 410) {
    return { status: 410, message: "Gone (Deleted)" };
  }

  if (statusCode >= 500) {
    return { status: statusCode, message: "Server Error" };
  }

  if (checkPatterns(text, EBAY_SOFT_404_PATTERNS)) {
    return {
      status: 404,
      message: "Not Found",
    };
  }

  if (checkPatterns(text, EBAY_BLOCKED_PATTERNS)) {
    return {
      status: 404,
      message: "Not Found",
    };
  }

  if (checkPatterns(text, EBAY_GATED_PATTERNS)) {
    return {
      status: 403,
      message: "Not Found",
    };
  }

  if (statusCode >= 300 && statusCode < 400) {
    return { status: statusCode, message: "Redirect" };
  }

  if (statusCode === 403 || statusCode === 400) {
    return { status: statusCode, message: "Blocked" };
  }

  if (statusCode >= 200 && statusCode < 300) {
    return { status: statusCode, message: "Working" };
  }

  return { status: statusCode, message: "Unknown" };
};
