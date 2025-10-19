import * as faceapi from '@vladmandic/face-api';
import sharp from 'sharp';
import * as path from 'path';
import { readFileSync } from 'fs';

let modelsLoaded = false;

// Custom Canvas implementation for Node.js using sharp
class NodeCanvas {
  data: Buffer;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }
}

class NodeImage {
  data: Buffer | null = null;
  width: number = 0;
  height: number = 0;

  constructor() {}

  get src(): string {
    return '';
  }

  set src(value: string) {
    // This will be handled by our custom loading
  }
}

// Patch environment for Node.js
if (typeof window === 'undefined') {
  const { Canvas, Image, ImageData } = faceapi.env.getEnv().Canvas
    ? faceapi.env.getEnv()
    : { Canvas: NodeCanvas, Image: NodeImage, ImageData: class {} };

  // @ts-ignore
  faceapi.env.monkeyPatch({ Canvas: NodeCanvas, Image: NodeImage, ImageData });
}

async function loadModels() {
  if (modelsLoaded) return;

  const MODEL_URL = path.join(process.cwd(), 'public/models');

  try {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
  } catch (error) {
    console.error('Error loading face recognition models:', error);
    throw error;
  }
}

export async function extractFaceEmbedding(imagePath: string): Promise<number[] | null> {
  try {
    console.log('🤖 Loading face recognition models...');
    await loadModels();
    console.log('✅ Models loaded');

    // Read and process image with sharp
    console.log('📖 Reading image from:', imagePath);
    const imageBuffer = readFileSync(imagePath);
    console.log('📐 Processing image with sharp...');
    const { data, info } = await sharp(imageBuffer)
      .resize(640, 480, { fit: 'inside' })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    console.log(`✅ Image processed: ${info.width}x${info.height}`);

    // Create ImageData-like object for face-api
    const pixels = new Uint8Array(data);
    const canvas = {
      width: info.width,
      height: info.height,
      getContext: () => ({
        getImageData: () => ({
          data: pixels,
          width: info.width,
          height: info.height,
        }),
      }),
    };

    // Detect face and extract descriptor
    console.log('👁️ Detecting face...');
    // @ts-ignore - face-api works with our custom canvas object
    const detections = await faceapi
      .detectSingleFace(canvas as any)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detections) {
      console.log('❌ No face detected in image:', imagePath);
      return null;
    }

    console.log('✅ Face detected! Descriptor length:', detections.descriptor.length);
    // Return the 128-dimensional face descriptor as array
    return Array.from(detections.descriptor);
  } catch (error) {
    console.error('❌ Error extracting face embedding:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}

// Calculate Euclidean distance between two face embeddings
export function calculateFaceDistance(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same length');
  }

  let sum = 0;
  for (let i = 0; i < embedding1.length; i++) {
    const diff = embedding1[i] - embedding2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// Check if two faces match (distance threshold of 0.6 is standard for face recognition)
export function facesMatch(embedding1: number[], embedding2: number[], threshold: number = 0.6): boolean {
  const distance = calculateFaceDistance(embedding1, embedding2);
  return distance < threshold;
}
