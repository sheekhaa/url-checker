import * as XLSX from "xlsx";
import path from "path";

export interface UrlData {
  url: string;
  site: string;
}

export const readExcelFile = (fileName: string): UrlData[] => {
  const filePath = path.join(__dirname, "../../uploads", fileName);
  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });

  // Find the row index where "Post URL" header exists
  const headerRowIndex = raw.findIndex((row: any[]) =>
    row.some((cell) => typeof cell === "string" && cell.trim() === "Post URL"),
  );

  if (headerRowIndex === -1) {
    throw new Error(`Could not find "Post URL" column in file: ${fileName}`);
  }

  // Re-parse using the correct header row
  const data = XLSX.utils.sheet_to_json<any>(sheet, {
    range: headerRowIndex, // start from the actual header row
  });

  const urls: UrlData[] = data
    .map((i: any) => ({
      url: i["Post URL"],
      site: i["SITE"],
    }))
    //filter out rows where URL is missing/undefined
    .filter((item: UrlData) => item.url && typeof item.url === "string");

  return urls;
};
