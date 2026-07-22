import { ensureUserEmailIndexes } from '../../modules/users/user.model.js';
import { ChatSession } from '../../modules/chat/chatSession.model.js';
import { ChatMessage } from '../../modules/chat/chatMessage.model.js';
import { logger } from '../../core/logger/index.js';

/**
 * Ensure multi-tenant indexes exist and drop legacy global-unique indexes.
 * Call once after MongoDB connect.
 */
export async function ensureTenantIndexes() {
  await ensureUserEmailIndexes();

  try {
    await ChatSession.collection.dropIndex('serviceId_1_studentEmail_1');
  } catch {
    // Legacy index may already be absent
  }

  await Promise.all([ChatSession.syncIndexes(), ChatMessage.syncIndexes()]);
  logger.info('Tenant indexes ensured');
}
