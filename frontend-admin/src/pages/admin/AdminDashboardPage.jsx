import { Link } from "react-router-dom";
import {
  Layers,
  ArrowRight,
  BookOpen,
  Workflow,
  FileCheck,
  Clock,
} from "lucide-react";
import { AdminLayout } from "@/components/layouts/AdminLayout";

const featureItems = [
  { icon: Layers, label: "Services", desc: "Manual creation only" },
  { icon: Workflow, label: "Offerings", desc: "Sequential config wizard" },
  {
    icon: FileCheck,
    label: "Documents & Eligibility",
    desc: "PDF upload + AI suggestions",
  },
  {
    icon: Clock,
    label: "Queue & SLA",
    desc: "Appointment, workflow, activation",
  },
];

export function AdminDashboardPage() {
  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981] mb-2">
            Admin Console
          </p>
          <h1 className="text-3xl font-bold text-[#052E1C] tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-[#4B6358]">
            Configure services, offerings, workflows, and operational rules for
            your institute.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden">
            <div className="px-7 pt-7 pb-6 border-b border-[#E2EEE8]">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)]">
                  <Layers
                    className="h-4.5 w-4.5 text-white"
                    strokeWidth={2.2}
                  />
                </div>
                <h2 className="text-base font-bold text-[#052E1C]">
                  Service Configuration
                </h2>
              </div>
              <p className="text-sm text-[#4B6358] mt-2 leading-relaxed">
                Create and manage services, configure offerings, set eligibility
                rules, upload knowledge documents, define workflows, and
                configure SLAs — all from one place.
              </p>
            </div>

            <div className="px-7 py-6 flex items-center justify-between">
              <p className="text-xs text-[#6B7280]">
                Section 3 — Service &amp; offering management
              </p>
              <Link
                to="/admin/services"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0A6640] to-[#084F31] shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)] hover:from-[#084F31] hover:to-[#052E1C]"
              >
                Manage services
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#C4E8D4] bg-gradient-to-br from-[#F0FAF5] to-[#D1FAE5]/40 shadow-[0_4px_24px_rgba(10,102,64,0.06)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-[#0A6640]" strokeWidth={2} />
                <h3 className="text-sm font-bold text-[#052E1C]">
                  What&apos;s Configured
                </h3>
              </div>
              <div className="space-y-3">
                {featureItems.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-[#C4E8D4] shadow-sm">
                      <Icon
                        className="h-3.5 w-3.5 text-[#0A6640]"
                        strokeWidth={2}
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#052E1C]">
                        {label}
                      </p>
                      <p className="text-xs text-[#4B6358]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#C4E8D4]">
              <p className="text-[11px] text-[#6B7280]">
                AI suggestions are reviewed before applying.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_2px_12px_rgba(10,102,64,0.05)] px-7 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#052E1C]">Quick Access</h3>
              <p className="text-xs text-[#4B6358] mt-0.5">
                Jump directly into configuration
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin/services"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-[#0A6640] border border-[#C4E8D4] bg-[#F0FAF5] transition-all duration-200 hover:bg-[#D1FAE5] hover:border-[#6EE7B7]"
              >
                <Layers className="h-3.5 w-3.5" strokeWidth={2} />
                All Services
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
