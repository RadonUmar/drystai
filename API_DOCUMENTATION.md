# API Documentation

## Overview

This application uses face recognition and conversation transcription to build a personal memory system. When you meet someone, the app recognizes their face and links all conversations to that person.

## Core Features

1. **Face Recognition**: Detects and recognizes faces from screenshots
2. **Conversation Tracking**: Transcribes and stores conversations linked to recognized people
3. **Vector Search**: Semantic search through conversations using AI embeddings

---

## API Endpoints

### 1. Save Screenshot (with Face Recognition)

**Endpoint**: `POST /api/save-screenshot`

**Description**: Saves a screenshot, extracts face embedding, and recognizes the person.

**Request**:
```typescript
FormData {
  image: Blob (PNG image)
}
```

**Response**:
```typescript
{
  success: boolean;
  filename: string;
  path: string;
  personId: string | null;
  personName: string | null;
  isNewPerson: boolean;
  noFaceDetected?: boolean;
  matchConfidence?: number;
}
```

---

### 2. Save Transcript

**Endpoint**: `POST /api/save-transcript`

**Request**:
```typescript
{
  transcript: string;
  personId?: string | null;
  screenshotPath?: string | null;
}
```

**Response**:
```typescript
{
  success: boolean;
  filename: string;
  path: string;
  conversationId: string;
  personId: string | null;
}
```

---

### 3. Get Person Details

**Endpoint**: `GET /api/person/{personId}`

**Response**:
```typescript
{
  person: {
    personId: string;
    name: string;
    profilePhotoPath: string;
    firstSeen: Date;
    lastSeen: Date;
    conversationCount: number;
    timesRecognized: number;
  };
  conversations: Array<{
    id: string;
    timestamp: Date;
    transcript: string;
    screenshotPath: string;
    wordCount: number;
  }>;
}
```

---

### 4. Search Conversations

**Endpoint**: `POST /api/search-conversations`

**Request**:
```typescript
{
  query: string;
  personId?: string;
  limit?: number;
}
```

**Response**:
```typescript
{
  query: string;
  results: Array<{
    id: string;
    personId: string;
    timestamp: Date;
    transcript: string;
    relevanceScore: number;
  }>;
}
```
