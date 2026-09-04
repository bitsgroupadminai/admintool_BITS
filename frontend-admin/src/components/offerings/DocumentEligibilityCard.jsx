import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isAcademicDocumentName } from '@/utils/documentEligibility';

export function DocumentEligibilityCard({ document, index, onChange }) {
  const eligibility = document.eligibility ?? {
    enabled: false,
    qualification: '',
    aggregateMin: '',
    subjectThreshold: '',
    requiredSubjects: [],
  };
  const academic = isAcademicDocumentName(document.name);
  const subjects = eligibility.requiredSubjects ?? [];

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
              ? 'Marksheet or scorecard — set the scores and subjects this file must prove.'
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Qualification this document should show</Label>
            <Input
              placeholder={academic ? 'e.g. 10+2 or equivalent, Class X' : 'Optional'}
              value={eligibility.qualification}
              onChange={(event) => patch({ qualification: event.target.value })}
            />
          </div>
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
              Aggregate, percentage, or exam total on this file.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Minimum score in each required subject</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 60"
              value={eligibility.subjectThreshold}
              onChange={(event) => patch({ subjectThreshold: event.target.value })}
            />
            <p className="text-[11px] text-muted">
              Used when a subject below does not have its own minimum.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Required subjects</Label>
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
            <p className="text-[11px] text-muted">
              Leave the list empty if this file only needs an overall score, such as Class 10 or an
              exam total.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
