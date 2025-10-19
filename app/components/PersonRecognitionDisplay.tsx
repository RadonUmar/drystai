'use client';

import { useState, useEffect } from 'react';

interface PersonData {
  person: {
    personId: string;
    name: string;
    profilePhotoPath: string;
    firstSeen: string;
    lastSeen: string;
    conversationCount: number;
    timesRecognized: number;
  };
  conversations: {
    id: string;
    timestamp: string;
    transcript: string;
    screenshotPath: string;
    transcriptPath: string;
    wordCount: number;
  }[];
  totalConversations: number;
}

interface PersonRecognitionDisplayProps {
  personId: string | null;
  personName: string | null;
  isNewPerson: boolean;
  matchConfidence?: number;
  show: boolean;
}

export default function PersonRecognitionDisplay({
  personId,
  personName,
  isNewPerson,
  matchConfidence,
  show
}: PersonRecognitionDisplayProps) {
  const [personData, setPersonData] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('📊 PersonRecognitionDisplay state:', { show, personId, personName, isNewPerson, matchConfidence });

    if (show && personId && !isNewPerson) {
      // Fetch full person data including conversation history
      console.log('📡 Fetching person data for:', personId);
      fetchPersonData(personId);
    } else {
      setPersonData(null);
    }
  }, [show, personId, isNewPerson]);

  const fetchPersonData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🌐 Fetching from /api/person/' + id);
      const response = await fetch(`/api/person/${id}`);
      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to fetch person data');
      }
      const data = await response.json();
      console.log('✅ Person data received:', data);
      setPersonData(data);
    } catch (err) {
      console.error('❌ Error fetching person data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-6 right-6 z-50 w-96 animate-slide-in">
      <div className="bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden glow-primary">
        {/* AR-style Header */}
        <div className="p-6 border-b border-white/20 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse"></div>
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-400 animate-ping opacity-30"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {isNewPerson ? 'New Contact' : 'Contact Recognized'}
                </h3>
                <p className="text-sm text-gray-200">
                  {isNewPerson ? 'First encounter' : 'AI Memory Active'}
                </p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              <span className="text-xs text-white font-medium">AR</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-black/10">
          {/* Person Name with AR styling */}
          <div className="text-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/20">
              <p className="text-sm text-gray-200 mb-2">IDENTITY</p>
              <p className="text-2xl font-bold text-white">{personName}</p>
            </div>
          </div>

          {/* Confidence Score with AR visualization */}
          {matchConfidence !== undefined && !isNewPerson && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-sm text-gray-200 mb-3">CONFIDENCE MATRIX</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Recognition</span>
                  <span className="text-sm font-bold text-white">
                    {(matchConfidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="h-3 bg-gray-800/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 transition-all duration-1000"
                      style={{ width: `${matchConfidence * 100}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State with AR styling */}
          {loading && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mx-auto"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <p className="text-sm text-gray-200 mt-4">Loading memory banks...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <p className="text-sm text-red-200">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Person Stats with AR grid */}
          {personData && !loading && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                  <div className="w-8 h-8 bg-blue-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-sm font-bold">👁</span>
                  </div>
                  <p className="text-xs text-gray-200 mb-1">ENCOUNTERS</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.floor(personData.person.timesRecognized / 2)}
                  </p>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20">
                  <div className="w-8 h-8 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-sm font-bold">💬</span>
                  </div>
                  <p className="text-xs text-gray-200 mb-1">CONVERSATIONS</p>
                  <p className="text-2xl font-bold text-white">
                    {personData.person.conversationCount}
                  </p>
                </div>
              </div>

              {/* Recent Conversations with AR styling */}
              {personData.conversations.length > 0 && (
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <p className="text-sm text-gray-200 mb-4 font-medium">MEMORY LOG</p>
                  <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                    {personData.conversations.slice(0, 3).map((conv, index) => (
                      <div
                        key={conv.id}
                        className="bg-black/20 backdrop-blur-sm rounded-xl p-3 hover:bg-white/5 transition-all duration-300 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <p className="text-xs text-gray-300">
                            {new Date(conv.timestamp).toLocaleDateString()} at{' '}
                            {new Date(conv.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <p className="text-sm text-white line-clamp-2 mb-1">
                          {conv.transcript || 'No transcript available'}
                        </p>
                        <p className="text-xs text-gray-300">
                          {conv.wordCount} words • Session #{index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <p className="text-sm text-gray-200 mb-3 font-medium">TIMELINE</p>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex justify-between">
                    <span>First contact:</span>
                    <span>{new Date(personData.person.firstSeen).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last seen:</span>
                    <span>{new Date(personData.person.lastSeen).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* New Person Message with AR styling */}
          {isNewPerson && (
            <div className="bg-blue-500/20 backdrop-blur-sm border border-blue-400/50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-400/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-400 text-sm">+</span>
                </div>
                <div>
                  <p className="text-sm text-blue-200 font-medium mb-1">New Contact Added</p>
                  <p className="text-xs text-blue-100">
                    Profile created and added to recognition database. Future encounters will be automatically identified.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
