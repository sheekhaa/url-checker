export const handleAukro = (url: string, body: string) => {
  const text = body.toLowerCase();

  const deadTexts = [
    "offer details are not available",
    "no offer found",
    "offer not found",
    "details are not available",
  ];

  const isDead = deadTexts.some((t) => text.includes(t.toLowerCase()));

  if (isDead) {
    return {
      url,
      status: 404,
      message: "Not Found",
    };
  }

  return {
    url,
    status: 200,
    message: "Still Active",
  };
};
