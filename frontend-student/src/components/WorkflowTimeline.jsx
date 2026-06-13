import { WorkflowStepPreview } from '@/components/WorkflowStepPreview';

export function WorkflowTimeline({ steps }) {
  if (!steps?.length) {
    return <p className="text-sm text-muted">No workflow steps configured yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <WorkflowStepPreview key={step.stepId} step={step} index={index} />
      ))}
    </ol>
  );
}
