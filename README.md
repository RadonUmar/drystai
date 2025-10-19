# DrystAI

> Never forget a face or conversation again.

![DrystAI Demo](public/demo.png)

*Live camera feed with AI-powered facial recognition, real-time transcription, and AR-style overlays*

## Overview

DrystAI is an AI-powered networking assistant that provides real-time facial recognition, conversation tracking, and intelligent summarization. The system captures webcam screenshots, analyzes faces using vision AI, transcribes conversations via speech recognition, and retrieves contextual information about people you've met before.

## Architecture

### Core Technologies

**Frontend**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS (Glass morphism UI)
- WebRTC for camera access
- Web Speech API for real-time transcription

**Backend**
- Next.js API Routes (serverless functions)
- MongoDB Atlas (vector search enabled)
- Google Gemini AI (vision, embeddings, NLP)
- Fetch.ai uAgents (web search integration)

**AI/ML Pipeline**
- Gemini 2.5 Flash for multimodal AI tasks
- text-embedding-004 for vector embeddings (768 dimensions)
- MongoDB Atlas Vector Search for similarity matching

## How It Works

### 1. Face Recognition System

**Input**: Webcam screenshot (JPEG image)

**Process**:
1. Image sent to Gemini Vision API (`gemini-2.5-flash`)
2. AI generates detailed 10-point facial description (structure, features, expressions, distinguishing marks)
3. Description converted to 768-dimensional vector using `text-embedding-004`
4. Vector stored in MongoDB with person metadata

**Recognition**:
1. New face embedding compared against all stored embeddings using Euclidean distance
2. Threshold: 0.3 (lower = stricter matching)
3. Match found: retrieve person record and conversation history
4. No match: create new person entry with "Unknown-[UUID]" name

**Implementation**: `lib/faceRecognitionGemini.ts`, `/api/save-screenshot/route.ts`

### 2. Conversation Transcription

**Input**: Real-time audio from microphone

**Process**:
1. Browser Web Speech API captures speech continuously
2. Interim results displayed in real-time
3. Final transcript saved to MongoDB on session end
4. Text converted to 768-dimensional embedding for semantic search
5. Linked to person via `personId` field

**Name Extraction**:
- Gemini analyzes transcript for name patterns ("My name is...", "I'm...", "Call me...")
- Automatically updates person record from "Unknown-XXX" to extracted name

**Implementation**: `app/components/LiveTranscription.tsx`, `/api/save-transcript/route.ts`, `lib/nameExtraction.ts`

### 3. AI Conversation Summarization

**Input**: All conversation transcripts for a person

**Process**:
1. Retrieve all conversations from MongoDB by `personId`
2. Concatenate transcripts with timestamps
3. Send to Gemini with structured prompt requesting:
   - Key topics discussed
   - Interests and preferences
   - Important context about the person
   - Relationship dynamics
   - Actionable insights
4. Display summary in AR-style overlay

**Implementation**: `/api/person-summary/[personId]/route.ts`, `app/components/PersonSummary.tsx`

### 4. Career Information Extraction

**Input**: Conversation history

**Process**:
1. Gemini analyzes transcripts for professional information:
   - Job title/role
   - Company name
   - Industry
   - Skills/expertise
   - Education
2. Extracted info formatted as search-friendly string
3. Query sent to Fetch.ai web search agent via AI Engine SDK
4. LinkedIn URLs and professional context retrieved from search results
5. Displayed in career info section with clickable LinkedIn link

**Implementation**: `/api/person-summary/[personId]/route.ts`, `/api/linkedin-search/route.ts`

### 5. MongoDB Vector Search

**Collections**:
- `people`: Person metadata, face embeddings (768-dim), recognition stats
- `conversations`: Transcripts, text embeddings (768-dim), timestamps

**Vector Search Configuration**:
```json
{
  "mappings": {
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

**Query Pattern**:
- Face matching: Find nearest neighbor by Euclidean distance
- Conversation search: Semantic search using text embeddings

**Implementation**: `lib/mongodb.ts`, `MONGODB_SETUP.md`

## AI Tools & APIs Used

### Google Gemini AI

**Gemini 2.5 Flash** (`gemini-2.5-flash`)
- Face analysis and detailed description generation
- Conversation summarization with contextual insights
- Name extraction from natural language
- Career information extraction from conversations

**Text Embedding Model** (`text-embedding-004`)
- Converts facial descriptions to 768-dimensional vectors
- Converts conversation transcripts to semantic embeddings
- Enables similarity-based matching and search

**API Integration**: `@google/generative-ai` SDK

### Fetch.ai uAgents

**AI Engine SDK** (`@fetchai/ai-engine-sdk`)
- Web search agent integration for LinkedIn profile discovery
- Function groups: Uses "Fetch Verified" search agents
- Session-based message handling
- Extracts LinkedIn URLs from search results

**Authentication**: JWT-based API key with write permissions

## Data Flow

```
User presses Space
    ↓
