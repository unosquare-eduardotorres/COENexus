import { ATSPosition, PresentedCandidate } from '../../types';

type PositionDetailsModalProps = {
  position: ATSPosition;
  onClose: () => void;
};

export default function PositionDetailsModal({ position, onClose }: PositionDetailsModalProps) {
  const getStatusColor = (status: PresentedCandidate['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'reviewing':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200/50 dark:border-dark-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">{position.title}</h2>
              <p className="text-sm text-muted mt-0.5">{position.accountName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Position ID</label>
              <p className="text-sm text-primary font-mono">{position.id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Status</label>
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  position.status === 'interviewing'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : position.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300'
                }`}
              >
                {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Account Name</label>
              <p className="text-sm text-primary">{position.accountName}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Stakeholder</label>
              <p className="text-sm text-primary">{position.stakeholder}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Vertical</label>
              <p className="text-sm text-primary">{position.vertical}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Rate Range</label>
              <p className="text-sm text-primary">${position.minRate}/hr - ${position.maxRate}/hr</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Seniorities</label>
            <div className="flex flex-wrap gap-1.5">
              {position.seniorities.map((seniority) => (
                <span
                  key={seniority}
                  className="px-2 py-1 text-xs font-medium bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 rounded-lg"
                >
                  {seniority}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {position.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 rounded-lg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-3">
              Candidates Presented ({position.candidatesPresented.length})
            </label>
            {position.candidatesPresented.length === 0 ? (
              <p className="text-sm text-muted italic">No candidates presented yet</p>
            ) : (
              <div className="space-y-2">
                {position.candidatesPresented.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-xs">
                        {candidate.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{candidate.name}</p>
                        <p className="text-xs text-muted">
                          Presented {new Date(candidate.presentedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">${candidate.rate}/hr</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                        {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200/50 dark:border-dark-border/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
