import multer from "multer";
import path from "node:path";

export default multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
  fileFilter: (_req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== ".xlsx") {
      return callback(Object.assign(new Error("Chỉ hỗ trợ file Excel .xlsx."), { statusCode: 400 }));
    }
    callback(null, true);
  },
});
