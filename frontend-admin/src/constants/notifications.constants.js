export const NOTIFICATION_TYPE_META = {
  assignment: { label: 'Assignment', tone: 'bg-[#EFF6FF] text-[#1D4ED8]' },
  status: { label: 'Status update', tone: 'bg-[#F0FAF5] text-[#0A6640]' },
  sla_breach: { label: 'SLA alert', tone: 'bg-[#FEF2F2] text-[#B91C1C]' },
  queue: { label: 'Queue', tone: 'bg-[#F0FAF5] text-[#0A6640]' },
  appointment: { label: 'Appointment', tone: 'bg-[#EFF6FF] text-[#1D4ED8]' },
  system: { label: 'System', tone: 'bg-[#F9FCFB] text-[#4B6358]' },
  announcement: { label: 'Announcement', tone: 'bg-[#ECFDF5] text-[#0A6640]' },
};

export const BROADCAST_AUDIENCE_OPTIONS = [
  {
    value: 'all_staff',
    label: 'All staff',
    description: 'Every active staff member in your institute',
  },
  {
    value: 'staff',
    label: 'One staff member',
    description: 'Send to a specific staff account',
  },
  {
    value: 'all_students',
    label: 'All students',
    description: 'Every enrolled student portal user',
  },
  {
    value: 'student',
    label: 'One student',
    description: 'Send to a specific student account',
  },
];

export const BROADCAST_CATEGORY_OPTIONS = [
  { value: 'general', label: 'General notice' },
  { value: 'deadline', label: 'Deadline reminder' },
  { value: 'holiday', label: 'Holiday / closure' },
  { value: 'maintenance', label: 'System maintenance' },
  { value: 'event', label: 'Campus event' },
];

export const ANNOUNCEMENT_TEMPLATES = [
  {
    category: 'general',
    title: 'Important institute update',
    body: 'Please check the student portal for the latest update from the administration office.',
  },
  {
    category: 'deadline',
    title: 'Document submission deadline',
    body: 'Reminder: pending documents must be uploaded before the deadline to avoid processing delays.',
  },
  {
    category: 'holiday',
    title: 'Office closed — public holiday',
    body: 'Our counters and support desk will remain closed on the holiday. Online services stay available.',
  },
  {
    category: 'maintenance',
    title: 'Scheduled portal maintenance',
    body: 'The student portal will be briefly unavailable tonight for maintenance. We appreciate your patience.',
  },
  {
    category: 'event',
    title: 'Campus orientation session',
    body: 'You are invited to attend the upcoming orientation session. Please arrive 15 minutes early.',
  },
];

export const AUDIENCE_LABELS = {
  all_staff: 'All staff',
  all_students: 'All students',
  staff: 'One staff member',
  student: 'One student',
};

export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
