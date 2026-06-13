import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/StudentLayout';
import { EnrollmentAccordion } from '@/components/enrollment/EnrollmentAccordion';
import { EligibilityList } from '@/components/enrollment/EligibilityList';
import { DocumentList } from '@/components/enrollment/DocumentList';
import { EnrollmentProcessTimeline } from '@/components/enrollment/EnrollmentProcessTimeline';
import { ApplicationPanel } from '@/components/enrollment/ApplicationPanel';
import { studentApi } from '@/api/student.api';

function AccordionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-white" />
      ))}
    </div>
  );
}

export function EnrollOfferingPage() {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [institute, setInstitute] = useState(null);
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');

  useEffect(() => {
    Promise.all([
      studentApi.getInstitute(),
      studentApi.getEnrollmentOffering(offeringId),
    ])
      .then(([instituteRes, offeringRes]) => {
        setInstitute(instituteRes.data.data.institute);
        setOffering(offeringRes.data.data.offering);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load programme');
        navigate('/enroll');
      })
      .finally(() => setLoading(false));
  }, [offeringId, navigate]);

  const eligibilityCount = offering?.eligibilityRules?.length ?? 0;
  const documentCount = offering?.documentRequirements?.length ?? 0;
  const processCount = offering?.workflowSteps?.length ?? 0;

  return (
    <PublicLayout instituteName={institute?.name}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link to="/enroll" className="text-sm font-medium text-[#1F4D3F]">
          ← All programmes
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {offering?.name ?? 'Programme details'}
          </h1>
          {offering?.description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{offering.description}</p>
          )}
          {!loading && institute?.name && (
            <p className="mt-2 text-xs text-muted">{institute.name}</p>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-4">
            {loading ? (
              <AccordionSkeleton />
            ) : (
              <>
                <EnrollmentAccordion
                  title="Am I eligible?"
                  count={eligibilityCount}
                  defaultOpen
                >
                  <EligibilityList rules={offering?.eligibilityRules} />
                </EnrollmentAccordion>

                <EnrollmentAccordion title="Documents you'll need" count={documentCount}>
                  <DocumentList documents={offering?.documentRequirements} />
                </EnrollmentAccordion>

                <EnrollmentAccordion title="Enrollment process" count={processCount}>
                  <EnrollmentProcessTimeline steps={offering?.workflowSteps} />
                </EnrollmentAccordion>
              </>
            )}
          </div>

          <div className="lg:sticky lg:top-6">
            {loading ? (
              <div className="h-72 animate-pulse rounded-2xl border border-border bg-white" />
            ) : (
              <ApplicationPanel
                visible={!loading}
                applicantName={applicantName}
                applicantEmail={applicantEmail}
                onNameChange={setApplicantName}
                onEmailChange={setApplicantEmail}
              />
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
