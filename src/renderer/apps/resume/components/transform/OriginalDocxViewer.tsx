import { useEffect, useRef, useState } from 'react';

type OriginalDocxViewerProps = {
  fileUrl?: string;
  buffer?: ArrayBuffer;
};

export default function OriginalDocxViewer({ fileUrl, buffer }: OriginalDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        let arrayBuffer: ArrayBuffer;
        if (buffer) {
          arrayBuffer = buffer;
        } else if (fileUrl) {
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
          arrayBuffer = await res.arrayBuffer();
        } else {
          setIsLoading(false);
          return;
        }
        const docxPreview = await import('docx-preview');
        await docxPreview.renderAsync(arrayBuffer, container, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err.message : 'Failed to load document preview');
      }
    })();
  }, [fileUrl, buffer]);

  return (
    <div>
      {isLoading && <div className="flex items-center justify-center py-12 text-muted text-xs">Loading preview…</div>}
      {error && (
        <div className="flex items-center justify-center py-8 text-red-500 dark:text-red-400 text-sm">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-gray-200/30 dark:border-dark-border/30 bg-white overflow-auto"
        style={{ maxHeight: '80vh' }}
      />
    </div>
  );
}
