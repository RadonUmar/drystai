import { NextRequest, NextResponse } from 'next/server';
import { getPeopleCollection, getConversationsCollection } from '@/lib/mongodb';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;

    if (!personId) {
      return NextResponse.json({ error: 'Person ID required' }, { status: 400 });
    }

    // Get person details
    const peopleCollection = await getPeopleCollection();
    const person = await peopleCollection.findOne({ personId });

    if (!person) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    // Get all conversations for this person
    const conversationsCollection = await getConversationsCollection();
    const conversations = await conversationsCollection
      .find({ personId })
      .sort({ timestamp: -1 }) // Most recent first
      .toArray();

    // Format response
    return NextResponse.json({
      person: {
        personId: person.personId,
        name: person.name,
        profilePhotoPath: person.profilePhotoPath,
        firstSeen: person.firstSeen,
        lastSeen: person.lastSeen,
        conversationCount: person.conversationCount,
        timesRecognized: person.timesRecognized
      },
      conversations: conversations.map(conv => ({
        id: conv._id.toString(),
        timestamp: conv.timestamp,
        transcript: conv.transcript,
        screenshotPath: conv.screenshotPath,
        transcriptPath: conv.transcriptPath,
        wordCount: conv.wordCount
      })),
      totalConversations: conversations.length
    });
  } catch (error) {
    console.error('Error fetching person data:', error);
    return NextResponse.json({ error: 'Failed to fetch person data' }, { status: 500 });
  }
}
