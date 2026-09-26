import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

const getQuizzesForDocument = async (documentId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZZES_FOR_DOC(documentId),
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch quizzes." };
  }
};

const getQuizById = async (quizId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZ_BY_ID(quizId),
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch quiz." };
  }
};

const submitQuiz = async (quizId, answers) => {
  try {
    const response = await axiosInstance.post(
      API_PATHS.QUIZZES.SUBMIT_QUIZ(quizId),
      { answers },
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to submit quiz." };
  }
};

const getQuizResults = async (quizId) => {
  try {
    const response = await axiosInstance.get(
      API_PATHS.QUIZZES.GET_QUIZ_RESULTS(quizId),
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch quiz results." };
  }
};

const deleteQuiz = async (quizId) => {
  try {
    const response = await axiosInstance.delete(
      API_PATHS.QUIZZES.DELETE_QUIZ(quizId),
    );
    return response.data.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete quiz." };
  }
};

const quizService = {
  async createAttempt(quizId, numQuestions) {
    try {
      const response = await axiosInstance.post(API_PATHS.QUIZZES.CREATE_ATTEMPT(quizId), { numQuestions });
      return response.data.data;
    } catch (error) { throw error.response?.data || { message: "Không tạo được bài test." }; }
  },
  async getChat(quizId, questionIndex) {
    try {
      const response = await axiosInstance.get(API_PATHS.QUIZZES.CHAT(quizId), { params: { questionIndex } });
      return response.data.data;
    } catch (error) { throw error.response?.data || { message: "Không tải được hội thoại." }; }
  },
  async chat(quizId, questionIndex, message) {
    try {
      const response = await axiosInstance.post(API_PATHS.QUIZZES.CHAT(quizId), { questionIndex, message });
      return response.data.data;
    } catch (error) { throw error.response?.data || { message: "Không kết nối được chatbot." }; }
  },
  getQuizzesForDocument,
  getQuizById,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
};

export default quizService;