Camera captures screenshot → /api/save-screenshot
    ↓
Gemini Vision analyzes face → Generates description
    ↓
Description → text-embedding-004 → 768-dim vector
    ↓
Vector search in MongoDB → Match existing person or create new
    ↓
Start transcription (Web Speech API)
    ↓
User speaks → Real-time transcription display
    ↓
User presses Space again → Stop recording
    ↓
Save transcript → /api/save-transcript
    ↓
Extract name (if "Unknown-XXX") → Update person record
    ↓
Generate text embedding → Store in MongoDB
    ↓
Display recognition overlay + summary
    ↓
Fetch conversation summary → /api/person-summary/[personId]
    ↓
Extract career info → Query Fetch.ai → Display LinkedIn results
```

## Key Features

**Instant Recognition**: Identifies previously met people using AI-generated face embeddings with sub-second matching.

**Smart Memory**: Retrieves full conversation history, recognition count, and last interaction timestamp.

**Automatic Name Learning**: Extracts names from conversations using NLP, eliminating manual entry.

**Professional Context**: Analyzes conversations for career details and searches LinkedIn via Fetch.ai agents.

**AR-Style Interface**: Glass morphism UI with real-time overlays showing person details without obscuring camera feed.

**Privacy-First**: All data stored locally in your MongoDB instance. Face recognition uses semantic descriptions, not raw biometric data.

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Google AI Studio API key
- Fetch.ai Agentverse API key (optional, for LinkedIn search)

### Installation

```bash
# Clone repository
git clone https://github.com/RadonUmar/drystai.git
cd drystai

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Setup

Edit `.env.local`:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/drystai

# Google Gemini API key (required)
GEMINI_API_KEY=your-gemini-api-key

# Fetch.ai API key (optional - for LinkedIn search)
FETCHAI_API_KEY=your-fetchai-api-key
```

**Get API Keys**:
- Gemini: https://makersuite.google.com/app/apikey
- Fetch.ai: https://agentverse.ai/ (requires write permissions for AI Services)

### MongoDB Vector Search Setup

Create vector search index in MongoDB Atlas:

1. Navigate to Atlas Search in your cluster
2. Create search index on `people` collection
3. Use JSON configuration from `MONGODB_SETUP.md`
4. Index field: `faceEmbedding` (knnVector, 768 dimensions, euclidean similarity)

### Run Application

```bash
npm run dev
```

Open http://localhost:3000

Press **Space** to start/stop recording sessions.

## Use Cases

**Networking Events**: Automatically recognize attendees from previous conferences with conversation history.

**Sales Meetings**: Retrieve client preferences, past discussions, and professional background instantly.

**Medical/Healthcare**: Support professionals who interact with many patients, recalling previous visits and context.

**Accessibility**: Assist individuals with prosopagnosia (face blindness) or memory impairments.

## Project Structure

```
drystai/
├── app/
│   ├── api/
│   │   ├── save-screenshot/      # Face recognition endpoint
│   │   ├── save-transcript/      # Conversation storage
│   │   ├── person-summary/       # AI summarization
│   │   ├── linkedin-search/      # Fetch.ai integration
│   │   └── person/               # Person data retrieval
│   └── components/
│       ├── Camera.tsx            # Webcam capture
│       ├── LiveTranscription.tsx # Speech-to-text
│       ├── PersonRecognitionDisplay.tsx
│       └── PersonSummary.tsx     # AI insights overlay
├── lib/
│   ├── faceRecognitionGemini.ts  # Gemini Vision face analysis
│   ├── nameExtraction.ts         # NLP name parsing
│   └── mongodb.ts                # Database connection
└── public/screenshots/           # Stored face images
```

## Technical Implementation

**Face Recognition**: Rather than using traditional facial landmark detection, DrystAI uses Gemini Vision to generate semantic descriptions of faces. These descriptions are converted to embeddings, enabling recognition based on meaning rather than pixels. This approach is more robust to lighting changes, angles, and expressions.

**Vector Search**: MongoDB Atlas Vector Search performs k-nearest neighbor queries on 768-dimensional embeddings with Euclidean distance metrics. The 0.3 threshold balances false positives vs. false negatives.

**Real-time Performance**: Face analysis completes in ~2-3 seconds. Recognition matching is sub-second via MongoDB's indexed vector search. UI remains responsive through async processing and background screenshot capture.

**Conversation Linking**: Transcripts are linked to people via `personId` foreign keys. When no face is detected, conversations are stored with `personId: null`. Name extraction runs post-save, updating the person record asynchronously.

## Future Enhancements

- Multi-face detection and tracking
- Conversation search by semantic similarity
- Export contacts to standard formats (vCard, CSV)
- Integration with calendar and CRM systems
- Mobile app with AR glasses support

---

Built for the future of human connection.
