# Quick Start Guide

Get your face recognition + conversation tracking app running in 15 minutes.

---

## Prerequisites

- Node.js installed
- MongoDB Atlas account (free)
- Gemini API key (free)

---

## Step 1: MongoDB Atlas Setup (5 minutes)

### Create Cluster
1. Go to https://cloud.mongodb.com/
2. Create free M0 cluster
3. Create database user (save password!)
4. Allow network access from anywhere (0.0.0.0/0)
5. Get connection string

### Get Connection String
```
mongodb+srv://username:PASSWORD@cluster.mongodb.net/dryst_db?retryWrites=true&w=majority
```

---

## Step 2: Environment Setup (2 minutes)

### Create `.env.local` file

```bash
cp .env.example .env.local
```

### Edit `.env.local`

```env
MONGODB_URI=mongodb+srv://your-user:your-password@cluster.mongodb.net/dryst_db?retryWrites=true&w=majority
GEMINI_API_KEY=your-gemini-key-from-makersuite
```

Get Gemini key: https://makersuite.google.com/app/apikey

---

## Step 3: Run the App (1 minute)

```bash
npm run dev
```

Open http://localhost:3000

---

## Step 4: Test It (2 minutes)

### Create First Person
1. Press **Space** (take screenshot)
2. Wait 2 seconds
3. Check browser console: `"New person detected: Unknown-..."`
4. Speak something
5. Press **Space** again (stop recording)
6. Check console: `"Transcript auto-saved..."`

### Test Recognition
1. Close browser tab
2. Open http://localhost:3000 again
3. Press **Space**
4. Check console: `"Person recognized: Unknown-... (confidence: XX%)"`

✅ **It works!** Your face was recognized.

---

## Step 5: Create Vector Search Indexes (5 minutes)

**⚠️ CRITICAL:** Without these indexes, search won't work!

### In MongoDB Atlas

1. Go to your cluster → **Browse Collections**
2. You should see `dryst_db` database with `people` and `conversations` collections
3. Click **`people`** collection → **Search Indexes** tab
4. Click **Create Search Index** → **JSON Editor**
5. Paste this:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "faceEmbedding",
      "numDimensions": 128,
      "similarity": "euclidean"
    }
  ]
}
```

6. Name: `face_vector_index`
7. Click **Create**

8. Click **`conversations`** collection → **Search Indexes** tab
9. Click **Create Search Index** → **JSON Editor**
10. Paste this:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "transcriptEmbedding",
      "numDimensions": 768,
      "similarity": "cosine"
    }
  ]
}
```

11. Name: `conversation_vector_index`
12. Click **Create**

**Wait 1-2 minutes** for indexes to become **Active**.

---

## Step 6: Test Search (2 minutes)

### Search Conversations

```bash
curl -X POST http://localhost:3000/api/search-conversations \
  -H "Content-Type: application/json" \
  -d '{"query": "what did I say", "limit": 5}'
```

You should see your transcript in the results!

---

## 🎉 Done!

Your app is fully functional:
- ✅ Face recognition working
- ✅ Conversations saved to MongoDB
- ✅ Vector search enabled

---

## Common Issues

### "No face detected"
- Ensure good lighting
- Face the camera directly
- Try different position

### "MongoNetworkError"
- Check MongoDB URI in `.env.local`
- Verify IP whitelist (0.0.0.0/0)

### "GEMINI_API_KEY is not defined"
- Add key to `.env.local`
- Restart dev server

### Search not working
- Create vector search indexes (Step 5)
- Wait for indexes to be Active
- Check index names match exactly

---

## Next Steps

- Read **IMPLEMENTATION_SUMMARY.md** for architecture details
- Read **API_DOCUMENTATION.md** for endpoint reference
- Read **MONGODB_SETUP.md** for detailed setup info

---

## API Quick Reference

```bash
# Get person details
curl http://localhost:3000/api/person/{personId}

# Search conversations
curl -X POST http://localhost:3000/api/search-conversations \
  -H "Content-Type: application/json" \
  -d '{"query": "topic to search", "limit": 10}'

# Search by person
curl -X POST http://localhost:3000/api/search-conversations \
  -H "Content-Type: application/json" \
  -d '{"query": "topic", "personId": "person-abc123"}'
```

---

**You're all set! Start meeting people and never forget a conversation again.** 🚀
