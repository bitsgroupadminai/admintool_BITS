export const QUEUE_MODE_LABELS = {
  queue_only: 'Walk-in queue',
  appointment_only: 'Book a time slot',
  hybrid: 'Queue or book a slot',
};

export function formatDate(value) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatOfferingWindow(offering) {
  const start = formatDate(offering?.startDate);
  const end = formatDate(offering?.endDate);
  if (start && end) return `Open from ${start} to ${end}`;
  if (start) return `Opens on ${start}`;
  if (end) return `Apply before ${end}`;
  return 'Open now';
}

export function formatQueueMode(mode) {
  return QUEUE_MODE_LABELS[mode] ?? 'Visit the institute office';
}

export function formatVisitAccessLabel(offering, application) {
  const visitState = application?.visitPlanning?.state;
  if (visitState === 'completed') return 'Visit completed';
  if (visitState === 'booked') return 'Appointment booked';
  if (visitState === 'no_show') return 'Rebook your visit';
  return formatQueueMode(offering?.queueMode);
}

export function getOfferingStats(offering) {
  return [
    {
      label: 'Things we check',
      value: offering?.eligibilityRules?.length ?? 0,
    },
    {
      label: 'Documents needed',
      value: offering?.documentRequirements?.filter((doc) => doc.required !== false).length ?? 0,
    },
    {
      label: 'Steps in the process',
      value: offering?.workflowSteps?.length ?? 0,
    },
  ];
}

export function getTotalSlaLabel(steps = []) {
  if (!steps.length) return 'Timing shared by institute';

  const units = new Set(steps.map((step) => step.slaUnit).filter(Boolean));
  if (units.size !== 1) return 'Each step has its own timing';

  const unit = steps[0].slaUnit;
  const total = steps.reduce((sum, step) => sum + (Number(step.slaValue) || 0), 0);
  const unitLabel = total === 1 ? unit.replace(/s$/, '') : unit;
  return `About ${total} ${unitLabel} in total`;
}

export function formatStepTiming(step) {
  if (!step?.slaValue || !step?.slaUnit) return 'Timing shared by institute';
  const unit = step.slaValue === 1 ? step.slaUnit.replace(/s$/, '') : step.slaUnit;
  return `Usually done within ${step.slaValue} ${unit}`;
}
