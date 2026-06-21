import { StudentLayout } from '@/components/StudentLayout';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader, PageShell, PortalCard } from '@/components/ui/PortalCard';

const tips = [
  {
    tag: 'Programme',
    index: 1,
    title: 'Your enrolled course',
    description:
      'Your main programme is already assigned. Use Services for extra institute requests like certificates or approvals.',
  },
  {
    tag: 'Documents',
    index: 2,
    title: 'Prepare your files',
    description:
      'Upload clear PDF or image files in the size and format shown on each service page.',
  },
  {
    tag: 'Steps',
    index: 3,
    title: 'Follow each step',
    description:
      'Every service shows simple steps — who checks your request and how long it usually takes.',
  },
  {
    tag: 'Help',
    index: 4,
    title: 'Ask your institute',
    description:
      'If a service is missing or a document name is unclear, contact your institute office directly.',
  },
];

export function GuidancePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <StudentLayout>
      <PageShell>
        <PageHeader
          eyebrow="Guidance"
          title="How to use this portal"
          description={`Simple tips for students at ${user?.institute?.name ?? 'your institute'}.`}
        />

        <div className="grid gap-5 md:grid-cols-2">
          {tips.map((tip) => (
            <PortalCard key={tip.tag} {...tip} />
          ))}
        </div>
      </PageShell>
    </StudentLayout>
  );
}
