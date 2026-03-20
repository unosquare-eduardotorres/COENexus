import inDevGif from '../files/InDevelopment.gif';

export default function BatchPage() {
  return (
    <div className="min-h-screen py-8 relative">
      <div className="max-w-4xl mx-auto px-6 select-none pointer-events-none blur-sm opacity-40">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
            Batch Processing
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Batch Processing</h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto">
            Process multiple resumes at once — enhance, validate, or extract structured data in bulk.
          </p>
        </div>

        <div className="space-y-4 mt-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Resume Processing</h3>
                <p className="text-xs text-muted">Enhance and validate resumes in bulk</p>
              </div>
            </div>
            <div className="h-24 rounded-xl bg-gray-100/30 dark:bg-dark-hover/30" />
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Data Extraction</h3>
                <p className="text-xs text-muted">Extract structured data from resumes</p>
              </div>
            </div>
            <div className="h-24 rounded-xl bg-gray-100/30 dark:bg-dark-hover/30" />
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">Bulk Upload</h3>
                <p className="text-xs text-muted">Upload up to 50 resumes at once</p>
              </div>
            </div>
            <div className="h-24 rounded-xl bg-gray-100/30 dark:bg-dark-hover/30" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="flex flex-col items-center gap-6">
          <img
            src={inDevGif}
            alt="In Development"
            className="w-[40rem] h-[40rem] object-contain rounded-2xl"
          />
          <div className="px-6 py-3 rounded-2xl bg-amber-500/15 border border-amber-500/20 backdrop-blur-sm">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tracking-wide">
              In Development
            </span>
          </div>
          <p className="text-sm text-muted max-w-sm text-center">
            Batch processing is currently being built. Check back soon for bulk resume processing, data extraction, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
