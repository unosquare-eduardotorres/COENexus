import type { InterviewQuestion } from '../types';

interface TheoreticalInterviewSectionProps {
  questions: InterviewQuestion[];
  scores: Record<string, number>;
  onScoreClick: (questionId: string, score: number) => void;
}

export default function TheoreticalInterviewSection({ questions, scores, onScoreClick }: TheoreticalInterviewSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15 text-xs font-bold text-violet-600 dark:text-violet-300">01</span>
        <h2 className="text-lg font-bold text-primary">Theoretical Interview</h2>
        <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">In Progress</span>
      </div>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="glass-card rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{q.category}</p>
            <p className="mt-1 text-sm font-medium text-primary">{q.questionText}</p>
            <div className="mt-3 flex items-start gap-4">
              <textarea
                className="glass-input flex-1 rounded-lg px-3 py-2 text-sm"
                placeholder="Type evaluator notes here..."
                rows={3}
                defaultValue={q.evaluatorNotes}
              />
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-muted text-right">Score</p>
                <div className="grid grid-cols-2 gap-1">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => onScoreClick(q.id, s)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                        scores[q.id] === s
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'glass-card text-secondary hover:text-primary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
