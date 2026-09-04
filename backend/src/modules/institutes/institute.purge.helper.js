import { Institute } from './institute.model.js';
import { User } from '../users/user.model.js';
import { Application } from '../applications/application.model.js';
import { Service } from '../services/service.model.js';
import { Offering } from '../offerings/offering.model.js';
import { OfferingConfigSnapshot } from '../offerings/offering.version.model.js';
import { KnowledgeDocument } from '../knowledge-documents/knowledgeDocument.model.js';
import { KnowledgeDocumentVersion } from '../knowledge-documents/knowledgeDocument.version.model.js';
import { deleteAllForService } from '../knowledge-documents/knowledgeDocument.service.js';
import { ChatSession } from '../chat/chatSession.model.js';
import { ChatMessage } from '../chat/chatMessage.model.js';
import { Notification } from '../notifications/notification.model.js';
import { purgeApplicationRecord } from '../applications/application.purge.helper.js';
import { deleteAvatarFile } from '../../shared/helpers/avatar.helper.js';
import {
  flushInstituteReadCache,
  flushStudentInstitutesCache,
} from '../../shared/helpers/cacheInvalidation.helper.js';
import { destroySessionsForInstitute } from '../../core/services/session.service.js';
import { logger } from '../../core/logger/index.js';

/**
 * Permanently remove an institute and every tenant-scoped record:
 * applications (email/phone), staff, students, services, offerings, files, chat, and sessions.
 * @param {string|import('mongoose').Types.ObjectId} instituteId
 */
export async function purgeInstitute(instituteId) {
  const institute = await Institute.findById(instituteId);
  if (!institute) {
    return { id: String(instituteId), deleted: false };
  }

  const applications = await Application.find({ instituteId: institute._id });
  for (const application of applications) {
    await purgeApplicationRecord(application, { emitRealtime: false, flushCache: false });
  }

  await Promise.all([
    ChatMessage.deleteMany({ instituteId: institute._id }),
    ChatSession.deleteMany({ instituteId: institute._id }),
    Notification.deleteMany({ instituteId: institute._id }),
  ]);

  const services = await Service.find({ instituteId: institute._id }).select('_id');
  for (const service of services) {
    try {
      await deleteAllForService(service._id, institute._id);
    } catch (err) {
      logger.warn(
        { err: err?.message, serviceId: service._id.toString(), instituteId: institute._id.toString() },
        'Could not purge knowledge documents for service during institute delete',
      );
    }
  }

  await Promise.all([
    KnowledgeDocumentVersion.deleteMany({ instituteId: institute._id }),
    KnowledgeDocument.deleteMany({ instituteId: institute._id }),
    OfferingConfigSnapshot.deleteMany({ instituteId: institute._id }),
    Offering.deleteMany({ instituteId: institute._id }),
    Service.deleteMany({ instituteId: institute._id }),
  ]);

  const users = await User.find({ instituteId: institute._id }).select('avatarUrl');
  await Promise.all(users.map((user) => deleteAvatarFile(user.avatarUrl)));
  await User.deleteMany({ instituteId: institute._id });

  await Institute.deleteOne({ _id: institute._id });

  await Promise.all([
    destroySessionsForInstitute(institute._id.toString()),
    flushInstituteReadCache(institute._id.toString()),
    flushStudentInstitutesCache(),
  ]);

  logger.info({ instituteId: institute._id.toString() }, 'Institute purged');
  return { id: institute._id.toString(), deleted: true };
}
