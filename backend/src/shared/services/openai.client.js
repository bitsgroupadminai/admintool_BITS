import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { env } from '../../core/config/env.js';
import { logger } from '../../core/logger/index.js';

let client = null;

export function isOpenAiConfigured() {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

function getClient() {
  if (!isOpenAiConfigured()) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

function usesFixedSampling(model) {
  return /^(gpt-5|o1|o3|o4)/i.test(model);
}

function buildChatCompletionParams({ model, temperature, messages, structuredSchema, schemaName }) {
  const params = {
    model,
    response_format: structuredSchema
      ? zodResponseFormat(structuredSchema, schemaName || 'response')
      : { type: 'json_object' },
    messages,
  };
  if (!usesFixedSampling(model)) {
    params.temperature = temperature;
  }
  return params;
}

/**
 * @param {{
 *   system: string,
 *   user: string,
 *   schema: z.ZodType,
 *   structuredSchema?: z.ZodType,
 *   schemaName?: string,
 *   normalize?: (raw: unknown) => unknown,
 *   timeoutMs?: number,
 *   model?: string,
 * }} params
 */
export async function chatJson({
  system,
  user,
  schema,
  structuredSchema,
  schemaName,
  normalize,
  timeoutMs,
  model,
}) {
  const openai = getClient();
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const waitMs = timeoutMs ?? env.OPENAI_TIMEOUT_MS;
  const selectedModel = model ?? env.OPENAI_MODEL;

  const response = await createChatCompletion(
    openai,
    buildChatCompletionParams({
      model: selectedModel,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      structuredSchema,
      schemaName,
    }),
    waitMs,
  );

  const raw = response.choices[0]?.message?.content;
  return parseAndValidate(raw, normalize, schema);
}

/**
 * Vision-capable structured completion. Accepts image attachments (as data URLs)
 * alongside a text prompt and returns Zod-validated JSON, mirroring `chatJson`.
 *
 * @param {{
 *   system: string,
 *   user: string,
 *   images?: Array<{ dataUrl: string, detail?: 'auto' | 'low' | 'high' }>,
 *   schema: z.ZodType,
 *   structuredSchema?: z.ZodType,
 *   schemaName?: string,
 *   normalize?: (raw: unknown) => unknown,
 *   timeoutMs?: number,
 *   model?: string,
 * }} params
 */
export async function chatVisionJson({
  system,
  user,
  images = [],
  schema,
  structuredSchema,
  schemaName,
  normalize,
  timeoutMs,
  model,
}) {
  const openai = getClient();
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const waitMs = timeoutMs ?? env.OPENAI_INSIGHTS_TIMEOUT_MS;
  const selectedModel = model ?? env.OPENAI_VISION_MODEL;

  const userContent = [{ type: 'text', text: user }];
  for (const image of images) {
    if (!image?.dataUrl) continue;
    userContent.push({
      type: 'image_url',
      image_url: { url: image.dataUrl, detail: image.detail ?? 'auto' },
    });
  }

  const response = await createChatCompletion(
    openai,
    buildChatCompletionParams({
      model: selectedModel,
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      structuredSchema,
      schemaName,
    }),
    waitMs,
  );

  const raw = response.choices[0]?.message?.content;
  return parseAndValidate(raw, normalize, schema);
}

async function createChatCompletion(openai, params, waitMs) {
  try {
    return await Promise.race([
      openai.chat.completions.create(params),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timed out')), waitMs);
      }),
    ]);
  } catch (err) {
    const canFallback =
      params.response_format?.type === 'json_schema' &&
      /response_format|json_schema|structured/i.test(String(err?.message ?? ''));
    if (!canFallback) throw err;
    logger.warn({ err: err.message, model: params.model }, 'Strict JSON schema unsupported; retrying as json_object');
    return Promise.race([
      openai.chat.completions.create({
        ...params,
        response_format: { type: 'json_object' },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenAI request timed out')), waitMs);
      }),
    ]);
  }
}

/**
 * @param {string | undefined | null} raw
 * @param {((raw: unknown) => unknown) | undefined} normalize
 * @param {z.ZodType} schema
 */
function parseAndValidate(raw, normalize, schema) {
  if (!raw) {
    throw new Error('Empty response from OpenAI');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('OpenAI returned invalid JSON');
  }

  if (normalize) {
    parsed = normalize(parsed);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { errors: result.error.flatten(), sampleKeys: Object.keys(parsed ?? {}) },
      'OpenAI JSON failed schema validation',
    );
    throw new Error('OpenAI response did not match expected structure');
  }

  return result.data;
}
