import { NextRequest, NextResponse } from 'next/server';
import { generateTextEmbedding } from '@/lib/embeddings';
import { getConversationsCollection, getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { query, personId, limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Search query required' }, { status: 400 });
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateTextEmbedding(query);

    // Build the vector search pipeline
    const db = await getDatabase();

    // Build match stage (optional filter by personId)
    const matchStage: any = {};
    if (personId) {
      matchStage.personId = personId;
    }

    // Perform vector search using MongoDB Atlas Vector Search
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'conversation_vector_index', // This will be created in MongoDB Atlas
          path: 'transcriptEmbedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: limit
        }
      },
      {
        $project: {
          _id: 1,
          personId: 1,
          timestamp: 1,
          transcript: 1,
          screenshotPath: 1,
          transcriptPath: 1,
          wordCount: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];

    // Add personId filter after vector search if specified
    if (personId) {
      pipeline.push({
        $match: { personId }
      });
    }

    const conversationsCollection = await getConversationsCollection();
    const results = await conversationsCollection.aggregate(pipeline).toArray();

    // Format and return results
    return NextResponse.json({
      query,
      results: results.map(result => ({
        id: result._id.toString(),
        personId: result.personId,
        timestamp: result.timestamp,
        transcript: result.transcript,
        screenshotPath: result.screenshotPath,
        transcriptPath: result.transcriptPath,
        wordCount: result.wordCount,
        relevanceScore: result.score
      })),
      totalResults: results.length
    });
  } catch (error) {
    console.error('Error searching conversations:', error);
    return NextResponse.json({
      error: 'Failed to search conversations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
