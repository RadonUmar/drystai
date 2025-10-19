import sharp from 'sharp';
import { readFileSync } from 'fs';

/**
 * Simple and fast image comparison using pixel similarity
 * Resizes images to same size and compares pixel values
 */
export async function compareImages(imagePath1: string, imagePath2: string): Promise<number> {
  try {
    // Standard size for comparison - small for speed
    const compareSize = 64;

    // Load and resize both images to same dimensions
    const img1Buffer = readFileSync(imagePath1);
    const img2Buffer = readFileSync(imagePath2);

    const [img1Data, img2Data] = await Promise.all([
      sharp(img1Buffer)
        .resize(compareSize, compareSize, { fit: 'cover' })
        .grayscale() // Convert to grayscale for simpler comparison
        .raw()
        .toBuffer(),
      sharp(img2Buffer)
        .resize(compareSize, compareSize, { fit: 'cover' })
        .grayscale()
        .raw()
        .toBuffer()
    ]);

    // Calculate pixel difference
    let totalDifference = 0;
    const pixelCount = compareSize * compareSize;

    for (let i = 0; i < img1Data.length; i++) {
      const diff = Math.abs(img1Data[i] - img2Data[i]);
      totalDifference += diff;
    }

    // Normalize to 0-1 range (0 = identical, 1 = completely different)
    const similarity = totalDifference / (pixelCount * 255);

    return similarity;
  } catch (error) {
    console.error('Error comparing images:', error);
    return 1; // Return max difference on error
  }
}

/**
 * Generate a simple perceptual hash for fast lookup
 * Returns a string hash that similar images will have similar hashes
 */
export async function generateImageHash(imagePath: string): Promise<string> {
  try {
    const hashSize = 8;

    const buffer = readFileSync(imagePath);
    const imageData = await sharp(buffer)
      .resize(hashSize, hashSize, { fit: 'cover' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average pixel value
    let sum = 0;
    for (let i = 0; i < imageData.length; i++) {
      sum += imageData[i];
    }
    const average = sum / imageData.length;

    // Create hash: 1 if above average, 0 if below
    let hash = '';
    for (let i = 0; i < imageData.length; i++) {
      hash += imageData[i] > average ? '1' : '0';
    }

    return hash;
  } catch (error) {
    console.error('Error generating image hash:', error);
    return '';
  }
}

/**
 * Calculate hamming distance between two hashes
 * Returns number of different bits (lower = more similar)
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}
