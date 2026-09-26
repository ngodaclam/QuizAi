/**
 * Splits text into smaller chunks for better AI processing.
 * @param {string} text - The text to be chunked.
 * @param {number} chunkSize - Target size of each chunk (in words).
 * @param {number} overlap - Number of overlapping words between chunks.
 * @returns {Array<{content: string, chunkIndex: number, pageNumber: number}>} -
 */

export const chunkText = (text, chunkSize = 500, overlap = 50) => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .trim();

  const paragraphs = cleanedText
    .split(/\n+/)
    .filter((p) => p.trim().length > 0);

  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = paragraph.trim().split(/\s+/);
    const paragraphWordCount = paragraphWords.length;

    if (paragraphWordCount > chunkSize) {
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join("\n\n"),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });
        currentChunk = [];
        currentWordCount = 0;
      }

      for (let i = 0; i < paragraphWords.length; i += chunkSize - overlap) {
        const chunkWords = paragraphWords.slice(i, i + chunkSize);
        chunks.push({
          content: chunkWords.join(" "),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });

        if (i + chunkSize >= paragraphWords.length) break;
      }
      continue;
    }

    if (
      currentWordCount + paragraphWordCount > chunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push({
        content: currentChunk.join("\n\n"),
        chunkIndex: chunkIndex++,
        pageNumber: 0,
      });

      const prevChunkText = currentChunk.join(" ");
      const prevWords = prevChunkText.split(/\s+/);
      const overlapText = prevWords
        .slice(-Math.min(overlap, prevWords.length))
        .join(" ");

      currentChunk = [overlapText, paragraph.trim()];
      currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
    } else {
      currentChunk.push(paragraph.trim());
      currentWordCount += paragraphWordCount;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk.join("\n\n"),
      chunkIndex: chunkIndex++,
      pageNumber: 0,
    });
  }

  if (chunks.length === 0 && cleanedText.length > 0) {
    const allWords = cleanedText.split(/\s+/);
    for (let i = 0; i < allWords.length; i += chunkSize - overlap) {
      const chunkWords = allWords.slice(i, i + chunkSize);
      chunks.push({
        content: chunkWords.join(" "),
        chunkIndex: chunkIndex++,
        pageNumber: 0,
      });

      if (i + chunkSize >= allWords.length) break;
    }
  }

  return chunks;
};

/**
 * Finding relevant chunks based on keyword matching
 * @param {Array<Object>} chunks - Array of chunks.
 * @param {string} query - Search query.
 * @param {number} maxChunks - Maximum chunks to return.
 * @returns {Array<Object>}
 */

export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
  // Strong defensive checks
  if (!Array.isArray(chunks) || chunks.length === 0 || !query) {
    return [];
  }

  const stopWords = new Set([
    "the",
    "is",
    "at",
    "which",
    "on",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "with",
    "to",
    "of",
    "for",
    "by",
    "as",
    "that",
    "this",
    "it",
  ]);

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Fallback if query becomes meaningless after filtering
  if (queryWords.length === 0) {
    return chunks.slice(0, maxChunks).map((chunk) => ({
      content: chunk?.content || "",
      chunkIndex: chunk?.chunkIndex ?? 0,
      pageNumber: chunk?.pageNumber ?? 0,
      _id: chunk?._id,
    }));
  }

  const scoredChunks = chunks
    .map((chunk, index) => {
      // Guard against bad / corrupted chunk data
      if (!chunk || typeof chunk.content !== "string") {
        return null;
      }

      const content = chunk.content.toLowerCase();
      const contentWords = content.split(/\s+/).length || 1;

      let score = 0;

      for (const word of queryWords) {
        const exactMatches = (
          content.match(new RegExp(`\\b${word}\\b`, "g")) || []
        ).length;

        const partialMatches = (content.match(new RegExp(word, "g")) || [])
          .length;

        score += exactMatches * 3;
        score += Math.max(0, partialMatches - exactMatches) * 1.5;
      }

      const uniqueWordsFound = queryWords.filter((word) =>
        content.includes(word)
      ).length;

      if (uniqueWordsFound > 1) {
        score += uniqueWordsFound * 2;
      }

      const normalizedScore = score / Math.sqrt(contentWords);

      // Safe position bonus (no .length crash)
      const positionBonus =
        chunks.length > 0 ? 1 - (index / chunks.length) * 0.1 : 1;

      return {
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        _id: chunk._id,
        score: normalizedScore * positionBonus,
        rawScore: score,
        matchedWords: uniqueWordsFound,
      };
    })
    .filter(Boolean); // remove nulls safely

  return scoredChunks
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.matchedWords !== a.matchedWords) {
        return b.matchedWords - a.matchedWords;
      }
      return a.chunkIndex - b.chunkIndex;
    })
    .slice(0, maxChunks);
};

// export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
//   if (!chunks || chunks.length === 0 || !query) {
//     return [];
//   }

//   const stopWords = new Set([
//     "the",
//     "is",
//     "at",
//     "which",
//     "on",
//     "a",
//     "an",
//     "and",
//     "or",
//     "but",
//     "in",
//     "with",
//     "to",
//     "of",
//     "for",
//     "by",
//     "as",
//     "that",
//     "this",
//     "it",
//   ]);

//   const queryWords = query
//     .toLowerCase()
//     .split(/\s+/)
//     .filter((w) => w.length > 2 && !stopWords.has(w));

//   if (queryWords.length === 0) {
//     return chunks.slice(0, maxChunks).map((chunk) => ({
//       content: chunk.content,
//       chunkIndex: chunk.chunkIndex,
//       pageNumber: chunk.pageNumber,
//       _id: chunk._id,
//     }));
//   }

//   const scoredChunks = chunks.map((chunk, index) => {
//     const content = chunk.content.toLowerCase();
//     const contentWords = content.split(/\s+/).length;
//     let score = 0;

//     for (const word of queryWords) {
//       const exactMatches = content.match(
//         new RegExp(`\\b${word}\\b`, "g") || []
//       ).length;

//       score += exactMatches * 3;

//       const partialMatches = (content.match(new RegExp(word, "g")) || [])
//         .length;
//       score += Math.max(0, partialMatches - exactMatches) * 1.5;
//     }

//     const uniqueWordsFound = queryWords.filter((word) =>
//       content.includes(word)
//     ).length;

//     if (uniqueWordsFound > 1) {
//       score += uniqueWordsFound * 2;
//     }

//     const normalizedScore = score / Math.sqrt(contentWords);

//     const positionBonus = 1 - (index / chunks.length) * 0.1;

//     return {
//       content: chunk.content,
//       chunkIndex: chunk.chunkIndex,
//       pageNumber: chunk.pageNumber,
//       _id: chunk._id,
//       score: normalizedScore * positionBonus,
//       rawScore: score,
//       matchedWords: uniqueWordsFound,
//     };
//   });

//   return scoredChunks
//     .filter((chunk) => chunk.score > 0)
//     .sort((a, b) => {
//       if (b.score !== a.score) {
//         return b.score - a.score;
//       }
//       if (b.matchedWords !== a.matchedWords) {
//         return b.matchedWords - a.matchedWords;
//       }
//       return a.chunkIndex - b.chunkIndex;
//     })
//     .slice(0, maxChunks);
// };
