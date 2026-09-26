import readExcelFile from "read-excel-file/node";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_TEXT_BYTES = 1024 * 1024;

const invalidFile = (message) => Object.assign(new Error(message), { statusCode: 400 });
const normalizeHeader = (value) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d")
  .toLowerCase().replace(/[^a-z0-9]/g, "");

// The reader returns cell values (including cached results); formulas are not evaluated.
const cellText = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  throw new Error("Ô chứa lỗi hoặc kiểu dữ liệu không hỗ trợ. Hãy dùng văn bản.");
};

const findColumns = (row) => {
  let question, answer;
  const options = Array(4).fill(undefined);
  row.forEach((cell, column) => {
    let header;
    try { header = normalizeHeader(cellText(cell)); } catch { return; }
    if (["cauhoi", "question"].includes(header)) question = column;
    if (["dapan", "cautraloi", "answer"].includes(header)) answer = column;
    ["a", "b", "c", "d"].forEach((letter, index) => {
      if ([letter, `option${letter}`, `dapan${letter}`, `phuongan${letter}`].includes(header)) options[index] = column;
    });
  });
  return question !== undefined && answer !== undefined ? { question, answer, options } : null;
};

export async function parseFlashcardWorkbook(buffer, options = {}) {
  let worksheets;
  try {
    worksheets = await readExcelFile(buffer, { trim: false });
  } catch {
    throw invalidFile("Không đọc được file Excel. Hãy chọn file .xlsx hợp lệ, không có mật khẩu.");
  }
  return parseFlashcardSheets(worksheets, options);
}

export function parseFlashcardSheets(worksheets, { includeOptions = false } = {}) {
  const cards = [], errors = [], sheets = [], ignoredSheets = [];
  const seen = new Set();
  let totalRows = 0, duplicates = 0, totalTextBytes = 0;

  for (const { sheet: name, data: rows } of worksheets) {
    let headerRow, columns;
    for (let row = 0; row < Math.min(rows.length, 20); row++) {
      columns = findColumns(rows[row]);
      if (columns) { headerRow = row; break; }
    }
    if (!columns) { ignoredSheets.push(name); continue; }
    sheets.push(name);
    rows.forEach((row, rowNumber) => {
      if (rowNumber <= headerRow || findColumns(row)) return;
      // Ignore completely blank rows; numbered rows with missing values are errors.
      const questionCell = row[columns.question];
      const answerCell = row[columns.answer];
      if (row.every((cell) => cell == null || cell === "")) return;
      totalRows++;
      if (totalRows > MAX_IMPORT_ROWS) throw invalidFile(`Mỗi file được tối đa ${MAX_IMPORT_ROWS} dòng câu hỏi.`);
      try {
        const question = cellText(questionCell), answer = cellText(answerCell);
        if (!question || !answer) throw new Error("Thiếu câu hỏi hoặc đáp án.");
        if (question.length > 10000 || answer.length > 10000) throw new Error("Câu hỏi hoặc đáp án vượt quá 10.000 ký tự.");
        const options = includeOptions ? columns.options.map((column) => column === undefined ? "" : cellText(row[column])) : [];
        const hasOptions = options.some(Boolean);
        if (hasOptions && options.some((value) => !value)) throw new Error("Hãy điền đủ bốn lựa chọn A, B, C, D cho câu hỏi này.");
        if (options.some((value) => value.length > 10000)) throw new Error("Lựa chọn vượt quá 10.000 ký tự.");
        const key = JSON.stringify([question, answer, ...(hasOptions ? options : [])]);
        if (seen.has(key)) { duplicates++; return; }
        if (includeOptions) {
          totalTextBytes += [question, answer, ...options].reduce((bytes, value) => bytes + Buffer.byteLength(value, "utf8"), 0);
          if (totalTextBytes > MAX_IMPORT_TEXT_BYTES) {
            throw invalidFile("Tổng nội dung câu hỏi, đáp án và lựa chọn vượt quá 1 MiB. Hãy chia file Excel thành các phần nhỏ hơn rồi import lại.");
          }
        }
        seen.add(key);
        cards.push({ question, answer, difficulty: "medium", ...(hasOptions ? { options } : {}),
          ...(includeOptions ? { sheet: name, row: rowNumber + 1 } : {}) });
      } catch (error) {
        if (error.statusCode === 400) throw error;
        errors.push({ sheet: name, row: rowNumber + 1, message: error.message });
      }
    });
  }
  if (!sheets.length) throw invalidFile('Không tìm thấy cột “Câu hỏi” và “Đáp án” trong 20 dòng đầu của các sheet.');
  if (!totalRows) throw invalidFile("File chưa có câu hỏi nào để import.");
  return { cards, totalRows, duplicates, errors, sheets, ignoredSheets };
}

export const importSummary = ({ cards, ...summary }) => ({
  ...summary, count: cards.length, canImport: cards.length > 0 && summary.errors.length === 0,
  preview: cards.slice(0, 3),
});
