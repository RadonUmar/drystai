# MongoDB Atlas Setup Guide

This guide will walk you through setting up MongoDB Atlas with Vector Search for the Dryst AI application.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create a Cluster

1. After logging in, click **"Build a Database"**
2. Select **"M0 FREE"** tier (perfect for MVP)
3. Choose your preferred cloud provider and region (closest to you for best performance)
4. Name your cluster (e.g., `dryst-cluster`)
5. Click **"Create"**
6. Wait 3-5 minutes for cluster creation

## Step 3: Create Database User

1. Click **"Database Access"** in the left sidebar (under Security)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Set username (e.g., `dryst-admin`)
5. Click **"Autogenerate Secure Password"** and **SAVE THIS PASSWORD**
6. Under "Database User Privileges", select **"Read and write to any database"**
7. Click **"Add User"**

## Step 4: Configure Network Access

1. Click **"Network Access"** in the left sidebar (under Security)
2. Click **"Add IP Address"**
3. For development, click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ For production, restrict this to your specific IP addresses
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Go back to **"Database"** in the left sidebar
2. Click **"Connect"** button on your cluster
3. Choose **"Drivers"**
4. Select **"Node.js"** and version **"5.5 or later"**
5. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster...`)
6. Replace `<password>` with your actual password from Step 3
7. Replace `<database>` with `dryst_db`

Example final connection string:
```
mongodb+srv://dryst-admin:YourPassword123@dryst-cluster.abc123.mongodb.net/dryst_db?retryWrites=true&w=majority
```

## Step 6: Add Environment Variables

1. Create a `.env.local` file in the root of your project:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   MONGODB_URI=mongodb+srv://dryst-admin:YourPassword123@dryst-cluster.abc123.mongodb.net/dryst_db?retryWrites=true&w=majority
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. Get your Gemini API key from: https://makersuite.google.com/app/apikey

## Step 7: Create Vector Search Indexes

This is **CRITICAL** for the face recognition and conversation search features to work!

### Create Index for Face Recognition (people collection)

1. In MongoDB Atlas, go to your cluster
2. Click **"Browse Collections"**
3. If you don't see `dryst_db` database yet, it will be created automatically when you first run the app. Skip to "Run the app first" below.
4. If `dryst_db` exists, click on the **"people"** collection
5. Click the **"Search Indexes"** tab
6. Click **"Create Search Index"**
7. Choose **"JSON Editor"**
8. Click **"Next"**
9. Paste this configuration:

```json
{
    "mappings": {
      "dynamic": false,
      "fields": {
        "faceEmbedding": {
          "type": "knnVector",
          "dimensions": 768,
          "similarity": "euclidean"
        }
      }
    }
  }
```

10. Name it: `face_vector_index`
11. Click **"Next"** and then **"Create Search Index"**

### Create Index for Conversation Search (conversations collection)

1. Click on the **"conversations"** collection
2. Click the **"Search Indexes"** tab
3. Click **"Create Search Index"**
4. Choose **"JSON Editor"**
5. Click **"Next"**
6. Paste this configuration:

```json
  {
    "mappings": {
      "dynamic": false,
      "fields": {
        "transcriptEmbedding": {
          "type": "knnVector",
          "dimensions": 768,
          "similarity": "cosine"
        }
      }
    }
  }
```

7. Name it: `conversation_vector_index`
8. Click **"Next"** and then **"Create Search Index"**

### ⚠️ Important: Wait for Index Building

After creating the indexes, wait for them to show status **"Active"** (may take 1-2 minutes).

## Step 8: Run the App First (If Collections Don't Exist)

If you don't see the collections yet:

1. Make sure your `.env.local` is configured with MongoDB URI and Gemini API key
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Open the app and take a screenshot (press Space once)
4. This will create the collections automatically
5. Go back to MongoDB Atlas and follow Step 7 to create the vector indexes

## Step 9: Verify Everything Works

1. Start your app:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Press **Space** to start recording:
   - A screenshot should be captured
   - Face recognition should run
   - Check browser console for: `"New person detected: Unknown-..."`

4. Speak something, then press **Space** again to stop:
   - Transcript should be saved
   - Check browser console for: `"Transcript auto-saved to: ..."`

5. Check MongoDB Atlas:
   - Go to **"Browse Collections"**
   - You should see documents in both `people` and `conversations` collections

## Testing Face Recognition

1. Take a screenshot with your face (Space)
2. Start recording (the app knows it's you)
3. Close the tab and restart
4. Take another screenshot with your face
5. Check the browser console - it should say **"Person recognized: Unknown-..."** with a confidence score!

## Testing Conversation Search (via API)

You can test the search endpoint using curl:

```bash
curl -X POST http://localhost:3000/api/search-conversations \
  -H "Content-Type: application/json" \
  -d '{
    "query": "what did I talk about",
    "limit": 5
  }'
```

## Troubleshooting

### "MongoNetworkError: connection refused"
- Check that your IP is whitelisted in Network Access
- Verify your connection string is correct in `.env.local`

### "No face detected in image"
- Ensure good lighting
- Face the camera directly
- Try adjusting your position

### "Vector search index not found"
- Make sure you created the vector search indexes in Step 7
- Verify they are in "Active" status
- Check that index names match exactly: `face_vector_index` and `conversation_vector_index`

### "GEMINI_API_KEY is not defined"
- Make sure you added the Gemini API key to `.env.local`
- Restart your development server after adding the key

## Next Steps

Once everything is working:
- Test face recognition with different people
- Try searching for conversations
- Use the person lookup endpoint: `GET /api/person/{personId}`

## Production Deployment

Before deploying to production:
1. Change Network Access to restrict to your production IPs
2. Use environment variables for sensitive data (never commit `.env.local`)
3. Consider upgrading to a paid MongoDB Atlas tier for better performance
4. Enable MongoDB Atlas monitoring and alerts

---

**Need help?** Check the MongoDB Atlas documentation: https://docs.atlas.mongodb.com/
