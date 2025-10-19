'use client';

import { useState, useEffect } from 'react';

interface PersonSummaryProps {
  personId: string | null;
  personName: string | null;
  show: boolean;
}

interface LinkedInInfo {
  summary: string;
  source: string;
  linkedInUrl?: string | null;
}

export default function PersonSummary({ personId, personName, show }: PersonSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [careerInfo, setCareerInfo] = useState<string | null>(null);
  const [linkedInInfo, setLinkedInInfo] = useState<LinkedInInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show && personId) {
      fetchSummary(personId);
    } else {
      setSummary(null);
      setCareerInfo(null);
      setLinkedInInfo(null);
    }
  }, [show, personId]);

  const fetchSummary = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Generating AI summary for person:', id);
      const response = await fetch(`/api/person-summary/${id}`);

      const data = await response.json();
      console.log('📥 API Response:', data);

      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || data.details || 'Failed to generate summary');
      }

      console.log('✅ Summary received:', data.summary);
      setSummary(data.summary);

      // Set career info and LinkedIn data if available
      if (data.careerInfo) {
        console.log('💼 Career info:', data.careerInfo);
        setCareerInfo(data.careerInfo);
      }

      if (data.linkedInInfo) {
        console.log('🔗 LinkedIn info:', data.linkedInInfo);
        setLinkedInInfo(data.linkedInInfo);
      }
    } catch (err) {
      console.error('❌ Error fetching summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed top-6 left-6 z-50 w-96 animate-slide-in">
      <div className="bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-purple-400/50 overflow-hidden glow-secondary">
        {/* Header */}
        <div className="p-6 border-b border-white/20 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-4 h-4 rounded-full bg-purple-400 animate-pulse"></div>
                <div className="absolute inset-0 w-4 h-4 rounded-full bg-purple-400 animate-ping opacity-30"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Summary</h3>
                <p className="text-sm text-gray-200">Conversation Insights</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              <span className="text-xs text-white font-medium">AI</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 bg-black/10 max-h-[500px] overflow-y-auto custom-scrollbar">
          {/* Person Name */}
          {personName && (
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-center">
              <p className="text-sm text-gray-200 mb-1">ANALYZING</p>
              <p className="text-lg font-bold text-white">{personName}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-purple-400 mx-auto"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-400 animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
              </div>
              <p className="text-sm text-gray-200 mt-4">Analyzing conversations...</p>
              <div className="flex gap-2 justify-center mt-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
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

          {/* Summary Content */}
          {summary && !loading && (
            <div className="space-y-4">
              {/* Conversation Insights */}
              <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-sm font-medium text-purple-200">KEY INSIGHTS</p>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </p>
                </div>
              </div>

              {/* Career/LinkedIn Section */}
              {(careerInfo || linkedInInfo) && (
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-5 border border-pink-400/30">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm font-medium text-pink-200">CAREER INFO</p>
                  </div>

                  {/* Extracted Career Info */}
                  {careerInfo && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
                        <span className="text-xs font-medium text-pink-300">From Conversations</span>
                      </div>
                      <p className="text-sm text-white pl-3.5">{careerInfo}</p>
                    </div>
                  )}

                  {/* LinkedIn Search Results */}
                  {linkedInInfo && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-blue-300">Web Search Results</span>
                        <span className="text-xs text-gray-400">({linkedInInfo.source})</span>
                      </div>
                      <p className="text-sm text-white leading-relaxed pl-3.5">
                        {linkedInInfo.summary}
                      </p>

                      {/* LinkedIn Profile Link */}
                      {linkedInInfo.linkedInUrl && (
                        <div className="mt-3 pl-3.5">
                          <a
                            href={linkedInInfo.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg transition-all duration-200 hover:scale-105"
                          >
                            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            <span className="text-sm font-medium text-blue-300">View LinkedIn Profile</span>
                            <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!summary && !loading && !error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-gray-300">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Start talking to see AI insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
