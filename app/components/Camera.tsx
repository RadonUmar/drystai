'use client';

import { useEffect, useRef, useState } from 'react';

interface ScreenshotResult {
  success: boolean;
  filename: string;
  path: string;
  personId: string | null;
  personName: string | null;
  isNewPerson: boolean;
  noFaceDetected?: boolean;
  matchConfidence?: number;
}

interface CameraProps {
  onSpacePress?: (captureScreenshot: () => Promise<ScreenshotResult | null>) => Promise<void>;
  isRecording?: boolean;
}

export default function Camera({ onSpacePress, isRecording = false }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [screenshotCount, setScreenshotCount] = useState(0);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Use front camera by default
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          setError(null);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to access camera. Please ensure you have granted camera permissions.'
        );
        setIsStreaming(false);
      }
    };

    startCamera();

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureScreenshot = async (): Promise<ScreenshotResult | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas (flip if mirrored)
    if (isMirrored) {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Convert to blob and save to server
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        try {
          const formData = new FormData();
          formData.append('image', blob, 'screenshot.png');

          const response = await fetch('/api/save-screenshot', {
            method: 'POST',
            body: formData,
          });

          const data: ScreenshotResult = await response.json();

          if (data.success) {
            console.log('Screenshot saved to:', data.path);
            if (data.personId) {
              if (data.isNewPerson) {
                console.log('New person detected:', data.personName);
              } else {
                console.log('Person recognized:', data.personName, `(confidence: ${(data.matchConfidence || 0) * 100}%)`);
              }
            } else if (data.noFaceDetected) {
              console.log('No face detected in screenshot');
            }
            setScreenshotCount(prev => prev + 1);
            setLastScreenshot(new Date().toLocaleTimeString());
            resolve(data);
          } else {
            console.error('Failed to save screenshot:', data);
            resolve(null);
          }
        } catch (error) {
          console.error('Error saving screenshot:', error);
          resolve(null);
        }
      }, 'image/png');
    });
  };

  useEffect(() => {
    const handleKeyPress = async (e: KeyboardEvent) => {
      if (e.code === 'Space' && isStreaming) {
        e.preventDefault();

        if (onSpacePress) {
          // Use parent's handler
          await onSpacePress(captureScreenshot);
        } else {
          // Fallback to just screenshot
          await captureScreenshot();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isStreaming, isMirrored, onSpacePress]);

  return (
    <div className="relative w-full h-full">
      {/* Hidden canvas for screenshot capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Fullscreen Camera Feed */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Camera overlay effects */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <div className="absolute top-4 right-4 flex gap-2">
            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full"></div>
          </div>
          <div className="absolute bottom-4 left-4 glass-subtle px-3 py-1 rounded-full">
            <span className="text-xs text-white font-medium">AI VISION</span>
          </div>
        </div>

        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center z-30">
            <div className="glass-strong rounded-2xl p-8 max-w-md border border-red-500/30">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-red-200 font-medium text-lg">{error}</p>
            </div>
          </div>
        ) : !isStreaming ? (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-blue-400 mx-auto mb-4"></div>
              <p className="text-white/60">Initializing camera...</p>
            </div>
          </div>
        ) : null}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isMirrored ? 'scale-x-[-1]' : ''}`}
        />
      </div>

      {/* Compact Control Panel - Bottom Right Overlay */}
      <div className="absolute bottom-6 right-6 z-30">
        <div className="glass rounded-xl p-3">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className="btn-glass text-xs px-3 py-2 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isMirrored ? 'Unmirror' : 'Mirror'}
            </button>

            <button
              onClick={captureScreenshot}
              disabled={!isStreaming}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Capture
            </button>

            <div className="glass-subtle px-3 py-2 rounded-lg flex items-center gap-2 border border-green-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-xs font-medium">
                {isStreaming ? 'Live' : 'Connecting...'}
              </span>
            </div>

            {screenshotCount > 0 && (
              <div className="glass-subtle px-3 py-2 rounded-lg flex items-center gap-2 border border-blue-400/30">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-blue-300 text-xs font-medium">
                  {screenshotCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
