import { NextRequest, NextResponse } from 'next/server';
import { getPeopleCollection, getConversationsCollection } from '@/lib/mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;

  if (!personId) {
    return NextResponse.json(
      { success: false, error: 'Person ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log('🤖 Generating AI summary for person:', personId);

    // Connect to MongoDB using the same helper functions as other APIs
    const peopleCollection = await getPeopleCollection();
    const conversationsCollection = await getConversationsCollection();

    // Fetch person details
    console.log('🔍 Searching for person with personId:', personId);
    const person = await peopleCollection.findOne({ personId });
    console.log('👤 Person found:', person ? person.name : 'NULL');

    if (!person) {
      console.log('❌ Person not found in database');
      return NextResponse.json(
        { success: false, error: 'Person not found', personId },
        { status: 404 }
      );
    }

    // Fetch all conversations for this person
    const conversations = await conversationsCollection
      .find({ personId })
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`📚 Found ${conversations.length} conversations for ${person.name}`);

    if (conversations.length === 0) {
      return NextResponse.json({
        success: true,
        summary: 'No conversations yet. Start talking to build a conversation history!',
        conversationCount: 0,
        personName: person.name
      });
    }

    // Combine all transcripts
    const allTranscripts = conversations
      .map((conv, idx) => {
        const timestamp = new Date(conv.timestamp).toLocaleString();
        return `[Conversation ${idx + 1} - ${timestamp}]\n${conv.transcript}`;
      })
      .join('\n\n---\n\n');

    // Generate AI summary using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an AI assistant analyzing conversation history to provide meaningful insights.

Person's Name: ${person.name}
Total Conversations: ${conversations.length}
First Met: ${new Date(person.firstSeen).toLocaleDateString()}
Last Seen: ${new Date(person.lastSeen).toLocaleDateString()}

CONVERSATION HISTORY:
${allTranscripts}

Based on these conversations, provide a concise but insightful summary (3-5 bullet points) that captures:
1. Key topics discussed
2. Interests and preferences mentioned
3. Important details or context about the person
4. Relationship dynamics or conversation patterns
5. Any actionable insights for future interactions

Format your response as clear, conversational bullet points. Be specific and reference actual conversation content.`;

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    console.log('✅ AI summary generated successfully');

    // Extract career information from conversations for LinkedIn search
    let careerInfo = '';
    let linkedInInfo = null;

    try {
      console.log('🔍 Extracting career information...');
      const careerPrompt = `Analyze these conversations and extract any career-related information such as:
- Job title or role
- Company name
- Industry
- Professional skills or expertise
- Education

Conversations:
${allTranscripts}

Respond with ONLY the career information in a brief, search-friendly format (e.g., "Software Engineer at Google" or "Marketing Manager"). If no career information is found, respond with "NONE".`;

      const careerResult = await model.generateContent(careerPrompt);
      const extractedCareer = careerResult.response.text().trim();

      if (extractedCareer !== 'NONE' && extractedCareer.length > 0) {
        careerInfo = extractedCareer;
        console.log('💼 Career info extracted:', careerInfo);

        // Call LinkedIn search API
        console.log('🔎 Searching LinkedIn for professional info...');
        const linkedInResponse = await fetch(`${request.nextUrl.origin}/api/linkedin-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: person.name,
            careerInfo: careerInfo
          }),
        });

        if (linkedInResponse.ok) {
          const linkedInData = await linkedInResponse.json();
          if (linkedInData.success) {
            linkedInInfo = linkedInData.linkedInInfo;
            console.log('✅ LinkedIn info retrieved');
          }
        }
      } else {
        console.log('ℹ️ No career information found in conversations');
      }
    } catch (careerError) {
      console.error('⚠️ Error extracting career info:', careerError);
      // Continue without LinkedIn info - non-critical
    }

    return NextResponse.json({
      success: true,
      summary,
      conversationCount: conversations.length,
      personName: person.name,
      firstSeen: person.firstSeen,
      lastSeen: person.lastSeen,
      careerInfo: careerInfo || null,
      linkedInInfo: linkedInInfo || null
    });

  } catch (error) {
    console.error('❌ Error generating person summary:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
