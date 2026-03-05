import { useState } from 'react';

interface OriginalResumeDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  originalContent: string;
  originalFileName: string;
  originalFileType: 'pdf' | 'docx' | 'txt';
}

export default function OriginalResumeDrawer({
  isOpen,
  onToggle,
  originalContent,
  originalFileName,
  originalFileType,
}: OriginalResumeDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedContent, setHighlightedContent] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      setHighlightedContent(
        originalContent.replace(
          regex,
          '<mark class="bg-amber-200/80 dark:bg-amber-500/30 px-0.5 rounded">$1</mark>'
        )
      );
    } else {
      setHighlightedContent(null);
    }
  };

  const getFileIcon = () => {
    switch (originalFileType) {
      case 'pdf':
        return (
          <div className="w-9 h-9 rounded-lg bg-red-100/80 dark:bg-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case 'docx':
        return (
          <div className="w-9 h-9 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-lg bg-gray-100/80 dark:bg-dark-hover flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-40
          px-1.5 py-3 rounded-l-xl
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
          bg-accent-500/90 backdrop-blur-sm text-white
          hover:bg-accent-600 shadow-glass
        `}
        title="View Original Resume"
      >
        <div className="flex flex-col items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span
            className="text-[10px] font-medium tracking-wider"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            ORIGINAL
          </span>
        </div>
      </button>

      <div
        className={`
          fixed right-0 top-0 h-full z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: '440px' }}
      >
        <div className="h-full bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-dark-border/50 flex flex-col">
          <div className="p-4 border-b border-gray-200/30 dark:border-dark-border/30 bg-white/50 dark:bg-dark-hover/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                {getFileIcon()}
                <div>
                  <h3 className="text-sm font-semibold text-primary">Original Resume</h3>
                  <p className="text-xs text-muted truncate max-w-[200px]">{originalFileName}</p>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search in document..."
                className="glass-input w-full pl-8 pr-8 py-2 text-sm"
              />
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-gray-50/50 dark:bg-dark-bg/50 rounded-xl border border-gray-200/30 dark:border-dark-border/30 p-4">
              <div
                className="prose prose-sm max-w-none text-secondary whitespace-pre-wrap font-mono text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: highlightedContent || originalContent,
                }}
              />
            </div>
          </div>

          <div className="p-3 border-t border-gray-200/30 dark:border-dark-border/30 bg-white/50 dark:bg-dark-hover/30">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {originalContent.split(/\s+/).length} words •{' '}
                {originalContent.length} chars
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(originalContent);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-accent-600 dark:text-accent-400 hover:bg-accent-50/50 dark:hover:bg-accent-500/10 rounded-lg transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onToggle}
        />
      )}
    </>
  );
}
