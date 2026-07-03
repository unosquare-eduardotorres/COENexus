import { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { StructuredResume } from '../types';
import { templateFillService } from '../services/templateFillService';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('PdfPreviewPanel');

interface PdfPreviewPanelProps {
  resume: StructuredResume;
}

function getNameFontSize(name: string): string {
  const len = name.length;
  if (len <= 25) return '32px';
  if (len <= 35) return '26px';
  if (len <= 45) return '22px';
  return '18px';
}

export default function PdfPreviewPanel({ resume }: PdfPreviewPanelProps) {
  const [scale, setScale] = useState(0.85);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [headerImgUrl, setHeaderImgUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    setIsLoading(true);
    setError(null);

    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      try {
        const docxBlob = await templateFillService.fillTemplate(resume);
        if (cancelled) return;

        const arrayBuffer = await docxBlob.arrayBuffer();
        if (cancelled || !containerRef.current) return;

        const zip = await JSZip.loadAsync(arrayBuffer);
        const headerImgFile = zip.file('word/media/image2.png');
        if (headerImgFile) {
          const imgBlob = await headerImgFile.async('blob');
          blobUrl = URL.createObjectURL(imgBlob);
          if (!cancelled) setHeaderImgUrl(blobUrl);
        } else {
          if (!cancelled) setHeaderImgUrl(null);
        }

        if (cancelled || !containerRef.current) return;

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
        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError('Failed to generate preview');
          setIsLoading(false);
          log.error('Template preview error:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [resume, retryCount]);

  useEffect(() => {
    return () => {
      if (headerImgUrl) URL.revokeObjectURL(headerImgUrl);
    };
  }, []);

  const latestTitle = resume.experience?.[0]?.title || 'Professional';

  return (
    <div className="glass-card h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/30 dark:border-dark-border/30">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-primary">Resume Preview</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/50 dark:bg-dark-surface/50 rounded-lg p-1">
            <button
              onClick={() => setScale(Math.max(0.3, scale - 0.1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors disabled:opacity-50"
              disabled={scale <= 0.3}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-xs font-medium text-secondary px-2 min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(Math.min(1.5, scale + 0.1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors disabled:opacity-50"
              disabled={scale >= 1.5}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-dark-surface/50 p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted">Generating template preview…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-10 h-10 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-red-500 font-medium">{error}</p>
            <button
              onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
              className="px-3 py-1.5 text-xs font-medium text-accent-500 bg-accent-50/50 dark:bg-accent-500/10 rounded-lg hover:bg-accent-100/50 dark:hover:bg-accent-500/20 transition-colors"
            >
              Retry Preview
            </button>
          </div>
        )}
        <div
          className="mx-auto origin-top"
          style={{
            width: `${100 / scale}%`,
            maxWidth: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {headerImgUrl && !isLoading && !error && (
            <div
              className="relative w-full overflow-hidden bg-white shadow-xl mx-auto"
              style={{
                aspectRatio: '2570 / 540',
                backgroundImage: `url(${headerImgUrl}), linear-gradient(135deg, #1a237e 0%, #304FF3 50%, #1565c0 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 flex flex-col justify-center px-8">
                <h2
                  className="font-bold text-white leading-tight"
                  style={{ fontSize: getNameFontSize(resume.candidateName) }}
                >
                  {resume.candidateName}
                </h2>
                <p className="text-white/90 mt-1" style={{ fontSize: '14px' }}>
                  {latestTitle}
                </p>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            className="bg-white shadow-xl rounded-sm mx-auto"
          />
        </div>
      </div>
    </div>
  );
}
