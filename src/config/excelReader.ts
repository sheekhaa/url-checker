// import * as XLSX from "xlsx";
// import path from "path";

// export interface UrlData {
//   url: string;
//   site: string;
//   enforcementStatus: string;
// }

// const ENFORCEMENT_FILTER = "May-26";

// export const readExcelFile = (fileName: string): UrlData[] => {
//   const filePath = path.join(__dirname, "../../uploads", fileName);
//   const workbook = XLSX.readFile(filePath);

//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];

//   const raw = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

//   // Find the row index where "Post URL" header exists
//   const headerRowIndex = raw.findIndex((row: any[]) =>
//     row.some((cell) => typeof cell === "string" && cell.trim() === "Post URL"),
//   );

//   if (headerRowIndex === -1) {
//     throw new Error(`Could not find "Post URL" column in file: ${fileName}`);
//   }

//   // Re-parse using the correct header row
//   const data = XLSX.utils.sheet_to_json<any>(sheet, {
//     range: headerRowIndex,
//   });

//   const urls: UrlData[] = data
//     .map((i: any) => {
//       // Handle both newline and space variants of the column header
//       const enforcementKey = Object.keys(i).find((key) =>
//         key.toLowerCase().includes("enforcement status"),
//       );
//       const enforcementRaw = enforcementKey ? i[enforcementKey] : "";
//       const enforcementStatus = enforcementRaw.toString().trim();

//       return {
//         url: i["Post URL"],
//         site: i["SITE"],
//         enforcementStatus,
//       };
//     })
//     // Filter out rows where URL is missing/undefined
//     .filter((item: UrlData) => item.url && typeof item.url === "string")
//     // Only process URLs where Enforcement Status is May-26
//     .filter(
//       (item: UrlData) =>
//         item.enforcementStatus.toLowerCase().trim() ===
//         ENFORCEMENT_FILTER.toLowerCase().trim(),
//     );
//   return urls;
// };

import * as XLSX from "xlsx";
import path from "path";

export interface UrlData {
  url: string;
  site: string;
  enforcementStatus: string;
}

const ENFORCEMENT_FILTER = "May-26";

export const readExcelFile = (fileName: string): UrlData[] => {
  const filePath = path.join(__dirname, "../../uploads", fileName);

  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
  });

  // Find header row
  const headerRowIndex = raw.findIndex((row: any[]) =>
    row.some(
      (cell) =>
        typeof cell === "string" && cell.trim().toLowerCase() === "post url",
    ),
  );

  if (headerRowIndex === -1) {
    throw new Error(`Could not find "Post URL" column`);
  }

  // Parse again using correct header row
  const data = XLSX.utils.sheet_to_json<any>(sheet, {
    range: headerRowIndex,
  });

  const urls: UrlData[] = data
    .map((i: any) => {
      const siteKey = Object.keys(i).find(
        (key) => key.toLowerCase().trim() === "site",
      );

      const enforcementKey = Object.keys(i).find((key) =>
        key.toLowerCase().includes("enforcement status"),
      );

      const enforcementRaw = enforcementKey ? i[enforcementKey] : "";

      return {
        url: i["Post URL"],

        site: siteKey ? i[siteKey] : "",

        enforcementStatus: enforcementRaw.toString().trim(),
      };
    })

    // Remove empty URLs
    .filter((item: UrlData) => item.url && typeof item.url === "string")

    // Filter only May-26
    // .filter(
    //   (item: UrlData) =>
    //     item.enforcementStatus.toLowerCase().trim() ===
    //     ENFORCEMENT_FILTER.toLowerCase().trim(),
    // );
    .filter(
      (item: UrlData) =>
        item.enforcementStatus.toLowerCase().trim() !==
        ENFORCEMENT_FILTER.toLowerCase().trim(),
    );
  return urls;
};
