'use client';

import { useState, useRef } from 'react';
import Camera from './Camera';
import LiveTranscription from './LiveTranscription';
import PersonRecognitionDisplay from './PersonRecognitionDisplay';

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
  const currentTranscriptRef = useRef<string>("");
  const currentScreenshotPath = useRef<string>("");
  const onSpacePressRef = useRef<((isCurrentlyRecording: boolean) => void) | null>(null);

  const handleSpacePress = async (captureScreenshot: () => Promise<ScreenshotResult | null>) => {
    if (!isRecording) {
      // START recording
      console.log('Starting recording session...');
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

      setIsRecording(true);
      currentTranscriptRef.current = ""; // Clear transcript for new session

      // Notify transcription to start
      if (onSpacePressRef.current) {
        onSpacePressRef.current(false); // false = was not recording, now starting
      }
    } else {
      // STOP recording
      console.log('Stopping recording session...');
      await captureScreenshot();

      // Notify transcription to stop and save (with personId)
      if (onSpacePressRef.current) {
        onSpacePressRef.current(true); // true = was recording, now stopping
      }

      setIsRecording(false);
      setSessionCount(prev => prev + 1);

      // Hide the recognition display when session ends
      setShowRecognitionDisplay(false);

      // Clear person info for next session
      setCurrentPerson(null);
      currentScreenshotPath.current = "";
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Person Recognition Display - Overlay */}
      <PersonRecognitionDisplay
        personId={currentPerson?.personId || null}
        personName={currentPerson?.personName || null}
        isNewPerson={currentPerson?.isNewPerson || false}
        matchConfidence={currentPerson?.matchConfidence}
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
