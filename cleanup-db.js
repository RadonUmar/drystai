// Quick cleanup script to clear all data from MongoDB and local files
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

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

// Function to delete all files in a directory
function clearDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`   ⚠️  Directory not found: ${dirPath}`);
    return 0;
  }

  const files = fs.readdirSync(dirPath);
  let deletedCount = 0;

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    // Skip .gitkeep and hidden files
    if (file !== '.gitkeep' && !file.startsWith('.')) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        console.error(`   ❌ Failed to delete ${file}:`, err.message);
      }
    }
  });

  return deletedCount;
}

async function cleanupDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('🔗 Connecting to MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('dryst_db');

    // Check current counts
    console.log('📊 Current database state:');
    const peopleCollection = db.collection('people');
    const conversationsCollection = db.collection('conversations');

    const peopleCount = await peopleCollection.countDocuments();
    const conversationsCount = await conversationsCollection.countDocuments();

    console.log(`   People: ${peopleCount}`);
    console.log(`   Conversations: ${conversationsCount}\n`);

    if (peopleCount === 0 && conversationsCount === 0) {
      console.log('✨ Database is already empty! Nothing to clean.');
      return;
    }

    // Ask for confirmation (comment this out if you want auto-delete)
    console.log('⚠️  WARNING: This will delete ALL data from both collections!');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all people
    console.log('🗑️  Deleting all people...');
    const peopleResult = await peopleCollection.deleteMany({});
    console.log(`   ✅ Deleted ${peopleResult.deletedCount} people\n`);

    // Delete all conversations
    console.log('🗑️  Deleting all conversations...');
    const conversationsResult = await conversationsCollection.deleteMany({});
    console.log(`   ✅ Deleted ${conversationsResult.deletedCount} conversations\n`);

    // Verify cleanup
    const newPeopleCount = await peopleCollection.countDocuments();
    const newConversationsCount = await conversationsCollection.countDocuments();

    console.log('📊 Database cleanup complete!');
    console.log(`   People remaining: ${newPeopleCount}`);
    console.log(`   Conversations remaining: ${newConversationsCount}\n`);

    // Clean up local files
    console.log('🗑️  Cleaning up local files...\n');

    const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
    const transcriptsDir = path.join(process.cwd(), 'public', 'transcripts');

    console.log('📁 Deleting screenshots...');
    const screenshotsDeleted = clearDirectory(screenshotsDir);
    console.log(`   ✅ Deleted ${screenshotsDeleted} screenshot(s)\n`);

    console.log('📁 Deleting transcripts...');
    const transcriptsDeleted = clearDirectory(transcriptsDir);
    console.log(`   ✅ Deleted ${transcriptsDeleted} transcript(s)\n`);

    console.log('✨ Full cleanup complete!');
    console.log(`   Total files deleted: ${screenshotsDeleted + transcriptsDeleted}`);
    console.log(`   Database entries deleted: ${peopleResult.deletedCount + conversationsResult.deletedCount}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

cleanupDatabase();
