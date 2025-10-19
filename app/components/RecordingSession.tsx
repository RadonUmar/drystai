'use client';

import { useState, useRef } from 'react';
import Camera from './Camera';
import LiveTranscription from './LiveTranscription';
import PersonRecognitionDisplay from './PersonRecognitionDisplay';
import PersonSummary from './PersonSummary';

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

export default function RecordingSession() {
  const [isRecording, setIsRecording] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentPerson, setCurrentPerson] = useState<{
    personId: string | null;
    personName: string | null;
    isNewPerson: boolean;
    matchConfidence?: number;
  } | null>(null);
  const [showRecognitionDisplay, setShowRecognitionDisplay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentTranscriptRef = useRef<string>("");
  const currentScreenshotPath = useRef<string>("");
  const onSpacePressRef = useRef<((isCurrentlyRecording: boolean) => void) | null>(null);

  const handleSpacePress = async (captureScreenshot: () => Promise<ScreenshotResult | null>) => {
    if (!isRecording) {
      // START recording - Show processing immediately
      console.log('Starting recording session...');
      setIsProcessing(true);

      // Start recording and transcription immediately for better UX
      setIsRecording(true);
      currentTranscriptRef.current = "";

      // Notify transcription to start right away
      if (onSpacePressRef.current) {
        onSpacePressRef.current(false);
      }

      // Process screenshot in background
      const result = await captureScreenshot();

      // Store person info and screenshot path from the result
      if (result) {
        console.log('🔍 Screenshot result:', result);

        setCurrentPerson({
          personId: result.personId,
          personName: result.personName,
          isNewPerson: result.isNewPerson,
          matchConfidence: result.matchConfidence
        });
        currentScreenshotPath.current = result.path;

        // Show recognition display if person was detected
        if (result.personId) {
          console.log('👤 Person detected! Showing recognition display...');
          console.log('   - Person ID:', result.personId);
          console.log('   - Person Name:', result.personName);
          console.log('   - Is New:', result.isNewPerson);
          console.log('   - Confidence:', result.matchConfidence);

          // Show display and keep it visible during the entire session
          setShowRecognitionDisplay(true);
        } else {
          console.log('❌ No person detected in screenshot');
        }

        // Show notification if person was recognized
        if (result.personId && !result.isNewPerson) {
          console.log(`✓ Recognized: ${result.personName}`);
        } else if (result.isNewPerson) {
          console.log(`✓ New person detected: ${result.personName}`);
        }
      } else {
        console.log('⚠️ No result from screenshot capture');
      }

      setIsProcessing(false);
    } else {
      // STOP recording - Make it instant
      console.log('Stopping recording session...');

      // Stop UI immediately for instant feedback
      setIsRecording(false);
      setSessionCount(prev => prev + 1);
      setShowRecognitionDisplay(false);

      // Notify transcription to stop and save (with personId)
      if (onSpacePressRef.current) {
        onSpacePressRef.current(true); // true = was recording, now stopping
      }

      // Clear person info immediately
      setCurrentPerson(null);
      currentScreenshotPath.current = "";

      // Take screenshot in background (non-blocking)
      captureScreenshot().catch(err => {
        console.error('Error capturing final screenshot:', err);
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Processing Animation - Shows while analyzing face */}
      {isProcessing && (
        <div className="fixed top-6 right-6 z-50 w-96 animate-slide-in">
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-blue-400/50 overflow-hidden glow-primary">
            <div className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Scanning animation */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-blue-400/20"></div>
                  <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-blue-400 animate-spin"></div>
                  <div className="absolute inset-2 w-20 h-20 rounded-full border-4 border-transparent border-t-purple-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>

                {/* Text */}
                <div className="text-center">
                  <p className="text-lg font-bold text-white mb-1">Analyzing Face</p>
                  <p className="text-sm text-gray-200">AI processing...</p>
                </div>

                {/* Progress dots */}
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Person Recognition Display - Right Side Overlay */}
      <PersonRecognitionDisplay
        personId={currentPerson?.personId || null}
        personName={currentPerson?.personName || null}
        isNewPerson={currentPerson?.isNewPerson || false}
        matchConfidence={currentPerson?.matchConfidence}
        show={showRecognitionDisplay}
      />

      {/* Person Summary - Left Side Overlay */}
      <PersonSummary
        personId={currentPerson?.personId || null}
        personName={currentPerson?.personName || null}
        show={showRecognitionDisplay}
      />

      {/* Recording Status - Compact Overlay */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`bg-black/50 backdrop-blur-xl rounded-xl px-4 py-3 transition-all duration-500 border ${
          isRecording
            ? 'glow-primary border-blue-400/50'
            : 'border-white/30'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              isRecording 
                ? 'bg-red-500 pulse-glow' 
                : 'bg-gray-500'
            }`}>
              {isRecording && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-white">
                {isRecording ? 'RECORDING' : 'Ready'}
              </span>
              <div className="text-xs text-gray-200">
                {isRecording ? 'AI analyzing...' : 'Press Space'}
              </div>
            </div>
            {sessionCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-200">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>{sessionCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Component - Fullscreen */}
      <div className="absolute inset-0 z-10">
        <Camera
          onSpacePress={handleSpacePress}
          isRecording={isRecording}
        />
      </div>

      {/* Transcription Component - Bottom Overlay */}
      <div className="absolute bottom-6 left-6 right-6 z-30">
        <LiveTranscription
          isRecording={isRecording}
          personId={currentPerson?.personId || null}
          screenshotPath={currentScreenshotPath.current || null}
          onSpacePressCallback={(callback) => {
            onSpacePressRef.current = callback;
          }}
          onTranscriptUpdate={(transcript) => {
            currentTranscriptRef.current = transcript;
          }}
        />
      </div>
    </div>
  );
}
