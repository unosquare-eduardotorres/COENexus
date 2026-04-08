import { useEffect, useRef, useState } from 'react';

type OriginalDocxViewerProps = {
  fileUrl: string;
};

export default function OriginalDocxViewer({ fileUrl }: OriginalDocxViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    setIsLoading(true);
    (async () => {
      const res = await fetch(fileUrl);
      const arrayBuffer = await res.arrayBuffer();
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
    })();
  }, [fileUrl]);

  return (
    <div>
      {isLoading && <div className="flex items-center justify-center py-12 text-muted text-xs">Loading preview…</div>}
      <div
        ref={containerRef}
        className="w-full rounded-xl border border-gray-200/30 dark:border-dark-border/30 bg-white overflow-auto"
        style={{ maxHeight: '80vh' }}
      />
    </div>
  );
}
