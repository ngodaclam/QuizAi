export const quizError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode, isQuizError: true });

// Copy a random subset without changing the bank or the order of its options.
// Option order matters for questions such as "all of the above".
export const sampleQuizQuestions = (questions, count, random = Math.random) => {
  if (!Number.isInteger(count) || count < 1 || count > questions.length) {
    throw quizError(`Số câu phải là số nguyên từ 1 đến ${questions.length}.`);
  }
  const indices = questions.map((_, index) => index);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count).map((index) => {
    const q = questions[index];
    return {
      question: q.question, options: [...q.options], correctAnswer: q.correctAnswer,
      explanation: q.explanation, difficulty: q.difficulty,
    };
  });
};

export const quizForTaking = (quiz) => {
  const data = quiz.toObject ? quiz.toObject() : { ...quiz };
  delete data.chatMessages;
  if (!data.completedAt) {
    data.questions = data.questions.map(({ correctAnswer, explanation, ...question }) => question);
  }
  return data;
};
