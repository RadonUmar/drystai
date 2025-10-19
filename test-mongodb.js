// Quick test script to check MongoDB connection and data
const { MongoClient } = require('mongodb');
const fs = require('fs');

// Manually load .env.local
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

async function testMongoDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  console.log('   URI:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = client.db('dryst_db');

    // Check people collection
    console.log('👥 Checking people collection...');
    const peopleCollection = db.collection('people');
    const peopleCount = await peopleCollection.countDocuments();
    console.log(`   Found ${peopleCount} people in database`);

    if (peopleCount > 0) {
      const people = await peopleCollection.find({}).limit(5).toArray();
      console.log('\n   Sample people:');
      people.forEach((person, i) => {
        console.log(`   ${i + 1}. ${person.name} (ID: ${person.personId})`);
        console.log(`      - First seen: ${person.firstSeen}`);
        console.log(`      - Times recognized: ${person.timesRecognized}`);
        console.log(`      - Has face embedding: ${person.faceEmbedding ? 'Yes' : 'No'}`);
      });
    }

    // Check conversations collection
    console.log('\n💬 Checking conversations collection...');
    const conversationsCollection = db.collection('conversations');
    const conversationsCount = await conversationsCollection.countDocuments();
    console.log(`   Found ${conversationsCount} conversations in database`);

    if (conversationsCount > 0) {
      const conversations = await conversationsCollection.find({}).limit(3).toArray();
      console.log('\n   Sample conversations:');
      conversations.forEach((conv, i) => {
        console.log(`   ${i + 1}. Person: ${conv.personId}`);
        console.log(`      - Timestamp: ${conv.timestamp}`);
        console.log(`      - Word count: ${conv.wordCount}`);
        console.log(`      - Has transcript embedding: ${conv.transcriptEmbedding ? 'Yes' : 'No'}`);
      });
    }

    // Check indexes
    console.log('\n🔍 Checking search indexes...');
    const indexes = await db.listSearchIndexes('people').toArray();
    console.log(`   People collection indexes: ${indexes.length}`);
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`   - ${idx.name}: ${idx.status || 'unknown status'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Authentication failed. Check your username/password in .env.local');
    } else if (error.message.includes('network')) {
      console.error('\n💡 Network error. Check your internet connection or MongoDB Atlas network access settings');
    }
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

testMongoDB();
