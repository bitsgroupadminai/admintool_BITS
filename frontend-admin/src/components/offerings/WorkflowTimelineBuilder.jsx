import { useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Flag,
  GripVertical,
  Plus,
  Trash2,
  User,
  Users,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import {
  AI_HANDLERS,
  HANDLER_TYPE,
  OUTCOME_META,
  ROUTE_ACTION,
  createStep,
  getHandlerLabel,
  getOutcomeSummary,
  normalizeSteps,
  relinkStepOutcomes,
} from "@/utils/workflow";

function HandlerIcon({ type }) {
  if (type === HANDLER_TYPE.AI)
    return <Bot className="h-3.5 w-3.5" strokeWidth={2} />;
  if (type === HANDLER_TYPE.STUDENT)
    return <User className="h-3.5 w-3.5" strokeWidth={2} />;
  return <Users className="h-3.5 w-3.5" strokeWidth={2} />;
}

function OutcomeRouteEditor({ outcome, step, allSteps, docNames, onChange }) {
  const meta = OUTCOME_META[outcome.type] ?? {
    label: outcome.type,
    emoji: "•",
  };
  const route = outcome.route ?? {};

  const otherSteps = allSteps.filter((s) => s.stepId !== step.stepId);

  const updateRoute = (patch) => {
    const next = { ...route, ...patch };
    for (const key of ["nextStepId", "terminalState", "returnToStepId"]) {
      if (next[key] == null) delete next[key];
    }
    onChange({ ...outcome, route: next });
  };

  const borderColor =
    outcome.type === "rejected"
      ? "border-[#F5C4B3] bg-[#FDFAF9]"
      : outcome.type === "approved"
        ? "border-[#D4E5D0] bg-[#F6FAF5]"
        : "border-[#F5DEC2] bg-[#FDFAF6]";

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", borderColor)}>
      <p className="text-xs font-semibold text-[#1A2E16] tracking-wide">
        {meta.emoji} {meta.label}
      </p>

      <Select
        size="sm"
        value={route.action ?? ROUTE_ACTION.NEXT_STEP}
        onChange={(action) => {
          if (action === ROUTE_ACTION.END_WORKFLOW) {
            updateRoute({
              action,
              terminalState:
                outcome.type === "rejected" ? "rejected" : "completed",
              nextStepId: undefined,
              returnToStepId: undefined,
            });
          } else if (action === ROUTE_ACTION.RETURN_TO_STUDENT) {
            updateRoute({
              action,
              requireReupload: route.requireReupload ?? [],
            });
          } else {
            const next = otherSteps[0];
            updateRoute({
              action,
              nextStepId: route.nextStepId ?? next?.stepId,
              terminalState: undefined,
              returnToStepId: undefined,
            });
          }
        }}
        options={[
          { value: ROUTE_ACTION.NEXT_STEP, label: "Go to next step" },
          { value: ROUTE_ACTION.END_WORKFLOW, label: "End workflow" },
          { value: ROUTE_ACTION.RETURN_TO_STUDENT, label: "Return to student" },
        ]}
      />

      {route.action === ROUTE_ACTION.NEXT_STEP && (
        <Select
          size="sm"
          value={route.nextStepId ?? ""}
          onChange={(nextStepId) => updateRoute({ nextStepId })}
          placeholder="Select step…"
          options={otherSteps.map((step) => ({
            value: step.stepId,
            label: `Step ${step.order}: ${step.name}`,
          }))}
        />
      )}

      {route.action === ROUTE_ACTION.END_WORKFLOW && (
        <div className="flex items-center gap-2">
          <Flag className="h-3.5 w-3.5 text-[#3D6B35]" strokeWidth={2} />
          <p className="text-xs text-[#4A6448] font-medium">
            Terminal state:{" "}
            {route.terminalState === "rejected" ? "Rejected" : "Completed"}
          </p>
        </div>
      )}

      {route.action === ROUTE_ACTION.RETURN_TO_STUDENT && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
              Return to step
            </p>
            <Select
              size="sm"
              value={route.returnToStepId ?? ""}
              onChange={(returnToStepId) =>
                updateRoute({ returnToStepId: returnToStepId || undefined })
              }
              placeholder="Student dashboard (default)"
              options={allSteps.map((step) => ({
                value: step.stepId,
                label: `Step ${step.order}: ${step.name}`,
              }))}
            />
          </div>
          {docNames.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                Require re-upload
              </p>
              <div className="flex flex-wrap gap-2">
                {docNames.map((name) => (
                  <label
                    key={name}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E8EDE6] bg-white px-3 py-1.5 text-xs font-medium text-[#1A2E16] transition-all hover:border-[#3D6B35]/40 hover:bg-[#F6FAF5]"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[#3D6B35]"
                      checked={route.requireReupload?.includes(name)}
                      onChange={(e) => {
                        const set = new Set(route.requireReupload ?? []);
                        if (e.target.checked) set.add(name);
                        else set.delete(name);
                        updateRoute({ requireReupload: [...set] });
                      }}
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCard({
  step,
  allSteps,
  staffRoles,
  docNames,
  expanded,
  onToggle,
  onChange,
  onRemove,
  canRemove,
}) {
  const update = (patch) => onChange({ ...step, ...patch });

  const setHandler = (type, assignee) =>
    update({ handledBy: { type, assignee } });

  const updateOutcome = (index, outcome) => {
    const outcomes = [...(step.outcomes ?? [])];
    outcomes[index] = outcome;
    update({ outcomes });
  };

  const slaLabel =
    step.slaValue && step.slaUnit
      ? `${step.slaValue} ${step.slaUnit}`
      : "No SLA";

  return (
    <div className="relative pl-8">
      <div className="absolute left-2.5 top-5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#3D6B35] bg-white ring-4 ring-[#3D6B35]/10 transition-all duration-200" />
      <div
        className={cn(
          "overflow-hidden rounded-xl border transition-all duration-200",
          expanded
            ? "border-[#B8D4B2] bg-white shadow-sm"
            : "border-[#E8EDE6] bg-white hover:border-[#B8D4B2]",
        )}
      >
        <button
          type="button"
          className="flex w-full items-start gap-3 p-4 text-left transition-colors duration-150 hover:bg-[#F6FAF5]"
          onClick={onToggle}
        >
          <GripVertical
            className="h-4 w-4 shrink-0 text-[#C4D4C2] mt-0.5 cursor-grab"
            strokeWidth={2}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#F4F7F3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B7C69]">
                Step {step.order}
              </span>
              <span className="text-sm font-semibold text-[#1A2E16]">
                {step.name || "Untitled step"}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#9BAE99]">
                {getHandlerLabel(step.handledBy, staffRoles)}
              </span>
              <span className="h-1 w-1 rounded-full bg-[#D4E5D0]" />
              <span className="text-xs text-[#9BAE99]">{slaLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-[#6B7C69] line-clamp-1">
              {getOutcomeSummary(step)}
            </p>
          </div>
          <div className="shrink-0 text-[#9BAE99]">
            {expanded ? (
              <ChevronUp className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={2} />
            )}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-[#E8EDE6] bg-[#FAFBF9] p-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                  Step name
                </p>
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-[#E8EDE6] bg-white px-3 text-sm text-[#1A2E16] placeholder-[#C4D4C2] focus:border-[#3D6B35] focus:outline-none focus:ring-2 focus:ring-[#3D6B35]/10 transition-all"
                  value={step.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. Document verification"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                  Description
                </p>
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-[#E8EDE6] bg-white px-3 text-sm text-[#1A2E16] placeholder-[#C4D4C2] focus:border-[#3D6B35] focus:outline-none focus:ring-2 focus:ring-[#3D6B35]/10 transition-all"
                  value={step.description ?? ""}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="What happens in this step?"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                Handled by
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: HANDLER_TYPE.STAFF, label: "Staff" },
                  { type: HANDLER_TYPE.STUDENT, label: "Student" },
                  { type: HANDLER_TYPE.AI, label: "AI" },
                ].map((h) => {
                  const active = step.handledBy?.type === h.type;
                  return (
                    <button
                      key={h.type}
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-150",
                        active
                          ? "border-[#3D6B35] bg-[#3D6B35] text-white shadow-sm"
                          : "border-[#E8EDE6] bg-white text-[#6B7C69] hover:border-[#B8D4B2] hover:text-[#2D5427]",
                      )}
                      onClick={() => {
                        if (h.type === HANDLER_TYPE.STUDENT)
                          setHandler(HANDLER_TYPE.STUDENT, "student");
                        else if (h.type === HANDLER_TYPE.AI)
                          setHandler(HANDLER_TYPE.AI, "document_verification");
                        else
                          setHandler(
                            HANDLER_TYPE.STAFF,
                            staffRoles[0]?.value ?? "general",
                          );
                      }}
                    >
                      <HandlerIcon type={h.type} />
                      {h.label}
                    </button>
                  );
                })}
              </div>

              {step.handledBy?.type === HANDLER_TYPE.STAFF && (
                <Select
                  value={step.handledBy.assignee}
                  onChange={(assignee) => setHandler(HANDLER_TYPE.STAFF, assignee)}
                  options={staffRoles.map((role) => ({
                    value: role.value,
                    label: role.label,
                  }))}
                />
              )}

              {step.handledBy?.type === HANDLER_TYPE.AI && (
                <div className="space-y-2">
                  <Select
                    value={step.handledBy.assignee}
                    onChange={(assignee) => setHandler(HANDLER_TYPE.AI, assignee)}
                    options={AI_HANDLERS.map((handler) => ({
                      value: handler.value,
                      label: handler.label,
                    }))}
                  />
                  <p className="text-xs text-[#6B7C69]">
                    {
                      AI_HANDLERS.find(
                        (h) => h.value === step.handledBy.assignee,
                      )?.description
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                SLA
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#6B7C69]">Respond within</span>
                <input
                  type="number"
                  min={1}
                  className="h-10 w-20 rounded-lg border border-[#E8EDE6] bg-white px-3 text-sm font-semibold text-[#1A2E16] focus:border-[#3D6B35] focus:outline-none focus:ring-2 focus:ring-[#3D6B35]/10 transition-all"
                  value={step.slaValue ?? 24}
                  onChange={(e) => update({ slaValue: Number(e.target.value) })}
                />
                <Select
                  value={step.slaUnit ?? "hours"}
                  onChange={(slaUnit) => update({ slaUnit })}
                  className="w-auto"
                  options={[
                    { value: "minutes", label: "minutes" },
                    { value: "hours", label: "hours" },
                    { value: "days", label: "days" },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9BAE99]">
                  Outcome routing
                </p>
                <p className="mt-0.5 text-xs text-[#9BAE99]">
                  Define where the application goes after each outcome.
                </p>
              </div>
              <div className="grid gap-3">
                {(step.outcomes ?? []).map((o, i) => (
                  <OutcomeRouteEditor
                    key={`${o.type}-${i}`}
                    outcome={o}
                    step={step}
                    allSteps={allSteps}
                    docNames={docNames}
                    onChange={(outcome) => updateOutcome(i, outcome)}
                  />
                ))}
              </div>
            </div>

            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Remove step
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkflowTimelineBuilder({
  steps,
  onChange,
  staffRoles = [],
  documentRequirements = [],
}) {
  const normalized = normalizeSteps(steps);
  const [expandedId, setExpandedId] = useState(normalized[0]?.stepId ?? null);
  const docNames = documentRequirements.map((d) => d.name).filter(Boolean);

  const emit = (next) => {
    const ordered = next.map((s, i) => ({ ...s, order: i + 1 }));
    onChange(relinkStepOutcomes(ordered));
  };

  const addStep = () => {
    const order = normalized.length + 1;
    const step = createStep(order, null);
    emit([...normalized, step]);
    setExpandedId(step.stepId);
  };

  const updateStep = (stepId, patch) =>
    emit(normalized.map((s) => (s.stepId === stepId ? patch : s)));

  const removeStep = (stepId) =>
    emit(normalized.filter((s) => s.stepId !== stepId));

  if (!normalized.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#D4E5D0] bg-[#F6FAF5] p-10 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4EC]">
          <Flag className="h-5 w-5 text-[#3D6B35]" strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A2E16]">
            No workflow steps yet
          </p>
          <p className="mt-1 text-xs text-[#9BAE99]">
            Add a step to start building your workflow timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3D6B35] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#2D5427] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add first step
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 rounded-xl border border-[#D4E5D0] bg-[#F6FAF5] px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3D6B35]/10">
          <Flag className="h-3.5 w-3.5 text-[#3D6B35]" strokeWidth={2} />
        </div>
        <span className="text-sm font-semibold text-[#1A2E16]">
          Application submitted
        </span>
        <span className="text-xs text-[#9BAE99]">→ enters first step</span>
      </div>

      <div className="relative ml-5 space-y-3 border-l-2 border-[#D4E5D0] py-2">
        {normalized.map((step) => (
          <StepCard
            key={step.stepId}
            step={step}
            allSteps={normalized}
            staffRoles={staffRoles}
            docNames={docNames}
            expanded={expandedId === step.stepId}
            onToggle={() =>
              setExpandedId(expandedId === step.stepId ? null : step.stepId)
            }
            onChange={(patch) => updateStep(step.stepId, patch)}
            onRemove={() => removeStep(step.stepId)}
            canRemove={normalized.length > 1}
          />
        ))}
      </div>

      <div className="ml-9 flex items-center gap-2.5 rounded-xl border border-[#E8EDE6] bg-[#F7F8F6] px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F4F7F3]">
          <Flag className="h-3.5 w-3.5 text-[#9BAE99]" strokeWidth={2} />
        </div>
        <span className="text-xs text-[#9BAE99]">
          End states:{" "}
          <span className="font-medium text-[#6B7C69]">completed</span> or{" "}
          <span className="font-medium text-[#6B7C69]">rejected</span> —
          configured per outcome above
        </span>
      </div>

      <button
        type="button"
        onClick={addStep}
        className="ml-9 inline-flex items-center gap-2 rounded-lg border border-[#D4E5D0] bg-white px-4 py-2.5 text-xs font-semibold text-[#3D6B35] transition-all duration-150 hover:border-[#3D6B35] hover:bg-[#F6FAF5] active:scale-[0.98]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add step
      </button>
    </div>
  );
}
