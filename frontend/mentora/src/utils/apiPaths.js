export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const API_PATHS = {
  AUTH: {
    REGISTER: "api/auth/register",
    LOGIN: "api/auth/login",
    GET_PROFILE: "api/auth/profile",
    UPDATE_PROFILE: "api/auth/profile",
    CHANGE_PASSWORD: "api/auth/change-password",
  },

  DOCUMENTS: {
    UPLOAD: "api/documents/upload",
    PREVIEW_EXCEL: "api/documents/import-excel/preview",
    IMPORT_EXCEL: "api/documents/import-excel",
    RETRY_QUIZ: (id) => `api/documents/${id}/retry-quiz`,
    GET_DOCUMENTS: "api/documents",
    GET_DOCUMENT_BY_ID: (id) => `api/documents/${id}`,
    UPDATE_DOCUMENT: (id) => `api/documents/${id}`,
    DELETE_DOCUMENT: (id) => `api/documents/${id}`,
  },

  AI: {
    GENERATE_FLASHCARDS: "api/ai/generate-flashcards",
    GENERATE_QUIZ: "api/ai/generate-quiz",
    GENERATE_SUMMARY: "api/ai/generate-summary",
    CHAT: "api/ai/chat",
    EXPLAIN_CONCEPT: "api/ai/explain-concept",
    GET_CHAT_HISTORY: (documentId) => `/api/ai/chat-history/${documentId}`,
  },

  FLASHCARDS: {
    PREVIEW_IMPORT: "/api/flashcards/import/preview",
    IMPORT: "/api/flashcards/import",
    GET_SET: (id) => `/api/flashcards/sets/${id}`,
    GET_ALL_FLASHCARD_SETS: "api/flashcards",
    GET_FLASHCARDS_FOR_DOC: (documentId) => `/api/flashcards/${documentId}`,
    REVIEW_FLASHCARD: (cardId) => `/api/flashcards/${cardId}/review`,
    TOGGLE_STAR: (cardId) => `/api/flashcards/${cardId}/star`,
    DELETE_FLASHCARD_SET: (id) => `/api/flashcards/${id}`,
  },

  QUIZZES: {
    GET_QUIZZES_FOR_DOC: (documentId) => `/api/quizzes/${documentId}`,
    GET_QUIZ_BY_ID: (id) => `/api/quizzes/quiz/${id}`,
    SUBMIT_QUIZ: (id) => `/api/quizzes/${id}/submit`,
    GET_QUIZ_RESULTS: (id) => `/api/quizzes/${id}/results`,
    DELETE_QUIZ: (id) => `/api/quizzes/${id}`,
    CREATE_ATTEMPT: (id) => `/api/quizzes/${id}/attempts`,
    CHAT: (id) => `/api/quizzes/${id}/chat`,
  },

  PROGRESS: {
    GET_DASHBOARD: "api/progress/dashboard",
  },
};
