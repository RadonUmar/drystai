import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { extractFaceEmbedding, calculateFaceDistance } from '@/lib/faceRecognitionGemini';
import { getPeopleCollection } from '@/lib/mongodb';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Screenshot API called');
    const formData = await request.formData();
    const file = formData.get('image') as Blob;

    if (!file) {
      console.error('❌ No file provided in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('✅ Image received, size:', buffer.length, 'bytes');

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot-${timestamp}.png`;

    // Save to public/screenshots folder
    const filepath = path.join(process.cwd(), 'public', 'screenshots', filename);
    console.log('💾 Saving to:', filepath);
    await writeFile(filepath, buffer);
    console.log('✅ Screenshot saved successfully');

    const screenshotPath = `/screenshots/${filename}`;

    // Extract face embedding from the saved image
    console.log('🔍 Extracting face embedding...');
    const faceEmbedding = await extractFaceEmbedding(filepath);
    console.log('Face embedding result:', faceEmbedding ? 'Success' : 'No face detected');

    if (!faceEmbedding) {
      // No face detected - still return success but without person info
      return NextResponse.json({
        success: true,
        filename,
        path: screenshotPath,
        personId: null,
        personName: null,
        isNewPerson: false,
        noFaceDetected: true
      });
    }

    // Search for matching person in database
    const peopleCollection = await getPeopleCollection();
    const allPeople = await peopleCollection.find({}).toArray();

    let matchedPerson = null;
    let minDistance = Infinity;
    // Much stricter threshold for text-based embeddings (lower = more similar)
    // 0.3 means very similar, reducing false positives
    const FACE_MATCH_THRESHOLD = 0.3;

    // Find the closest matching face
    for (const person of allPeople) {
      if (person.faceEmbedding) {
        const distance = calculateFaceDistance(faceEmbedding, person.faceEmbedding);
        if (distance < minDistance && distance < FACE_MATCH_THRESHOLD) {
          minDistance = distance;
          matchedPerson = person;
        }
      }
    }

    if (matchedPerson) {
      // Person recognized - update last seen
      await peopleCollection.updateOne(
        { _id: matchedPerson._id },
        {
          $set: { lastSeen: new Date() },
          $inc: { timesRecognized: 1 }
        }
      );

      return NextResponse.json({
        success: true,
        filename,
        path: screenshotPath,
        personId: matchedPerson.personId,
        personName: matchedPerson.name,
        isNewPerson: false,
        matchConfidence: 1 - minDistance // Higher is better (0 to 1)
      });
    } else {
      // New person - create entry in database
      const personId = `person-${randomBytes(8).toString('hex')}`;
      const personName = `Unknown-${Date.now()}`;

      await peopleCollection.insertOne({
        personId,
        name: personName,
        faceEmbedding,
        profilePhotoPath: screenshotPath,
        firstSeen: new Date(),
        lastSeen: new Date(),
        conversationCount: 0,
        timesRecognized: 1,
        createdAt: new Date()
      });

      return NextResponse.json({
        success: true,
        filename,
        path: screenshotPath,
        personId,
        personName,
        isNewPerson: true
      });
    }
  } catch (error) {
    console.error('❌ Error saving screenshot:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Failed to save screenshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
