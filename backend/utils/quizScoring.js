const invalidSubmission = (message) => Object.assign(new Error(message), { statusCode: 400 });

// Existing AI quizzes may store O2 or Option 2. Real option text always wins,
// especially values such as O2, 0, and 4 imported from a workbook.
export const resolveAnswerIndex = (answer, options) => {
  if (!Array.isArray(options)) return -1;
  if (typeof answer === "string") {
    const trimmed = answer.trim();
    const exact = options.findIndex((option) => option === trimmed);
    if (exact !== -1) return exact;
    const normalized = options.findIndex((option) =>
      typeof option === "string" && option.trim().toLowerCase() === trimmed.toLowerCase());
    if (normalized !== -1) return normalized;

    const legacy = trimmed.match(/^(?:O|Option\s*)?(\d+)$/i);
    if (legacy) {
      const index = Number(legacy[1]) - 1;
      if (Number.isSafeInteger(index) && index >= 0 && index < options.length) return index;
    }
  } else if (Number.isInteger(answer)) {
    // Preserve the old API's zero-based numeric answers and its final 1-based option.
    if (answer >= 0 && answer < options.length) return answer;
    if (answer === options.length && answer > 0) return answer - 1;
  }
  return -1;
};

export const gradeQuizAnswers = (questions, answers) => {
  if (!Array.isArray(answers)) throw invalidSubmission("Please provide an array of answers");
  if (!Array.isArray(questions) || questions.length === 0) {
    throw invalidSubmission("Quiz has no questions");
  }

  const answeredQuestions = new Set();
  let correctCount = 0;
  const userAnswers = answers.map((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      throw invalidSubmission("Each answer must include a question index and a selected option");
    }
    const { questionIndex, selectedAnswer } = answer;
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= questions.length) {
      throw invalidSubmission("Invalid question index");
    }
    if (answeredQuestions.has(questionIndex)) {
      throw invalidSubmission("Each question can only be answered once");
    }
    answeredQuestions.add(questionIndex);

    const question = questions[questionIndex];
    const selectedIndex = resolveAnswerIndex(selectedAnswer, question.options);
    const correctIndex = resolveAnswerIndex(question.correctAnswer, question.options);
    if (selectedIndex === -1) throw invalidSubmission("Selected answer is not a valid option");
    if (correctIndex === -1) throw invalidSubmission("Quiz question has no valid correct answer");

    const isCorrect = selectedIndex === correctIndex;
    if (isCorrect) correctCount++;
    return {
      questionIndex,
      selectedAnswer: question.options[selectedIndex],
      isCorrect,
      answeredAt: new Date(),
    };
  });

  return {
    userAnswers,
    correctCount,
    totalQuestions: questions.length,
    score: Math.round((correctCount / questions.length) * 100),
  };
};
