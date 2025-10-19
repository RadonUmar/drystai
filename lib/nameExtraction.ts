import { GoogleGenerativeAI } from '@google/generative-ai';

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Extract a person's name from conversation transcript using Gemini
 * Looks for patterns like "My name is X", "I'm X", "Call me X", etc.
 */
export async function extractPersonName(transcript: string): Promise<string | null> {
  try {
    console.log('🔍 Attempting to extract person name from transcript...');

    if (!transcript || transcript.trim().length < 10) {
      console.log('⚠️ Transcript too short to extract name');
      return null;
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Analyze this conversation transcript and extract the speaker's name if mentioned.

Look for patterns like:
- "My name is [name]"
- "I'm [name]"
- "Call me [name]"
- "This is [name]"
- "[name] speaking"
- Any other way someone introduces themselves

Transcript:
"${transcript}"

Rules:
1. Return ONLY the person's first name (or full name if clearly stated)
2. Do NOT return nicknames unless that's all they provided
3. If NO name is mentioned, return exactly: "NO_NAME"
4. Return ONLY the name or "NO_NAME", nothing else

Response:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const extractedName = response.text().trim();

    console.log('📝 Gemini response:', extractedName);

    if (extractedName === 'NO_NAME' ||
        extractedName.toLowerCase().includes('no name') ||
        extractedName.toLowerCase().includes('not mentioned')) {
      console.log('❌ No name found in transcript');
      return null;
    }

    // Clean up the response - remove quotes, extra words
    let cleanName = extractedName
      .replace(/["']/g, '')
      .replace(/^(the name is|name is|name:|it's|it is)\s*/i, '')
      .trim();

    // Validate that it looks like a real name (not too long, reasonable characters)
    if (cleanName.length > 50 || cleanName.length < 2) {
      console.log('⚠️ Extracted name seems invalid:', cleanName);
      return null;
    }

    // Check if it contains only letters, spaces, hyphens, and apostrophes (valid name characters)
    if (!/^[a-zA-Z\s\-']+$/.test(cleanName)) {
      console.log('⚠️ Extracted name contains invalid characters:', cleanName);
      return null;
    }

    console.log('✅ Extracted name:', cleanName);
    return cleanName;
  } catch (error) {
    console.error('❌ Error extracting person name:', error);
    return null;
  }
}

/**
 * Check if a name is a default "Unknown-" name
 */
export function isUnknownName(name: string): boolean {
  return name.startsWith('Unknown-');
}
