import { ChatSession } from './chatSession.model.js';
import { ChatMessage } from './chatMessage.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { chatJson, isOpenAiConfigured } from '../../shared/services/openai.client.js';
import { retrieveRelevantChunks } from '../../shared/services/rag.service.js';
import { logger } from '../../core/logger/index.js';
import { OFFERING_STATUS } from '../../shared/enums/offering.enums.js';
import { formatDocumentRequirements, getDocumentUploadProgress } from '../../shared/helpers/applicationDocument.helper.js';
import { z } from 'zod';

const chatReplySchema = z.object({
  reply: z.string().min(1),
  citations: z
    .array(
      z.object({
        source: z.string(),
        excerpt: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
});

function formatMessage(message) {
  const citations = message.citations ?? [];
  const confidence =
    citations.length >= 2 ? 'high' : citations.length === 1 ? 'medium' : 'low';
  return {
    id: message._id.toString(),
    role: message.role,
    content: message.content,
    citations,
    confidence,
    createdAt: message.createdAt,
  };
}

function formatDocumentList(offerings) {
  const sections = offerings
    .map((offering) => {
      const docs = offering.documentRequirements ?? [];
      if (!docs.length) return null;

      const lines = docs.map((doc, index) => {
        const label = doc.required === false ? 'optional' : 'required';
        const types = doc.allowedTypes?.length ? ` (${doc.allowedTypes.join(', ')})` : '';
        return `${index + 1}. ${doc.name}${types} — ${label}`;
      });

      return `${offering.name}:\n${lines.join('\n')}`;
    })
    .filter(Boolean);

  if (!sections.length) {
    return null;
  }

  return sections.join('\n\n');
}

function humanizeStatus(status) {
  return String(status ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatQueueModeLabel(mode) {
  const labels = {
    queue_only: 'walk-in queue',
    appointment_only: 'appointment booking',
    hybrid: 'queue or appointment',
    none: 'no visit booking',
  };
  return labels[mode] ?? mode?.replace(/_/g, ' ') ?? 'visit planning';
}

function isGreeting(text) {
  return /^(hi|hello|hey|hiya|good\s+(morning|afternoon|evening))\b/.test(text);
}

function isProcessQuestion(text) {
  const strongProcess =
    /\b(after|once|when)\b.*\b(submit|submission|upload|documents?)\b/.test(text) ||
    /\b(what happens|what will happen|what will be|what's next|whats next|next step|next steps|process|workflow|procedure)\b/.test(
      text,
    );

  if (strongProcess) return true;

  const asksAboutFlow =
    /\b(then|timeline|how long|expect|happens|going to happen)\b/.test(text);

  const asksForDocumentList =
    /\b(which|what)\s+(documents?|files?)\b/.test(text) ||
    /\b(list|show)\b.*\b(documents?|files?)\b/.test(text) ||
    /\b(documents?|files?)\b.*\b(need|required|missing)\b/.test(text);

  return asksAboutFlow && !asksForDocumentList;
}

function isDocumentQuestion(text) {
  return (
    /\b(documents?|files?|uploads?)\b/.test(text) &&
    /\b(what|which|list|need|required|upload|missing|submit|bring|prepare)\b/.test(text)
  );
}

function isEligibilityQuestion(text) {
  return /\b(eligible|eligibility|qualify|requirement|criteria|can i apply)\b/.test(text);
}

function isStatusQuestion(text) {
  return /\b(status|track|tracking|approved|rejected|pending|where is my)\b/.test(text);
}

function isVisitQuestion(text) {
  return /\b(queue|appointment|visit|slot|book|walk[- ]?in)\b/.test(text);
}

function buildFocusOfferingSummary(offering) {
  if (!offering) return null;

  const steps = [...(offering.workflowSteps ?? [])].sort((a, b) => a.order - b.order);

  return {
    id: offering._id.toString(),
    name: offering.name,
    description: offering.description ?? '',
    workflowSteps: steps.map((step) => ({
      order: step.order,
      name: step.name,
      description: step.description ?? '',
      handledBy: step.handledBy?.assignee ?? step.handledBy?.type ?? '',
      sla: `${step.slaValue} ${step.slaUnit}`,
    })),
    queueMode: offering.queueMode ?? 'not configured',
    documentCount: offering.documentRequirements?.length ?? 0,
  };
}

function buildServiceContext(service, offerings, options = {}) {
  const { focusOffering = null, application = null } = options;
  const orderedOfferings = focusOffering
    ? [focusOffering, ...offerings.filter((item) => item._id.toString() !== focusOffering._id.toString())]
    : offerings;

  const offeringSummaries = orderedOfferings.map((offering) => {
    const docs = formatDocumentRequirements(offering.documentRequirements ?? []);
    const steps = [...(offering.workflowSteps ?? [])].sort((a, b) => a.order - b.order);
    return {
      id: offering._id.toString(),
      name: offering.name,
      description: offering.description ?? '',
      eligibility: (offering.eligibilityRules ?? []).map(
        (rule) => `${rule.field} ${rule.operator} ${rule.value}`,
      ),
      documents: docs.map((doc) => ({
        name: doc.name,
        required: doc.required !== false,
        allowedTypes: doc.allowedTypes ?? [],
      })),
      workflowSteps: steps.map((step) => ({
        order: step.order,
        name: step.name,
        description: step.description ?? '',
        handledBy: step.handledBy?.assignee ?? step.handledBy?.type ?? '',
        sla: `${step.slaValue} ${step.slaUnit}`,
      })),
      queueMode: offering.queueMode ?? 'not configured',
    };
  });

  const focusOfferingSummary = buildFocusOfferingSummary(focusOffering);

  let applicationSummary = null;
  if (application && focusOffering) {
    const progress = getDocumentUploadProgress(focusOffering, application);
    applicationSummary = {
      status: application.status,
      documentsComplete: progress.documentsComplete,
      uploadedRequiredCount: progress.uploadedRequiredCount,
      requiredDocumentCount: progress.requiredDocumentCount,
      missingRequiredDocuments: progress.missingRequiredDocuments?.map((item) => item.name) ?? [],
    };
  }

  return {
    serviceName: service.name,
    serviceDescription: service.description ?? '',
    focusOffering: focusOfferingSummary,
    offerings: offeringSummaries,
    application: applicationSummary,
    documentListText: formatDocumentList(orderedOfferings),
  };
}

function buildProcessReply(context) {
  const offering = context.focusOffering ?? context.offerings[0];
  const steps = offering?.workflowSteps ?? [];
  const lines = [];

  if (context.application?.status) {
    lines.push(`Your current request status is "${humanizeStatus(context.application.status)}".`);
    lines.push('');
  }

  if (context.application && context.application.documentsComplete === false) {
    lines.push('First, upload every required document on this service page.');
    if (context.application.missingRequiredDocuments?.length) {
      lines.push(`Still needed: ${context.application.missingRequiredDocuments.join(', ')}.`);
    }
    lines.push('');
  }

  lines.push('After you submit with all required documents, here is what happens next:');
  lines.push('');

  if (steps.length) {
    steps.forEach((step, index) => {
      const detail = step.description ? ` — ${step.description}` : '';
      const handler = step.handledBy ? ` (${step.handledBy})` : '';
      lines.push(`${index + 1}. ${step.name}${detail}${handler}`);
    });
  } else {
    lines.push('1. Institute staff review your submitted request');
    lines.push('2. You receive email updates if approval, rejection, or corrections are needed');
    lines.push('3. Follow any further instructions from the institute office');
  }

  const queueMode = offering?.queueMode;
  if (queueMode && queueMode !== 'not configured' && queueMode !== 'none') {
    lines.push('');
    lines.push(
      `Visit planning: ${formatQueueModeLabel(queueMode)} becomes available once your request moves forward.`,
    );
  }

  lines.push('');
  lines.push('You can track progress on this page and check your email for updates.');

  return lines.join('\n');
}

function buildHeuristicReply(message, context) {
  const text = message.toLowerCase().trim();

  if (isGreeting(text)) {
    const programme = context.focusOffering?.name ?? context.serviceName;
    return `Hello! I can help with ${programme}. Ask about what happens after you submit, required documents, eligibility, your request status, or visit planning.`;
  }

  if (isProcessQuestion(text)) {
    return buildProcessReply(context);
  }

  if (isDocumentQuestion(text)) {
    if (context.documentListText) {
      if (context.application?.missingRequiredDocuments?.length) {
        return [
          'Here are the documents for your service option:',
          context.documentListText,
          '',
          `You still need to upload: ${context.application.missingRequiredDocuments.join(', ')}.`,
          'Upload them on this page, then submit your request.',
        ].join('\n');
      }

      return [
        'Here are the documents required for this service:',
        context.documentListText,
        '',
        'Start your request on this page, upload each file, then submit when everything is ready.',
      ].join('\n');
    }

    return 'This programme does not list any documents yet. Check the requirements section on the page or contact your institute office.';
  }

  if (isEligibilityQuestion(text)) {
    const rules = context.offerings.flatMap((offering) =>
      offering.eligibility.length
        ? offering.eligibility.map((rule) => `${offering.name}: ${rule}`)
        : [],
    );
    if (!rules.length) {
      return 'Review the eligibility section for your chosen service option before you apply.';
    }
    return ['Before applying, confirm that you meet these checks:', ...rules.map((rule, index) => `${index + 1}. ${rule}`)].join('\n');
  }

  if (isStatusQuestion(text)) {
    if (context.application?.status) {
      return `Your current request status is "${context.application.status.replace(/_/g, ' ')}". Track progress on this page and check your email for updates from the institute.`;
    }
    return 'After you submit, track progress on this service page. The institute will email you when the status changes or if corrections are needed.';
  }

  if (isVisitQuestion(text)) {
    if (context.application?.documentsComplete) {
      return 'Your documents are complete. After your request is submitted, you can use the Visit planning section on this page to join the queue or book an appointment when slots are available.';
    }
    return 'Queue and appointment booking become available after you submit your request with all required documents uploaded.';
  }

  return `I can help with ${context.focusOffering?.name ?? context.serviceName}. Try asking:\n1. What happens after I submit?\n2. What documents do I need?\n3. What is my request status?`;
}

const INSTRUCTOR_SYSTEM_PROMPT = `You are an experienced institute help desk officer — like the friendly staff member at the college admissions counter who guides confused students every day.

You deeply understand student worries: missing documents, not knowing what happens next, how to book visits, and whether their request was received.

YOUR ROLE:
- Listen to the student's EXACT question and answer only that — never dump unrelated information.
- If they ask what happens AFTER submitting documents → explain the workflow/process steps in order.
- If they ask HOW to book appointments or queue → explain visit planning steps and when booking opens.
- If they ask WHAT documents they need → list documents clearly with required/optional labels.
- If they ask about status → use their application data from studentContext when available.
- Use retrievedKnowledge as your primary factual source. Use studentContext for their personal progress.

TONE:
- Warm, patient, professional — like a helpful college staff member.
- Plain English. Short paragraphs. Numbered steps for processes.
- Reassure students when they seem worried.

STRICT RULES:
1. Never invent fees, dates, or policies not in retrievedKnowledge or studentContext.
2. Never list documents when the student asked about process or appointments.
3. Never repeat the same generic answer for different questions.
4. Do NOT use markdown (** or ##). Plain text only.
5. If information is missing, honestly say what to check on the portal or with the institute office.
6. Keep under 200 words unless listing documents or workflow steps.

Respond as JSON only: {"reply":"...","citations":[{"source":"source name","excerpt":"short quote"}]}`;

function buildRetrievalFallbackReply(message, context, retrieved) {
  const text = message.toLowerCase().trim();
  let preferredTypes = ['KNOWLEDGE', 'WORKFLOW', 'DOCUMENTS', 'VISIT', 'ELIGIBILITY', 'SERVICE'];

  if (isProcessQuestion(text)) {
    preferredTypes = ['WORKFLOW', 'VISIT', 'KNOWLEDGE', 'SERVICE'];
  } else if (isVisitQuestion(text)) {
    preferredTypes = ['VISIT', 'WORKFLOW', 'KNOWLEDGE'];
  } else if (isDocumentQuestion(text)) {
    preferredTypes = ['DOCUMENTS', 'KNOWLEDGE', 'ELIGIBILITY'];
  } else if (isEligibilityQuestion(text)) {
    preferredTypes = ['ELIGIBILITY', 'DOCUMENTS', 'KNOWLEDGE'];
  } else if (isStatusQuestion(text)) {
    return {
      reply: context.application?.status
        ? `Your current request status is "${humanizeStatus(context.application.status)}". Track updates on this page and check your email from the institute.`
        : 'After you submit, you can track your request status on this service page. The institute will email you when there is an update.',
      citations: [],
    };
  }

  const ranked = [...retrieved].sort((a, b) => {
    const aRank = preferredTypes.indexOf(a.sourceType);
    const bRank = preferredTypes.indexOf(b.sourceType);
    const aScore = (aRank === -1 ? 50 : aRank) - a.score * 10;
    const bScore = (bRank === -1 ? 50 : bRank) - b.score * 10;
    return aScore - bScore;
  });

  const primary = ranked[0];
  const citations = ranked.slice(0, 2).map((chunk) => ({
    source: chunk.sourceName,
    excerpt: chunk.text.slice(0, 140),
  }));

  let intro = 'Here is what I found for your question:';
  if (isProcessQuestion(text)) {
    intro = 'After you submit your documents, here is the process:';
  } else if (isVisitQuestion(text)) {
    intro = 'About visits and appointments for this service:';
  } else if (isDocumentQuestion(text)) {
    intro = 'Here are the documents you need to prepare:';
  }

  return {
    reply: [intro, '', primary.text].join('\n'),
    citations,
  };
}

async function buildAssistantReply(message, context, history, instituteId, serviceId) {
  const retrieved = await retrieveRelevantChunks(instituteId, serviceId, message);

  const retrievedKnowledge = retrieved.map((chunk, index) => ({
    rank: index + 1,
    relevanceScore: Number(chunk.score?.toFixed(3) ?? 0),
    sourceType: chunk.sourceType,
    sourceName: chunk.sourceName,
    excerpt: chunk.text.slice(0, 700),
  }));

  if (isOpenAiConfigured()) {
    try {
      const result = await chatJson({
        system: INSTRUCTOR_SYSTEM_PROMPT,
        user: JSON.stringify({
          retrievedKnowledge,
          studentContext: context,
          conversationHistory: history.slice(-6),
          studentQuestion: message,
        }),
        schema: chatReplySchema,
      });

      if (result?.reply) {
        const citations =
          result.citations?.length > 0
            ? result.citations
            : retrieved.slice(0, 2).map((chunk) => ({
                source: chunk.sourceName,
                excerpt: chunk.text.slice(0, 120),
              }));

        return {
          reply: result.reply.replace(/\*\*/g, '').trim(),
          citations,
        };
      }
    } catch (err) {
      logger.warn({ err: err?.message }, 'OpenAI RAG chat failed, using retrieval fallback');
    }
  }

  if (retrieved.length) {
    return buildRetrievalFallbackReply(message, context, retrieved);
  }

  return {
    reply: buildHeuristicReply(message, context),
    citations: [],
  };
}

async function loadOfferings(instituteId, serviceId) {
  return Offering.find({
    instituteId,
    serviceId,
    status: {
      $nin: [OFFERING_STATUS.DISABLED, OFFERING_STATUS.ARCHIVED, OFFERING_STATUS.EXPIRED],
    },
  }).select('name description eligibilityRules documentRequirements workflowSteps queueMode appointmentConfig');
}

async function getOrCreateSession(instituteId, serviceId, studentEmail) {
  let session = await ChatSession.findOne({ instituteId, serviceId, studentEmail });
  if (!session) {
    session = await ChatSession.create({ instituteId, serviceId, studentEmail });
  }
  return session;
}

async function loadChatContext(instituteId, serviceId, user, offeringId) {
  const service = await Service.findOne({ _id: serviceId, instituteId });
  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const offerings = await loadOfferings(instituteId, serviceId);
  const focusOffering = offeringId
    ? offerings.find((offering) => offering._id.toString() === offeringId) ?? null
    : offerings[0] ?? null;

  let application = null;
  if (focusOffering) {
    application = await Application.findOne({
      instituteId,
      serviceId,
      offeringId: focusOffering._id,
      applicantEmail: user.email.toLowerCase(),
    });
  }

  const context = buildServiceContext(service, offerings, { focusOffering, application });
  return { service, offerings, focusOffering, application, context };
}

function streamTextChunks(text, onChunk) {
  if (!onChunk) return;
  const words = text.split(/(\s+)/);
  for (const word of words) {
    if (word) onChunk(word);
  }
}

/**
 * Prepare session + context for WebSocket chat.
 */
export async function prepareChatSession(instituteId, serviceId, user, offeringId) {
  const { context } = await loadChatContext(instituteId, serviceId, user, offeringId);
  const session = await getOrCreateSession(instituteId, serviceId, user.email.toLowerCase());
  const previousMessages = await ChatMessage.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .limit(20);

  return {
    sessionId: session._id.toString(),
    context,
    history: previousMessages.map((item) => ({ role: item.role, content: item.content })),
  };
}

export async function persistUserMessage(sessionId, message) {
  const userMessage = await ChatMessage.create({
    sessionId,
    role: 'user',
    content: message,
  });
  return formatMessage(userMessage);
}

export async function generateAssistantReply(
  instituteId,
  serviceId,
  user,
  message,
  offeringId,
  context,
  history,
  onStream,
) {
  const { reply, citations } = await buildAssistantReply(
    message,
    context,
    history,
    instituteId,
    serviceId,
  );
  streamTextChunks(reply, onStream);

  const session = await getOrCreateSession(instituteId, serviceId, user.email.toLowerCase());
  const assistantMessage = await ChatMessage.create({
    sessionId: session._id,
    role: 'assistant',
    content: reply,
    citations,
  });

  return formatMessage(assistantMessage);
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {{ email: string }} user
 */
export async function getChatHistory(instituteId, serviceId, user) {
  const session = await ChatSession.findOne({
    instituteId,
    serviceId,
    studentEmail: user.email.toLowerCase(),
  });

  if (!session) {
    return { sessionId: null, messages: [] };
  }

  const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(50);
  return {
    sessionId: session._id.toString(),
    messages: messages.map(formatMessage),
  };
}

/**
 * @param {string} instituteId
 * @param {string} serviceId
 * @param {{ email: string }} user
 * @param {string} message
 * @param {string} [offeringId]
 */
/** @deprecated Prefer WebSocket chat:send. Kept for backward compatibility. */
export async function sendStudentChatMessage(instituteId, serviceId, user, message, offeringId) {
  const session = await prepareChatSession(instituteId, serviceId, user, offeringId);
  const userMessage = await persistUserMessage(session.sessionId, message);
  const assistantMessage = await generateAssistantReply(
    instituteId,
    serviceId,
    user,
    message,
    offeringId,
    session.context,
    session.history,
    null,
  );

  return {
    sessionId: session.sessionId,
    messages: [userMessage, assistantMessage],
    reply: assistantMessage,
  };
}
