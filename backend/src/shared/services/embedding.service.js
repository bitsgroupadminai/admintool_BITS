import OpenAI from 'openai';
import { env } from '../../core/config/env.js';
import { isOpenAiConfigured } from './openai.client.js';

let client = null;

function getClient() {
  if (!isOpenAiConfigured()) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * @param {string} text
 * @returns {Promise<number[] | null>}
 */
export async function embedText(text) {
  const [vector] = await embedTexts([text]);
  return vector ?? null;
}

/**
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts) {
  const openai = getClient();
  if (!openai || !texts.length) {
    return [];
  }

  const cleaned = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000));
  const response = await Promise.race([
    openai.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: cleaned,
    }),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Embedding request timed out')), 30_000);
    }),
  ]);

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
