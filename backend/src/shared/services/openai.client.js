import OpenAI from 'openai';
import { z } from 'zod';
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

/**
 * @param {{ system: string, user: string, schema: z.ZodType, normalize?: (raw: unknown) => unknown }} params
 */
export async function chatJson({ system, user, schema, normalize }) {
  const openai = getClient();
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }

  const response = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = response.choices[0]?.message?.content;
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
