import {
  BookOpen,
  MessageCircle,
  HelpCircle,
  AlertTriangle,
  Layers,
  ShieldCheck,
  FileText,
  GitBranch,
  CalendarClock,
} from 'lucide-react';

/**
 * What the AI extraction "review pack" contains — shown on upload + extract steps.
 */
export const REVIEW_PACK_SECTIONS = [
  {
    id: 'student-chat-rag',
    step: 'extract',
    emoji: '🔎',
    Icon: MessageCircle,
    shortTitle: 'Student chat index',
    tagline: 'RAG indexing so the chatbot can answer from your uploads',
    whenShort: 'Extract',
  },
  {
    id: 'chatbot-summary',
    step: 2,
    emoji: '🤖',
    Icon: BookOpen,
    shortTitle: 'Chatbot summaries',
    tagline: 'What a student FAQ bot could cover',
    whenShort: 'Step 2',
  },
  {
    id: 'chatbot-questions',
    step: 2,
    emoji: '💬',
    Icon: HelpCircle,
    shortTitle: 'Example questions',
    tagline: 'Questions your docs can answer',
    whenShort: 'Step 2',
  },
  {
    id: 'gaps',
    step: 2,
    emoji: '⚠️',
    Icon: AlertTriangle,
    shortTitle: 'Document gaps',
    tagline: 'Missing or unclear topics',
    whenShort: 'Step 2',
  },
  {
    id: 'offerings',
    step: 3,
    emoji: '📋',
    Icon: Layers,
    shortTitle: 'Offering names',
    tagline: 'Tracks from policy + source quote',
    whenShort: 'Step 3',
  },
  {
    id: 'eligibility',
    step: 'configure',
    emoji: '✅',
    Icon: ShieldCheck,
    shortTitle: 'Eligibility rules',
    tagline: 'Marks, quotas, criteria — verbatim',
    whenShort: 'Configure',
  },
  {
    id: 'documents',
    step: 'configure',
    emoji: '📎',
    Icon: FileText,
    shortTitle: 'Required documents',
    tagline: 'Upload list per offering track',
    whenShort: 'Configure',
  },
  {
    id: 'workflow',
    step: 'configure',
    emoji: '🔄',
    Icon: GitBranch,
    shortTitle: 'Workflow steps',
    tagline: 'Approval stages in document order',
    whenShort: 'Configure',
  },
  {
    id: 'queue',
    step: 'configure',
    emoji: '🕐',
    Icon: CalendarClock,
    shortTitle: 'Queue & appointments',
    tagline: 'Walk-in / counter if stated',
    whenShort: 'Configure',
  },
];

export const SERVICE_PAGE_PACK = REVIEW_PACK_SECTIONS.filter(
  (s) => typeof s.step === 'number',
);
export const CONFIGURE_PACK = REVIEW_PACK_SECTIONS.filter((s) => s.step === 'configure');

export const EXTRACTION_PROGRESS_STEPS = [
  'Reading uploaded files…',
  'Indexing student chat (RAG)…',
  'Chatbot summaries…',
  'Example questions…',
  'Document gaps…',
  'Offering names…',
  'Configure hints (eligibility, docs, workflow)…',
  'Packaging review…',
];
