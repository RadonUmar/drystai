'use client';

import React, { useEffect, useRef, useState } from "react";

interface LiveTranscriptionProps {
  onTranscriptUpdate?: (transcript: string) => void;
  isRecording?: boolean;
  onSpacePressCallback?: (callback: (wasRecording: boolean) => void) => void;
  personId?: string | null;
  screenshotPath?: string | null;
}

const LiveTranscription: React.FC<LiveTranscriptionProps> = ({
  onTranscriptUpdate,
  isRecording = false,
  onSpacePressCallback,
  personId,
  screenshotPath
}) => {
  const [finalTranscript, setFinalTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const transcriptRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);

  const startListening = async () => {
    setDebugInfo("Requesting microphone permission...");

    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Web Speech API not supported. Please use Chrome, Edge, or Safari.");
      setDebugInfo("Browser not supported");
      return;
    }

    setDebugInfo("Browser supports Web Speech API");

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setDebugInfo("Microphone permission granted - ready to record");
      setError(null);
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setError("Microphone access denied. Please grant permission.");
      setDebugInfo("Permission denied");
      return;
    }
  };

  // Initialize recognition object once permission is granted
  useEffect(() => {
    if (!permissionGranted) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Web Speech API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setFinalTranscript((prev) => {
            const newTranscript = prev + transcriptPiece + " ";
            onTranscriptUpdate?.(newTranscript);
            return newTranscript;
          });
        } else {
          interim += transcriptPiece;
        }
      }

      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      console.error("Error type:", event.error);
      console.error("Error message:", event.message);

      if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please grant permission.");
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // This is normal - just means no speech was detected
        console.log("No speech detected, will continue listening");
      } else if (event.error === 'audio-capture') {
        setError("No microphone found. Please connect a microphone.");
        setIsListening(false);
      } else if (event.error === 'aborted') {
        // Intentional stop, ignore
        console.log("Recognition aborted intentionally");
      } else if (event.error) {
        setError(`Speech recognition error: ${event.error}`);
        setDebugInfo(`Error: ${event.error} - ${event.message || 'Unknown'}`);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setDebugInfo("Recording - speak now!");
    };

    recognition.onend = () => {
      console.log("Recognition ended. isRecordingRef:", isRecordingRef.current);
      // Only restart if we're in recording mode
      if (isRecordingRef.current) {
        try {
          console.log("Restarting recognition...");
          recognition.start();
        } catch (err) {
          console.error("Failed to restart recognition:", err);
        }
      } else {
        console.log("Not restarting - recording stopped");
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    setDebugInfo("Recognition initialized - press spacebar to start");

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [permissionGranted]);

  // Request microphone permission on mount
  useEffect(() => {
    startListening();
  }, []);

  // Sync isRecording prop to ref
  useEffect(() => {
    isRecordingRef.current = isRecording;
    console.log("isRecording changed to:", isRecording);
  }, [isRecording]);

  // Register callback with parent
  useEffect(() => {
    if (onSpacePressCallback) {
      onSpacePressCallback(async (wasRecording: boolean) => {
        console.log("Spacebar callback - wasRecording:", wasRecording);

        if (wasRecording) {
          // Stop recording and save
          isRecordingRef.current = false;
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (err) {
              console.error("Error stopping recognition:", err);
            }
            setIsListening(false);
            setDebugInfo("Recording stopped, saving transcript...");

            // Auto-save transcript
            if (finalTranscript) {
              await saveTranscript();
            }
          }
        } else {
          // Start recording
          isRecordingRef.current = true;
          setFinalTranscript(""); // Clear previous transcript
          setInterimTranscript("");

          if (!permissionGranted) {
            await startListening();
          }

          if (recognitionRef.current) {
            try {
              console.log("Starting recognition...");
              recognitionRef.current.start();
              setDebugInfo("Recording started - speak now!");
            } catch (err) {
              console.error("Failed to start recognition:", err);
              setError("Failed to start recording. Please refresh and grant microphone permission.");
            }
          } else {
            setError("Recognition not ready. Please wait a moment and try again.");
          }
        }
      });
    }
  }, [finalTranscript, permissionGranted, onSpacePressCallback, personId, screenshotPath]);

  const saveTranscript = async () => {
    try {
      const response = await fetch('/api/save-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: finalTranscript,
          personId: personId,
          screenshotPath: screenshotPath
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Transcript auto-saved to:', data.path);
        if (personId) {
          console.log('Linked to person:', personId);
        }

        // Check if name was extracted
        if (data.nameExtracted && data.newName) {
          console.log(`🎉 Name extracted! Person updated to: "${data.newName}"`);
          setDebugInfo(`Transcript saved! ✨ Learned your name: ${data.newName}`);
        } else {
          setDebugInfo(`Transcript saved to: ${data.filename}`);
        }
      } else {
        console.error('Failed to save transcript:', data.error);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };


  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [finalTranscript, interimTranscript]);

  const handleClear = () => {
    setFinalTranscript("");
    setInterimTranscript("");
    onTranscriptUpdate?.("");
  };

  const handleDownload = async () => {
    try {
      // Save to server
      const response = await fetch('/api/save-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: finalTranscript,
          personId: personId,
          screenshotPath: screenshotPath
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Transcript saved to:', data.path);
        if (personId) {
          console.log('Linked to person:', personId);
        }
      } else {
        console.error('Failed to save transcript:', data.error);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  return (
    <div className="w-full">
      {/* Compact Header */}
      <div className="bg-black/40 backdrop-blur-xl rounded-xl p-3 mb-3 border border-white/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Transcription</h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-xs text-gray-200">
                  {isListening ? 'Recording...' : isRecording ? 'Ready' : 'Idle'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="btn-glass text-xs px-2 py-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={handleDownload}
              disabled={!finalTranscript}
              className="btn-primary text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages - Compact */}
      {debugInfo && (
        <div className="mb-3 bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-blue-100 text-xs">{debugInfo}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
            <span className="text-red-100 text-xs">{error}</span>
          </div>
        </div>
      )}

      {/* Compact Transcript Display */}
      <div className="bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden border border-white/30">
        <div className="p-2 border-b border-white/20 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-200 font-medium">LIVE FEED</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <span className="text-xs text-gray-300">
              {finalTranscript.split(' ').length} words
            </span>
          </div>
        </div>
        <div
          ref={transcriptRef}
          className="p-3 h-32 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-white custom-scrollbar bg-black/10"
        >
          {finalTranscript}
          {interimTranscript && (
            <span className="text-gray-300 italic">{interimTranscript}</span>
          )}
          {!finalTranscript && !interimTranscript && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2 border border-white/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <p className="text-xs">Start speaking...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTranscription;
