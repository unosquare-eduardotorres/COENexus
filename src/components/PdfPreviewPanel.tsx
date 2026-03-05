import { useMemo, useState, useEffect } from 'react';
import { StructuredResume } from '../types';
import { pdfExportService } from '../services/pdfExportService';

interface PdfPreviewPanelProps {
  resume: StructuredResume;
  onExport: () => void;
}

export default function PdfPreviewPanel({ resume, onExport }: PdfPreviewPanelProps) {
  const [scale, setScale] = useState(0.75);
  const [previewSrc, setPreviewSrc] = useState<string>('');

  const previewHtml = useMemo(() => {
    return pdfExportService.generatePreviewHtml(resume);
  }, [resume]);

  useEffect(() => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewHtml]);

  return (
    <div className="glass-card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/30 dark:border-dark-border/30">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-semibold text-primary">PDF Preview</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/50 dark:bg-dark-surface/50 rounded-lg p-1">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors disabled:opacity-50"
              disabled={scale <= 0.5}
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
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent-500 rounded-lg hover:bg-accent-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-dark-surface/50 p-4">
        <div
          className="mx-auto transition-transform duration-200 origin-top"
          style={{
            width: `${8.5 * 96}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          <div className="bg-white shadow-xl rounded-sm overflow-hidden">
            {previewSrc && (
              <iframe
                src={previewSrc}
                title="Resume Preview"
                className="w-full border-0"
                style={{
                  height: `${11 * 96}px`,
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>
          <div className="text-center mt-3">
            <span className="text-xs text-muted">Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
