import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const getAllFlashcardSets = async () => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.FLASHCARDS.GET_ALL_FLASHCARD_SETS,
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Failed to fetch flashcard sets." }
    );
  }
};

const getFlashcardsForDocument = async (documentId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.FLASHCARDS.GET_FLASHCARDS_FOR_DOC(documentId),
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch flashcards." };
  }
};

const reviewFlashcard = async (cardId, cardIndex) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.FLASHCARDS.REVIEW_FLASHCARD(cardId),
      { cardIndex },
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to review flashcards." };
  }
};

const toggleStar = async (cardId) => {
  try {
    const response = await axiosInstance.put(
      API_PATHS.FLASHCARDS.TOGGLE_STAR(cardId),
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to star flashcard." };
  }
};

const deleteFlashcardSet = async (id) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.FLASHCARDS.DELETE_FLASHCARD_SET(id),
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || { message: "Failed to delete flashcard set." }
    );
  }
};

const getFlashcardSet = async (id) => {
  const response = await axiosInstance.get(API_PATHS.FLASHCARDS.GET_SET(id));
  return response.data;
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
    throw new Error(error.response?.data?.error || "Không thể import file. Vui lòng thử lại.");
  }
};

const flashcardService = {
  getFlashcardSet,
  previewImport: (file) => uploadExcel(API_PATHS.FLASHCARDS.PREVIEW_IMPORT, file),
  importExcel: (file, title) => uploadExcel(API_PATHS.FLASHCARDS.IMPORT, file, title),
  getAllFlashcardSets,
  getFlashcardsForDocument,
  reviewFlashcard,
  toggleStar,
  deleteFlashcardSet,
};

export default flashcardService;
