import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { generateTextEmbedding } from './embeddings';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Use Gemini Vision to generate a face embedding by analyzing facial features
 * This is a simplified approach that uses Gemini's multimodal capabilities
 */
export async function extractFaceEmbedding(imagePath: string): Promise<number[] | null> {
  try {
    console.log('🤖 Using Gemini Vision for face analysis...');
    console.log('📖 Reading image from:', imagePath);

    const imageBuffer = readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const genAI = getGenAI();

    // Use Gemini 2.5 Flash - stable model with vision support
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('✅ Using model: gemini-2.5-flash');

    // Ask Gemini to detect and describe facial features in extreme detail
    const prompt = `Analyze this image for a human face. If a face is present, provide an EXTREMELY detailed forensic-level description to uniquely identify this person. If no face, say "NO_FACE".

For a detected face, describe in precise detail:
1. FACE STRUCTURE: exact face shape (oval, round, square, heart, diamond), jawline definition, cheekbone prominence, forehead size
2. EYES: color (exact shade), shape (almond, round, hooded, etc.), size, spacing, eyebrow shape/thickness/arch, eyelid characteristics, presence of glasses (describe frame style/color)
3. NOSE: bridge height/width, nostril shape, tip shape, overall size relative to face
4. MOUTH/LIPS: lip thickness, width, shape, symmetry
5. HAIR: color (exact shade), length, style, texture, hairline shape, presence of facial hair (describe style/coverage if present)
6. SKIN: tone (precise description), texture, visible marks/features
7. DISTINCTIVE FEATURES: moles, scars, dimples, wrinkles, piercings, tattoos, asymmetries
8. AGE ESTIMATE: approximate age range
9. FACIAL EXPRESSION: current expression captured
10. UNIQUE IDENTIFIERS: any other features that make this face uniquely identifiable

Be EXTREMELY specific and detailed - this description will be used to distinguish this person from others.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const description = response.text().trim();

    console.log('📥 Gemini description:', description.substring(0, 100) + '...');

    if (description.includes('NO_FACE') || description.toLowerCase().includes('no face') || description.toLowerCase().includes('not visible')) {
      console.log('❌ No face detected in image');
      return null;
    }

    // Convert the detailed face description into a 768-dimensional embedding
    console.log('🔄 Converting description to embedding...');
    const embedding = await generateTextEmbedding(description);

    console.log('✅ Face detected! Generated', embedding.length, 'dimensional embedding');
    return embedding;
  } catch (error) {
    console.error('❌ Error extracting face embedding with Gemini:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown');
    return null;
  }
}

/**
 * Generate a fallback embedding from a text description
 * This ensures we always get a 128-dimensional vector
 */
function generateFallbackEmbedding(description: string): number[] {
  const embedding: number[] = [];
  let seed = 0;

  // Create a pseudo-random but deterministic seed from the description
  for (let i = 0; i < description.length; i++) {
    seed += description.charCodeAt(i) * (i + 1);
  }

  // Generate 128 numbers using a simple PRNG
  for (let i = 0; i < 128; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const value = (seed / 233280) * 2 - 1; // Scale to -1 to 1
    embedding.push(value);
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Calculate Euclidean distance between two face embeddings
 */
export function calculateFaceDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Check if two faces match (distance threshold)
 */
export function facesMatch(embedding1: number[], embedding2: number[], threshold: number = 0.6): boolean {
  const distance = calculateFaceDistance(embedding1, embedding2);
  return distance < threshold;
}
