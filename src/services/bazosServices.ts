export const handleBazos = async (url: string, body: string) => {
  const text = body.toLowerCase();

  const isDead =
    text.includes("this ad is no longer available") ||
    text.includes("the ad has already been deleted.");

  if (isDead) {
    return { url, status: 404, message: "Not Found " };
  }

  return { url, status: 200, message: "Still Active" };
};
