import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const getDocuments = async () => {
  try {
    const response = await axiosInstance.get(API_PATHS.DOCUMENTS.GET_DOCUMENTS);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch documents." };
  }
};

const uploadDocument = async (formData) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.DOCUMENTS.UPLOAD,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch documents." };
  }
};

const deleteDocument = async (id) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.DOCUMENTS.DELETE_DOCUMENT(id),
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete document." };
  }
};

const getDocumentById = async (id) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.DOCUMENTS.GET_DOCUMENT_BY_ID(id),
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to get document by ID." };
  }
};

const uploadExcel = async (path, file, title) => {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  try {
    const response = await axiosInstance.post(path, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.response?.data?.message || "Không thể import file Excel. Vui lòng thử lại.");
  }
};

const retryQuiz = async (id) => {
  try {
    const response = await axiosInstance.post(API_PATHS.DOCUMENTS.RETRY_QUIZ(id));
    return response.data.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.response?.data?.message || "Chưa thể tạo tiếp đáp án. Vui lòng thử lại.");
  }
};

const documentService = {
  previewImport: (file) => uploadExcel(API_PATHS.DOCUMENTS.PREVIEW_EXCEL, file),
  importExcel: (file, title) => uploadExcel(API_PATHS.DOCUMENTS.IMPORT_EXCEL, file, title),
  retryQuiz,
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentById,
};
export default documentService;
