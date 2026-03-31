import { ChangeEvent, DragEvent, useCallback, useMemo, useRef, useState } from 'react';
import { ExternalResumeFile } from '../../types';
import { fileExtractionService } from '../../services/fileExtractionService';

interface ExternalResumeUploaderProps {
  onNext: (resumes: ExternalResumeFile[]) => void;
  initialResumes?: ExternalResumeFile[];
}

const MAX_FILES = 5;
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'docx']);
const UNSUPPORTED_TYPE_ERROR = 'Only PDF and DOCX files are accepted';

const createResumeId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

const getExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
};

const isSupportedFile = (file: File): boolean => {
  return SUPPORTED_EXTENSIONS.has(getExtension(file.name));
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ExternalResumeUploader({ onNext, initialResumes = [] }: ExternalResumeUploaderProps) {
  const [resumes, setResumes] = useState<ExternalResumeFile[]>(initialResumes);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const parsedResumes = useMemo(
    () => resumes.filter((resume) => resume.status === 'parsed' && resume.text && !resume.error),
    [resumes]
  );
  const canProceed = parsedResumes.length > 0;

  const parseResume = useCallback(async (resumeId: string, file: File) => {
    try {
      const extractedText = await fileExtractionService.extractText(file);
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId
            ? { ...resume, text: extractedText, status: 'parsed', error: null }
            : resume
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse file';
      setResumes((prev) =>
        prev.map((resume) =>
          resume.id === resumeId
            ? { ...resume, status: 'error', text: null, error: message || 'Failed to parse file' }
            : resume
        )
      );
    }
  }, []);

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      if (incomingFiles.length === 0) return;

      setUploadError(null);

      const availableSlots = MAX_FILES - resumes.length;
      if (availableSlots <= 0) {
        setUploadError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      const filesToProcess = incomingFiles.slice(0, availableSlots);
      if (incomingFiles.length > availableSlots) {
        setUploadError(`Maximum ${MAX_FILES} files allowed`);
      }

      const nextResumes: ExternalResumeFile[] = [];
      let hasUnsupported = false;

      filesToProcess.forEach((file) => {
        if (!isSupportedFile(file)) {
          hasUnsupported = true;
          return;
        }

        nextResumes.push({
          id: createResumeId(),
          file,
          name: file.name,
          text: null,
          error: null,
          status: 'parsing',
        });
      });

      if (hasUnsupported) {
        setUploadError(UNSUPPORTED_TYPE_ERROR);
      }

      if (nextResumes.length === 0) {
        return;
      }

      setResumes((prev) => [...prev, ...nextResumes]);
      nextResumes.forEach((resume) => {
        void parseResume(resume.id, resume.file);
      });
    },
    [parseResume, resumes.length]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const onDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      dragDepthRef.current = 0;
      addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles]
  );

  const onFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files ? Array.from(event.target.files) : [];
      addFiles(selected);
      event.target.value = '';
    },
    [addFiles]
  );

  const onRemove = useCallback((resumeId: string) => {
    setResumes((prev) => prev.filter((resume) => resume.id !== resumeId));
  }, []);

  const onNextClick = useCallback(() => {
    onNext(parsedResumes);
  }, [onNext, parsedResumes]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Upload External Resumes</h2>
        <p className="text-sm text-muted mt-1">Drop files or browse to parse external candidates</p>
      </div>

      <div className="glass-card p-5 max-w-3xl mx-auto space-y-4">
        <div
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`glass-panel-subtle rounded-2xl p-6 border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-gray-200/40 dark:border-dark-border/40 hover:border-cyan-400/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={onFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{isDragging ? 'Drop files here' : 'Drag and drop resumes'}</p>
              <p className="text-xs text-muted mt-1">Accepted formats: PDF, DOCX · Maximum {MAX_FILES} files</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/20"
            >
              Choose Files
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="glass-panel-subtle rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {uploadError}
            </div>
          </div>
        )}

        {resumes.length > 0 && (
          <div className="space-y-2">
            {resumes.map((resume) => (
              <div key={resume.id} className="glass-panel-subtle rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getExtension(resume.name).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate" title={resume.name}>{resume.name}</p>
                        <p className="text-xs text-muted">{formatFileSize(resume.file.size)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {resume.status === 'parsing' && (
                          <svg className="w-5 h-5 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        )}
                        {resume.status === 'parsed' && (
                          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {resume.status === 'error' && (
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemove(resume.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {resume.status === 'error' && resume.error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">{resume.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted">
            {parsedResumes.length} parsed successfully · {resumes.length}/{MAX_FILES} uploaded
          </p>
          <button
            type="button"
            onClick={onNextClick}
            disabled={!canProceed}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
