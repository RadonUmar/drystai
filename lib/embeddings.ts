import { GoogleGenerativeAI } from '@google/generative-ai';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Please add your Gemini API key to .env.local');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Generate text embedding using Gemini's text-embedding-004 model
 * Returns a 768-dimensional vector
 */
export async function generateTextEmbedding(text: string): Promise<number[]> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating text embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1, where 1 is identical and -1 is opposite
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
