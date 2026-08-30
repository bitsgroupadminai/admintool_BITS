import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  FileText,
  Lightbulb,
  MessageCircle,
  Plus,
  Settings,
  Trash2,
  AlertCircle,
  Pencil,
  X,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { DocumentPurposeStrip } from "@/components/services/DocumentPurposeStrip";
import { ExtractKnowledgeBridge } from "@/components/services/ExtractKnowledgeBridge";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-context";
import { AdminServiceDetailSkeleton } from "@/components/skeletons";
import { servicesApi } from "@/api/services.api";
import { offeringsApi } from "@/api/offerings.api";
import { knowledgeApi } from "@/api/knowledge.api";
import {
  formatOfferingMissing,
  countServiceReadyOfferings,
} from "@/constants/offeringCompleteness.constants";
import {
  OfferingBulkToolbar,
  OfferingBulkCheckbox,
} from "@/components/offerings/OfferingBulkToolbar";

export function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [insights, setInsights] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [activatingService, setActivatingService] = useState(false);
  const [selectedOfferingIds, setSelectedOfferingIds] = useState(new Set());
  const confirm = useConfirm();

  const step2Ref = useRef(null);
  const step3Ref = useRef(null);

  const hasExtracted = Boolean(insights?.generatedAt);
  const isStale =
    hasExtracted &&
    insights?.sourceDocumentCount != null &&
    documents.length !== insights.sourceDocumentCount;

  const scrollToStep = (step) => {
    const ref = step === 2 ? step2Ref : step === 3 ? step3Ref : null;
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const load = async () => {
    try {
      const [serviceRes, offeringsRes, docsRes, insightsRes] =
        await Promise.all([
          servicesApi.get(id),
          offeringsApi.list(id),
          knowledgeApi.list(id),
          servicesApi.getInsights(id),
        ]);
      setService(serviceRes.data.data.service);
      setOfferings(offeringsRes.data.data.offerings);
      setDocuments(docsRes.data.data.documents);
      setInsights(insightsRes.data.data.insights);
      setAiEnabled(Boolean(insightsRes.data.data.aiEnabled));
    } catch (err) {
      toast.error(err.message || "Failed to load service");
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    load();
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await knowledgeApi.upload(id, file);
      toast.success(
        "Document uploaded — indexing for student chat starts automatically",
      );
      await load();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeDoc = async (docId) => {
    const doc = documents.find((item) => item.id === docId);
    const ok = await confirm({
      title: "Remove document?",
      description: `Remove "${doc?.originalName ?? "this document"}" from this service?`,
      confirmLabel: "Remove document",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await knowledgeApi.remove(id, docId);
      toast.success("Document removed");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to remove document");
    }
  };

  const handleGenerateInsights = async () => {
    setGenerating(true);
    try {
      const { data } = await servicesApi.generateInsights(id);
      setInsights(data.data.insights);
      setAiEnabled(Boolean(data.data.aiEnabled));
      if (data.data.insights?.analysisWarning) {
        toast.warning(data.data.insights.analysisWarning);
      } else {
        toast.success(data.message);
      }
      await load();
    } catch (err) {
      toast.error(err.message || "Could not generate insights");
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManualSuggestion = async (e) => {
    e.preventDefault();
    try {
      const { data } = await servicesApi.addManualSuggestion(id, {
        name: manualName,
        description: manualDesc,
      });
      setInsights(data.data.insights);
      setManualName("");
      setManualDesc("");
      toast.success("Offering suggestion added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startEdit = (suggestion) => {
    setEditingId(suggestion.id);
    setEditName(suggestion.name);
    setEditDesc(suggestion.description ?? "");
  };

  const saveEdit = async () => {
    try {
      const { data } = await servicesApi.updateSuggestion(id, editingId, {
        name: editName,
        description: editDesc,
      });
      setInsights(data.data.insights);
      setEditingId(null);
      toast.success("Suggestion updated");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const createFromSuggestion = async (suggestionId) => {
    try {
      const { data } = await servicesApi.createOfferingFromSuggestion(
        id,
        suggestionId,
      );
      setInsights(data.data.insights);
      await load();
      toast.success("Offering created — continue configuration");
      navigate(`/admin/offerings/${data.data.offering.id}/configure`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteService = async () => {
    const ok = await confirm({
      title: `Delete "${service?.name}"?`,
      description:
        "All knowledge documents will be removed. You must delete all offerings first.",
      confirmLabel: "Delete service",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await servicesApi.remove(id);
      toast.success("Service deleted");
      navigate("/admin/services");
    } catch (err) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const handleActivateService = async () => {
    const readyCount = countServiceReadyOfferings(offerings);
    const ok = await confirm({
      title: `Activate "${service?.name}"?`,
      description:
        readyCount === 1
          ? "This service will go live. At least one offering is active or fully configured. Other incomplete offerings can stay as drafts."
          : `${readyCount} offerings are active or fully configured. This service will go live; any incomplete offerings can remain as drafts.`,
      confirmLabel: "Activate service",
    });
    if (!ok) return;

    setActivatingService(true);
    try {
      const { data } = await servicesApi.activate(id);
      setService(data.data.service);
      toast.success("Service is now active");
      await load();
    } catch (err) {
      toast.error(err.message || "Could not activate service");
    } finally {
      setActivatingService(false);
    }
  };

  const handleDeleteOffering = async (offering) => {
    const activeNote =
      offering.status === "active"
        ? " This offering is active — students will no longer see it."
        : "";
    const ok = await confirm({
      title: `Delete offering "${offering.name}"?`,
      description: `This cannot be undone.${activeNote}`,
      confirmLabel: "Delete offering",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await offeringsApi.remove(offering.id);
      toast.success("Offering deleted");
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to delete offering");
    }
  };

  const pendingSuggestions =
    insights?.suggestedOfferings?.filter((s) => s.status === "pending") ?? [];

  const readyOfferingCount = countServiceReadyOfferings(offerings);
  const canActivateService =
    service?.status !== "active" && readyOfferingCount >= 1;

  if (!service) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl px-6 py-10">
          <AdminServiceDetailSkeleton />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link
          to="/admin/services"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#4B6358] hover:text-[#0A6640] transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to services
        </Link>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#10B981] mb-2">
              Service detail
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-[#052E1C] tracking-tight">
                {service.name}
              </h1>
              <Badge variant={service.status}>{service.status}</Badge>
            </div>
            {service.description && (
              <p className="mt-1.5 text-sm text-[#4B6358]">
                {service.description}
              </p>
            )}
            {service.status !== "active" && (
              <p className="mt-2 text-xs text-[#6B7280]">
                {readyOfferingCount >= 1
                  ? `${readyOfferingCount} offering${readyOfferingCount === 1 ? "" : "s"} ready — you can activate this service even if other offerings are still incomplete.`
                  : "Configure at least one offering (active or fully saved) before activating this service."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {service.status !== "active" && (
              <button
                type="button"
                onClick={handleActivateService}
                disabled={!canActivateService || activatingService}
                title={
                  canActivateService
                    ? "Make this service active"
                    : "Requires at least one active or fully configured offering"
                }
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)] transition-all duration-200 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Zap className="h-4 w-4" strokeWidth={2} />
                {activatingService ? "Activating…" : "Activate service"}
              </button>
            )}
            <button
              onClick={handleDeleteService}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#EF4444] border border-[#FCA5A5] bg-red-50/60 transition-all duration-200 hover:bg-red-50 hover:border-[#EF4444]"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
              Delete service
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-[#C4E8D4] bg-gradient-to-r from-[#F0FAF5] to-[#D1FAE5]/30 px-6 py-4">
          <p className="text-sm font-semibold text-[#052E1C]">How this works</p>
          <p className="mt-1 text-sm text-[#4B6358] leading-relaxed">
            Upload policies → extract a review pack with AI → confirm chatbot
            readiness and offerings here → configure eligibility, documents,
            workflow, and queue per offering.
          </p>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden">
            <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#E2EEE8]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)]">
                <span className="text-xs font-bold text-white">1</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#052E1C]">
                  Upload knowledge documents
                </p>
                <p className="text-xs text-[#4B6358]">
                  Source files only. Extraction happens in the next step —
                  nothing is analyzed until you press Extract knowledge.
                </p>
              </div>
            </div>

            <div className="px-7 py-6 space-y-5">
              <DocumentPurposeStrip />

              <div className="rounded-xl border-2 border-dashed border-[#C4E8D4] bg-[#F0FAF5] px-6 py-8 text-center hover:border-[#6EE7B7] hover:bg-[#EDFAF3] transition-all duration-200">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-[#C4E8D4] shadow-sm">
                  <FileText
                    className="h-5 w-5 text-[#0A6640]"
                    strokeWidth={2}
                  />
                </div>
                <p className="text-sm font-medium text-[#052E1C]">
                  {documents.length === 0
                    ? "Start by uploading your first PDF or DOCX"
                    : `${documents.length} document${documents.length > 1 ? "s" : ""} uploaded`}
                </p>
                <p className="mt-1 text-xs text-[#4B6358]">PDF, DOCX, TXT, or MD only</p>
                <label
                  htmlFor="doc-upload"
                  className="mt-4 inline-block cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 h-9 rounded-xl bg-gradient-to-r from-[#0A6640] to-[#084F31] px-5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)] transition-all duration-300">
                    {uploading ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Upload file
                      </>
                    )}
                  </span>
                </label>
                <input
                  id="doc-upload"
                  type="file"
                  accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </div>

              {documents.length > 0 && (
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-[#C4E8D4]">
                          <FileText
                            className="h-3.5 w-3.5 text-[#0A6640]"
                            strokeWidth={2}
                          />
                        </div>
                        <span className="truncate text-[#052E1C] font-medium">
                          {doc.originalName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {doc.indexStatus === 'indexed' ? (
                          <span className="text-[10px] font-semibold text-[#0A6640] bg-[#D1FAE5] border border-[#A7F3D0] rounded-full px-2 py-0.5">
                            Chat ready
                          </span>
                        ) : doc.indexStatus === 'indexing' ? (
                          <span className="text-[10px] font-semibold text-[#92400E] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-2 py-0.5">
                            Indexing
                          </span>
                        ) : doc.indexStatus === 'failed' ? (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            Index failed
                          </span>
                        ) : null}
                        {doc.hasExtractedText ? (
                          <span className="text-[10px] font-semibold text-[#0A6640] bg-[#D1FAE5] border border-[#A7F3D0] rounded-full px-2 py-0.5">
                            Text OK
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            No text
                          </span>
                        )}
                        <button
                          onClick={() => removeDoc(doc.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] border border-transparent transition-all duration-200 hover:border-[#FCA5A5] hover:bg-red-50 hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden">
            <div className="px-7 py-5">
              <ExtractKnowledgeBridge
                hasDocuments={documents.length > 0}
                extracting={generating}
                insights={insights}
                isStale={isStale}
                analysisWarning={insights?.analysisWarning}
                analysisMode={insights?.analysisMode}
                aiEnabled={aiEnabled}
                onExtract={handleGenerateInsights}
                onScrollToStep={scrollToStep}
              />
            </div>
          </div>

          <div
            ref={step2Ref}
            className="scroll-mt-6 rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#E2EEE8]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)]">
                <span className="text-xs font-bold text-white">2</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#052E1C]">
                  Review chatbot readiness
                </p>
                <p className="text-xs text-[#4B6358]">
                  Summaries and questions drawn from your documents — confirm
                  they match your intent.
                </p>
              </div>
            </div>

            <div className="px-7 py-6 space-y-4">
              {!hasExtracted ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-5 py-4">
                  <Sparkles
                    className="h-4 w-4 shrink-0 text-[#A8BDB5]"
                    strokeWidth={2}
                  />
                  <p className="text-sm text-[#4B6358]">
                    Complete{" "}
                    <span className="font-semibold text-[#052E1C]">
                      Extract knowledge
                    </span>{" "}
                    above to unlock this section.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-[#C4E8D4]">
                        <BookOpen
                          className="h-4 w-4 text-[#0A6640]"
                          strokeWidth={2}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#052E1C]">
                          Service understanding
                        </p>
                        <p className="mt-1.5 text-sm text-[#4B6358] leading-relaxed">
                          {insights.understandingSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {insights.chatbotReadinessSummary && (
                    <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-[#C4E8D4]">
                          <MessageCircle
                            className="h-4 w-4 text-[#0A6640]"
                            strokeWidth={2}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#052E1C]">
                            Future chatbot — what it could understand
                          </p>
                          <p className="mt-1.5 text-sm text-[#4B6358] leading-relaxed">
                            {insights.chatbotReadinessSummary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageCircle
                          className="h-4 w-4 text-[#0A6640]"
                          strokeWidth={2}
                        />
                        <p className="text-sm font-semibold text-[#052E1C]">
                          Example student questions
                        </p>
                      </div>
                      {insights.chatbotCanAnswer?.length ? (
                        <ul className="space-y-2">
                          {insights.chatbotCanAnswer.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-sm text-[#4B6358]"
                            >
                              <CheckCircle2
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]"
                                strokeWidth={2}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#6B7280]">
                          None listed in the review pack.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle
                          className="h-4 w-4 text-amber-500"
                          strokeWidth={2}
                        />
                        <p className="text-sm font-semibold text-[#052E1C]">
                          Gaps to improve
                        </p>
                      </div>
                      {insights.gaps?.length ? (
                        <ul className="space-y-2">
                          {insights.gaps.map((gap) => (
                            <li key={gap} className="text-sm text-[#4B6358]">
                              {gap}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[#6B7280]">
                          No major gaps flagged.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            ref={step3Ref}
            className="scroll-mt-6 rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#E2EEE8]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)]">
                <span className="text-xs font-bold text-white">3</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#052E1C]">
                  Check offerings from document
                </p>
                <p className="text-xs text-[#4B6358]">
                  Intake names from your policies (with source quotes). Create
                  each offering, then configure rules, documents, and workflow.
                </p>
              </div>
            </div>

            <div className="px-7 py-6 space-y-4">
              {!hasExtracted ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-5 py-4">
                  <Sparkles
                    className="h-4 w-4 shrink-0 text-[#A8BDB5]"
                    strokeWidth={2}
                  />
                  <p className="text-sm text-[#4B6358]">
                    Complete{" "}
                    <span className="font-semibold text-[#052E1C]">
                      Extract knowledge
                    </span>{" "}
                    above to see offerings from your document.
                  </p>
                </div>
              ) : (
                <>
                  {pendingSuggestions.length > 0 && (
                    <div className="space-y-3">
                      {pendingSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5"
                        >
                          {editingId === suggestion.id ? (
                            <div className="space-y-3">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Offering name"
                                className="w-full rounded-xl border border-[#C4E8D4] bg-white px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                              />
                              <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Short description (optional)"
                                className="w-full rounded-xl border border-[#C4E8D4] bg-white px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEdit}
                                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#0A6640] to-[#084F31] shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)]"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#0A6640] border border-[#C4E8D4] bg-white transition-all duration-200 hover:bg-[#F0FAF5] hover:border-[#6EE7B7]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-[#052E1C]">
                                      {suggestion.name}
                                    </p>
                                    {suggestion.source === "manual" && (
                                      <span className="text-[10px] font-semibold text-[#4B6358] bg-[#E2EEE8] border border-[#C4E8D4] rounded-full px-2 py-0.5">
                                        Manual
                                      </span>
                                    )}
                                  </div>
                                  {suggestion.description && (
                                    <p className="mt-1 text-sm text-[#4B6358]">
                                      {suggestion.description}
                                    </p>
                                  )}
                                  {(suggestion.documentExcerpt ||
                                    suggestion.rationale) && (
                                    <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#C4E8D4] bg-white px-3 py-2">
                                      <Lightbulb
                                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]"
                                        strokeWidth={2}
                                      />
                                      <p className="text-xs text-[#6B7280] italic">
                                        &ldquo;
                                        {suggestion.documentExcerpt ??
                                          suggestion.rationale}
                                        &rdquo;
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    createFromSuggestion(suggestion.id)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#0A6640] to-[#084F31] shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(10,102,64,0.36)]"
                                >
                                  Create offering
                                  <ArrowRight
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                  />
                                </button>
                                <button
                                  onClick={() => startEdit(suggestion)}
                                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[#0A6640] border border-[#C4E8D4] bg-white transition-all duration-200 hover:bg-[#F0FAF5] hover:border-[#6EE7B7]"
                                >
                                  <Pencil
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2}
                                  />
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    const { data } =
                                      await servicesApi.dismissSuggestion(
                                        id,
                                        suggestion.id,
                                      );
                                    setInsights(data.data.insights);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-[#6B7280] border border-transparent transition-all duration-200 hover:border-[#C4E8D4] hover:bg-white hover:text-[#4B6358]"
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                                  Dismiss
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {insights && pendingSuggestions.length === 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-5 py-4">
                      <AlertCircle
                        className="h-4 w-4 shrink-0 text-[#A8BDB5]"
                        strokeWidth={2}
                      />
                      <p className="text-sm text-[#4B6358]">
                        No explicitly named offerings were extracted. Re-extract
                        after updating your uploads, or add an offering manually
                        below.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] p-5">
                    <p className="text-sm font-semibold text-[#052E1C]">
                      Add offering manually
                    </p>
                    <p className="mt-0.5 text-xs text-[#4B6358]">
                      Skip AI suggestions and define an offering name yourself.
                    </p>
                    <form
                      onSubmit={handleAddManualSuggestion}
                      className="mt-4 space-y-2.5"
                    >
                      <input
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="e.g. Admission 2026 — Evening batch"
                        required
                        className="w-full rounded-xl border border-[#C4E8D4] bg-white px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                      />
                      <input
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="Optional description"
                        className="w-full rounded-xl border border-[#C4E8D4] bg-white px-4 py-2.5 text-sm text-[#052E1C] placeholder-[#A8BDB5] outline-none transition-all duration-200 hover:border-[#6EE7B7] focus:border-[#6EE7B7] focus:ring-2 focus:ring-[#6EE7B7]/20"
                      />
                      <button
                        type="submit"
                        disabled={!manualName.trim()}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#0A6640] border border-[#C4E8D4] bg-white transition-all duration-200 hover:bg-[#F0FAF5] hover:border-[#6EE7B7] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Add to suggestions
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#C4E8D4] bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)] overflow-hidden">
            <div className="flex items-center gap-3 px-7 pt-7 pb-5 border-b border-[#E2EEE8]">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0A6640] to-[#10B981] shadow-[0_2px_8px_rgba(10,102,64,0.22)]">
                <span className="text-xs font-bold text-white">
                  {offerings.length}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#052E1C]">
                  Your offerings
                </p>
                <p className="text-xs text-[#4B6358]">
                  Create offerings from Step 3, then Configure to apply
                  eligibility, required documents, workflow steps, and queue
                  settings.
                </p>
              </div>
            </div>

            <div className="px-7 py-6">
              <OfferingBulkToolbar
                offerings={offerings}
                onUpdated={load}
                selected={selectedOfferingIds}
                onSelectedChange={setSelectedOfferingIds}
              />
              {offerings.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-5 py-4">
                  <Layers
                    className="h-4 w-4 shrink-0 text-[#A8BDB5]"
                    strokeWidth={2}
                  />
                  <p className="text-sm text-[#4B6358]">
                    No offerings yet. Extract knowledge, review Step 3, then
                    create your first offering.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offerings.map((offering) => (
                    <div
                      key={offering.id}
                      className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C4E8D4] bg-[#F0FAF5] px-5 py-4 transition-all duration-200 hover:border-[#6EE7B7] hover:bg-[#EDFAF3]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <OfferingBulkCheckbox
                          offeringId={offering.id}
                          checked={selectedOfferingIds.has(offering.id)}
                          onToggle={(oid) => {
                            const next = new Set(selectedOfferingIds);
                            if (next.has(oid)) next.delete(oid);
                            else next.add(oid);
                            setSelectedOfferingIds(next);
                          }}
                        />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#052E1C]">
                            {offering.name}
                          </p>
                          <Badge variant={offering.status}>
                            {offering.status}
                          </Badge>
                        </div>
                        {!offering.completeness?.isComplete && (
                          <p className="mt-1 text-xs text-[#6B7280]">
                            Still needed:{" "}
                            {formatOfferingMissing(offering.completeness.missing).join(", ")}
                          </p>
                        )}
                        {offering.completeness?.isComplete &&
                          offering.status !== "active" && (
                            <p className="mt-1 text-xs text-[#0A6640]">
                              Configuration complete — open Configure, go to Review, and
                              activate this offering.
                            </p>
                          )}
                        {offering.status === "active" && offering.studentPortalNote && (
                            <p
                              className={`mt-1 text-xs ${
                                offering.studentPortalVisible
                                  ? "text-[#0A6640]"
                                  : "text-[#B45309]"
                              }`}
                            >
                              {offering.studentPortalNote}
                            </p>
                          )}
                      </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/admin/offerings/${offering.id}/configure`,
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[#0A6640] border border-[#C4E8D4] bg-white transition-all duration-200 hover:bg-[#F0FAF5] hover:border-[#6EE7B7]"
                        >
                          <Settings className="h-3.5 w-3.5" strokeWidth={2} />
                          Configure
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { data } = await offeringsApi.duplicate(
                                offering.id,
                              );
                              toast.success("Offering duplicated");
                              navigate(
                                `/admin/offerings/${data.data.offering.id}/configure`,
                              );
                            } catch (err) {
                              toast.error(err.message || "Duplicate failed");
                            }
                          }}
                          title="Duplicate offering"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C4E8D4] bg-white text-[#4B6358] transition-all duration-200 hover:border-[#6EE7B7] hover:text-[#0A6640] hover:bg-[#F0FAF5]"
                        >
                          <Copy className="h-4 w-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDeleteOffering(offering)}
                          title="Delete offering"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[#9CA3AF] transition-all duration-200 hover:border-[#FCA5A5] hover:bg-red-50 hover:text-[#EF4444]"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
