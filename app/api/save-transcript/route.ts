import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { generateTextEmbedding } from '@/lib/embeddings';
import { getConversationsCollection, getPeopleCollection } from '@/lib/mongodb';
import { extractPersonName, isUnknownName } from '@/lib/nameExtraction';

export async function POST(request: NextRequest) {
  try {
    const { transcript, personId, screenshotPath } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transcript-${timestamp}.txt`;

    // Save to public/transcripts folder (optional - keeping for backward compatibility)
    const filepath = path.join(process.cwd(), 'public', 'transcripts', filename);
    await writeFile(filepath, transcript, 'utf-8');

    const transcriptPath = `/transcripts/${filename}`;

    // Generate text embedding for semantic search
    const transcriptEmbedding = await generateTextEmbedding(transcript);

    // Save to MongoDB conversations collection
    const conversationsCollection = await getConversationsCollection();
    const conversationDoc = {
      personId: personId || null, // null if no face was detected
      timestamp: new Date(),
      transcript,
      transcriptEmbedding,
      screenshotPath: screenshotPath || null,
      transcriptPath,
      wordCount: transcript.split(/\s+/).length,
      createdAt: new Date()
    };

    const result = await conversationsCollection.insertOne(conversationDoc);

    // If linked to a person, update their conversation count and try to extract name
    let extractedName: string | null = null;
    if (personId) {
      const peopleCollection = await getPeopleCollection();

      // Get the current person record
      const person = await peopleCollection.findOne({ personId });

      // Try to extract name from transcript if current name is "Unknown-..."
      if (person && isUnknownName(person.name)) {
        console.log(`🔍 Person has unknown name (${person.name}), attempting to extract from transcript...`);
        extractedName = await extractPersonName(transcript);

        if (extractedName) {
          console.log(`✅ Updating person name from "${person.name}" to "${extractedName}"`);
          await peopleCollection.updateOne(
            { personId },
            {
              $inc: { conversationCount: 1 },
              $set: {
                lastSeen: new Date(),
                name: extractedName,
                nameExtractedAt: new Date()
              }
            }
          );
        } else {
          // No name found, just update conversation count
          await peopleCollection.updateOne(
            { personId },
            {
              $inc: { conversationCount: 1 },
              $set: { lastSeen: new Date() }
            }
          );
        }
      } else {
        // Person already has a real name, just update stats
        await peopleCollection.updateOne(
          { personId },
          {
            $inc: { conversationCount: 1 },
            $set: { lastSeen: new Date() }
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
      filename,
      path: transcriptPath,
      conversationId: result.insertedId.toString(),
      personId: personId || null,
      nameExtracted: extractedName !== null,
      newName: extractedName
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
  }
}
