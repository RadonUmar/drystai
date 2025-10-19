import { NextRequest, NextResponse } from 'next/server';
import { AiEngine } from '@fetchai/ai-engine-sdk';

const FETCHAI_API_KEY = process.env.FETCHAI_API_KEY || '';

if (!FETCHAI_API_KEY) {
  console.warn('⚠️ FETCHAI_API_KEY not set - LinkedIn search will not work');
}

export async function POST(request: NextRequest) {
  try {
    const { name, careerInfo } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!FETCHAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'FETCHAI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Searching LinkedIn for:', name);
    console.log('📋 Career info:', careerInfo);
    console.log('🔑 API Key length:', FETCHAI_API_KEY.length);
    console.log('🔑 API Key starts with:', FETCHAI_API_KEY.substring(0, 10) + '...');

    // Initialize AI Engine
    const aiEngine = new AiEngine(FETCHAI_API_KEY);

    // Create a search query combining name and career info
    const searchQuery = careerInfo
      ? `${name} LinkedIn ${careerInfo}`
      : `${name} LinkedIn profile`;

    console.log('🔎 Search query:', searchQuery);

    // Create a session and search
    // Note: Using the Web Search agent address from the AgentVerse
    const functionGroups = await aiEngine.getFunctionGroups();
    console.log('📦 Available function groups:', functionGroups.map(g => g.name));

    // Try to find a suitable function group (Web Search or similar)
    const webSearchGroup = functionGroups.find(
      g => g.name.toLowerCase().includes('search') ||
           g.name.toLowerCase().includes('web') ||
           g.name.toLowerCase().includes('verified')
    );

    if (!webSearchGroup) {
      console.warn('⚠️ No suitable search function group found');
      return NextResponse.json({
        success: false,
        error: 'No search function available',
        availableGroups: functionGroups.map(g => g.name)
      });
    }

    console.log('✅ Using function group:', webSearchGroup.name);

    // Create session
    const session = await aiEngine.createSession(webSearchGroup.uuid);

    try {
      // Start the search
      await session.start(searchQuery);

      // Get messages
      const messages = await session.getMessages();
      console.log('📨 Received', messages.length, 'messages');

      let linkedInInfo: any = null;

      // Process messages
      for (const message of messages) {
        console.log('📬 Message type:', message.type);

        if (message.isAiMessage && message.text) {
          console.log('🤖 AI Message:', message.text);

          // Extract LinkedIn URL from message if present
          const linkedInUrlMatch = message.text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s]+/i);

          linkedInInfo = {
            summary: message.text,
            source: 'AI Engine',
            linkedInUrl: linkedInUrlMatch ? linkedInUrlMatch[0] : null
          };
        } else if (message.isAgentMessage && message.text) {
          console.log('🎯 Agent Message:', message.text);

          // Extract LinkedIn URL from message if present
          const linkedInUrlMatch = message.text.match(/https?:\/\/(www\.)?linkedin\.com\/[^\s]+/i);

          linkedInInfo = {
            summary: message.text,
            source: 'Web Search Agent',
            linkedInUrl: linkedInUrlMatch ? linkedInUrlMatch[0] : null
          };
        }
      }

      // Clean up
      await session.delete();

      if (linkedInInfo) {
        return NextResponse.json({
          success: true,
          linkedInInfo,
          query: searchQuery
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'No results found',
          query: searchQuery
        });
      }

    } catch (sessionError) {
      console.error('❌ Session error:', sessionError);
      await session.delete();
      throw sessionError;
    }

  } catch (error) {
    console.error('❌ LinkedIn search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
