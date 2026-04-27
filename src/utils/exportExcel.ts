import ExcelJS from "exceljs";

export const createExcelStream = (filePath: string) => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useStyles: true,
  });

  const sheet = workbook.addWorksheet("URL Results");

  sheet.columns = [
    { header: "URL", key: "url", width: 40 },
    { header: "Site", key: "site", width: 15 },
    { header: "Status", key: "status", width: 10 },
    { header: "Message", key: "message", width: 20 },
    { header: "Time", key: "time", width: 25 },
  ];

  return { workbook, sheet };
};
