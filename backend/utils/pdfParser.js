import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

/** Extracting text content from a PDF file
 * @param {string} filePath - The path to the PDF file
 * @returns {Promise<{text: string, numPages: number}>} - Extracted text content
 */

export const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const parser = new PDFParse(new Uint8Array(dataBuffer));
    const data = await parser.getText();

    return { text: data.text, numPages: data.numpages, info: data.info };
  } catch (error) {
    console.error("PDF parsing error: ", error);
    throw new Error("Failed to extract text from PDF");
  }
};
