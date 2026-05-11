import { Request, Response } from "express";
import { readExcelFile } from "../config/excelReader";
import { processUrls } from "../services/urlServices";
import { createExcelStream } from "../utils/exportExcel";

export const checkUrlsController = async (req: Request, res: Response) => {
  try {
    const { fileName } = req.body;
    const urls = readExcelFile(fileName);

    console.log("Total URLs:", urls.length);

    const filePath = `./uploads/result-${fileName}.xlsx`;

    const { workbook, sheet } = createExcelStream(filePath);

    await processUrls(urls, sheet);

    await workbook.commit();

    return res.status(200).json({
      success: true,
      total: urls.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Error processing URLs",
    });
  }
};
