import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAcademicDocumentName } from '@/utils/documentEligibility';

export function DocumentEligibilityCard({ document, index, onChange }) {
  const eligibility = document.eligibility ?? {
    enabled: false,
    aggregateMin: '',
    subjectThreshold: '',
    requiredSubjects: [],
  };
  const academic = isAcademicDocumentName(document.name);
  const subjects = eligibility.requiredSubjects ?? [];
  const hasRequiredSubjects = subjects.some((subject) => String(subject?.name ?? '').trim());

  const patch = (nextEligibility) => {
    onChange(index, { ...document, eligibility: { ...eligibility, ...nextEligibility } });
  };

  const updateSubject = (subjectIndex, nextSubject) => {
    const nextSubjects = [...subjects];
    nextSubjects[subjectIndex] = { ...nextSubjects[subjectIndex], ...nextSubject };
    patch({ requiredSubjects: nextSubjects });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-forest">{document.name || `Document ${index + 1}`}</p>
          <p className="mt-1 text-xs text-muted">
            {academic
              ? 'Set the overall score for this marksheet. Add required subjects only if this file must include specific ones.'
              : 'Supporting file. Turn eligibility on only if this upload should be scored.'}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={Boolean(eligibility.enabled)}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />
          Check eligibility on this document
        </label>
      </div>

      {eligibility.enabled ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Minimum overall score</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 75"
              value={eligibility.aggregateMin}
              onChange={(event) => patch({ aggregateMin: event.target.value })}
            />
            <p className="text-[11px] text-muted">
              The aggregate, percentage, or exam total for this entire file.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Required subjects (optional)</Label>
            <p className="text-[11px] text-muted">
              Add subjects only when this file must include them, such as Physics, Chemistry, and
              Mathematics on Class 12. Leave empty for Class 10 or an exam total.
            </p>
            <div className="space-y-2">
              {subjects.map((subject, subjectIndex) => (
                <div key={subjectIndex} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_40px]">
                  <Input
                    placeholder="Subject name, e.g. Physics"
                    value={subject.name}
                    onChange={(event) => updateSubject(subjectIndex, { name: event.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Min score"
                    value={subject.minScore}
                    onChange={(event) => updateSubject(subjectIndex, { minScore: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch({
                        requiredSubjects: subjects.filter((_, idx) => idx !== subjectIndex),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch({ requiredSubjects: [...subjects, { name: '', minScore: '' }] })}
            >
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>
              {hasRequiredSubjects
                ? 'Minimum score in each required subject'
                : 'Minimum score in each subject on this file'}
            </Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 60"
              value={eligibility.subjectThreshold}
              onChange={(event) => patch({ subjectThreshold: event.target.value })}
            />
            <p className="text-[11px] text-muted">
              {hasRequiredSubjects
                ? 'Applies to every required subject unless that subject has its own minimum above.'
                : 'Optional. Used when this file has subject scores but no required-subject list.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
