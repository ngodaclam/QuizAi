import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getGeminiModel } from "../config/gemini.js";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "FATAL ERROR: GEMINI_API_KEY is not set in the environment variables."
  );
  process.exit(1);
}

/**
 * Generating the flashcard from the text
 * @param {string} text - Document text
 * @param {number} count - Number of flashcards to generate
 * @returns {Promise<Array<{question: string, answer: string, difficulty: string}>>}
 */
export const generateFlashcards = async (text, count = 10) => {
  const prompt = `Generate exactly ${count} educational flashcards from the following text.
    Format each flashcard as:
    Q: [Clear, specific question]
    A:[Concise, accurate answer]
    D:[Difficulty level: easy, medium or hard]
    
    Separate each flashcard with "---"
    
    Text: 
    ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });

    const generatedText = response.text;

    // Parsing the response
    const flashcards = [];
    const cards = generatedText.split("---").filter((c) => c.trim());

    for (const card of cards) {
      const lines = card.trim().split("\n");
      let question = "",
        answer = "",
        difficulty = "medium";

      for (const line of lines) {
        if (line.startsWith("Q:")) {
          question = line.substring(2).trim();
        } else if (line.startsWith("A:")) {
          answer = line.substring(2).trim();
        } else if (line.startsWith("D:")) {
          const diff = line.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && answer) {
        flashcards.push({ question, answer, difficulty });
      }
    }

    return flashcards.slice(0, count);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate flashcards");
  }
};

/**
 * Generate Quiz Questions
 * @param {string} text - Document text
 * @param {number} numQuestions - Number of questions to generate
 * @param {Promise<Array<{question: string, options: Array, correctAnswer: string, explanation: string, }>>} difficulty - Difficulty level
 */
export const generateQuiz = async (text, numQuestions = 10) => {
  const prompt = `Generate exactly ${numQuestions} multiple choice questions from the following text.
    Format each question as:
    Q: [Question]
    01: [Option 1]
    02: [Option 2]
    03: [Option 3]
    04: [Option 4]
    C: [Correct Option - exactly as written above]
    E: [Brief Explanation]
    D: [Difficulty level: easy, medium or hard]
    
    Separate each question with "---"
    
    Text: 
    ${text.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });

    const generatedText = response.text;

    const questions = [];
    const questionBlocks = generatedText.split("---").filter((q) => q.trim());

    for (const block of questionBlocks) {
      const lines = block.trim().split("\n");
      let question = "",
        options = [],
        correctAnswer = "",
        explanation = "",
        difficulty = "medium";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q:")) {
          question = trimmed.substring(2).trim();
        } else if (trimmed.match(/^0\d:/)) {
          options.push(trimmed.substring(3).trim());
        } else if (trimmed.startsWith("C:")) {
          correctAnswer = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("E:")) {
          explanation = trimmed.substring(2).trim();
        } else if (trimmed.startsWith("D:")) {
          const diff = trimmed.substring(2).trim().toLowerCase();
          if (["easy", "medium", "hard"].includes(diff)) {
            difficulty = diff;
          }
        }
      }

      if (question && options.length === 4 && correctAnswer) {
        questions.push({
          question,
          options,
          correctAnswer,
          explanation,
          difficulty,
        });
      }
    }

    return questions.slice(0, numQuestions);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate quiz questions");
  }
};

/**
 * Generate Document Summary
 * @param {string} text - Document text
 * @param {Promise<string>} difficulty - Difficulty level
 */
export const generateSummary = async (text) => {
  const prompt = `provide a concise summary of the following text, highlighting the key concepts, main ideas, and important points.
  Keep the summary structured and easy to read.
  
  Text: ${text.substring(0, 20000)}`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });
    const generatedText = response.text;

    return generatedText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate summary");
  }
};

/**
 * Generate Document Outline
 * @param {string} question - User Question
 * @param {Array<Object>} chunks - relevant document chunks
 * @returns {Promise<string>}
 */
export const chatWithContext = async (question, chunks) => {
  const context = chunks
    .map((c, i) => `[Chunk ${i + 1}]\n${c.content}`)
    .join("\n\n");

  const prompt = `Based on the following context from a document, Analyze the context and answer the user's question. If the answer is not in teh context say so.
  
  Context: ${context}
  
  Question: ${question}
  
  Answer:`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });

    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to process the chat request");
  }
};

/**
 * Explain a specific concept
 * @param {string} concept - Concept to explain
 * @param {string} context - relevant context
 * @returns {Promise<string>}
 */
export const explainConcept = async (concept, context) => {
  const prompt = `Explain the following concept of${concept} based on the following context. Provide a clear, educational, explanation that's easy to understand. Include examples if relevant.
  
  Context: ${context.substring(0, 10000)}`;

  try {
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });

    const generatedText = response.text;
    return generatedText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to explain concept");
  }
};
