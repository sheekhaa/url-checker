import ExcelJS from "exceljs";

export const createExcelStream = (filePath: string) => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useStyles: true,
  });

  const sheet = workbook.addWorksheet("URL Results");

  sheet.columns = [
    { header: "Site", key: "site", width: 15 },
    { header: "URL", key: "url", width: 40 },
    { header: "Status", key: "status", width: 10 },
    { header: "Message", key: "message", width: 20 },
  ];

  return { workbook, sheet };
};
