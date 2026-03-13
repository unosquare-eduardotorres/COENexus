import { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats?: string[];
  multiple?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
}

export default function FileUpload({
  onFilesSelected,
  acceptedFormats = ['.pdf', '.docx', '.doc', '.txt'],
  multiple = true,
  maxFiles = 50,
  maxSizeMB = 10,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!acceptedFormats.includes(extension)) {
        return `${file.name}: Unsupported format. Accepted: ${acceptedFormats.join(', ')}`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `${file.name}: File too large. Max size: ${maxSizeMB}MB`;
      }
      return null;
    },
    [acceptedFormats, maxSizeMB]
  );

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newErrors: string[] = [];
      const validFiles: File[] = [];

      if (fileArray.length + selectedFiles.length > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} files allowed`);
        setErrors(newErrors);
        return;
      }

      fileArray.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          validFiles.push(file);
        }
      });

      setErrors(newErrors);

      if (validFiles.length > 0) {
        const updatedFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles;
        setSelectedFiles(updatedFiles);
        onFilesSelected(updatedFiles);
      }
    },
    [selectedFiles, maxFiles, multiple, validateFile, onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updatedFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setErrors([]);
    onFilesSelected([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const isAtCapacity = selectedFiles.length >= maxFiles;

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return (
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-red-600 dark:text-red-400">PDF</span>
          </div>
        );
      case 'docx':
      case 'doc':
        return (
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">DOC</span>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-hover flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">TXT</span>
          </div>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <div
        onDragOver={isAtCapacity ? undefined : handleDragOver}
        onDragLeave={isAtCapacity ? undefined : handleDragLeave}
        onDrop={isAtCapacity ? undefined : handleDrop}
        onClick={isAtCapacity ? undefined : () => fileInputRef.current?.click()}
        className={`
          relative border border-dashed rounded-xl p-6 text-center
          transition-all duration-200 ease-in-out
          ${isAtCapacity
            ? 'border-gray-200/30 dark:border-dark-border/30 bg-gray-50/30 dark:bg-dark-surface/20 cursor-not-allowed opacity-50'
            : isDragging
              ? 'border-accent-400 bg-accent-50/50 dark:bg-accent-500/10 cursor-pointer'
              : 'border-gray-200/50 dark:border-dark-border/50 hover:border-gray-300 dark:hover:border-dark-muted bg-white/30 dark:bg-dark-surface/30 hover:bg-white/50 dark:hover:bg-dark-hover/30 cursor-pointer'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isDragging ? 'bg-accent-100/50 dark:bg-accent-500/20' : 'bg-gray-100/50 dark:bg-dark-hover/50'}
          `}
          >
            <svg
              className={`w-6 h-6 ${isDragging ? 'text-accent-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-medium text-secondary">
              {isDragging ? 'Drop files here' : 'Drag & drop resumes'}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              or <span className="text-accent-600 dark:text-accent-400 font-medium">browse</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {acceptedFormats.map((format) => (
              <span
                key={format}
                className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100/50 dark:bg-dark-hover/50 text-muted rounded"
              >
                {format.replace('.', '').toUpperCase()}
              </span>
            ))}
          </div>

          <p className="text-[10px] text-gray-400">
            Max {maxFiles} files, {maxSizeMB}MB each
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Upload Errors</span>
          </div>
          <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-secondary">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => {
              const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl border border-gray-100/50 dark:border-dark-border/30"
                >
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded">
                        {ext}
                      </span>
                      <span className="text-[10px] text-muted">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
