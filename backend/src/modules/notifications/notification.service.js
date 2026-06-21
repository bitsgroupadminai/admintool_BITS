import crypto from 'crypto';
import mongoose from 'mongoose';
import { Notification, NOTIFICATION_TYPES } from './notification.model.js';
import { User } from '../users/user.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';
import { emitToUser } from '../../core/config/websocket.js';
import { WS_EVENTS } from '../../core/config/websocket.events.js';

function formatNotification(notification) {
  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    read: notification.read,
    metadata: notification.metadata ?? {},
    createdAt: notification.createdAt,
  };
}

/**
 * @param {{
 *   instituteId: string,
 *   userId: string,
 *   type: string,
 *   title: string,
 *   body?: string,
 *   link?: string,
 *   metadata?: Object,
 * }} payload
 */
export async function createNotification(payload) {
  const notification = await Notification.create({
    instituteId: payload.instituteId,
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? '',
    link: payload.link ?? '',
    metadata: payload.metadata ?? {},
  });

  const formatted = formatNotification(notification);
  emitToUser(payload.userId, WS_EVENTS.NOTIFICATION_NEW, formatted);
  return formatted;
}

async function emitReadSync(instituteId, userId) {
  const unreadCount = await Notification.countDocuments({ instituteId, userId, read: false });
  emitToUser(userId, WS_EVENTS.NOTIFICATION_READ, { unreadCount });
}

/**
 * @param {string} instituteId
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} [options]
 */
export async function listUserNotifications(instituteId, userId, options = {}) {
  const filter = { instituteId, userId };
  if (options.unreadOnly) {
    filter.read = false;
  }

  const limit = options.limit ?? 20;
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ instituteId, userId, read: false }),
  ]);

  return {
    notifications: items.map(formatNotification),
    unreadCount,
  };
}

/**
 * @param {string} instituteId
 * @param {string} userId
 */
export async function markAllNotificationsRead(instituteId, userId) {
  await Notification.updateMany({ instituteId, userId, read: false }, { read: true });
  await emitReadSync(instituteId, userId);
  return { success: true };
}

/**
 * @param {string} instituteId
 * @param {string} userId
 * @param {string} notificationId
 */
export async function markNotificationRead(instituteId, userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, instituteId, userId },
    { read: true },
    { new: true },
  );

  if (!notification) {
    return null;
  }

  await emitReadSync(instituteId, userId);
  return formatNotification(notification);
}

const AUDIENCE_ROLE = {
  staff: ROLES.STAFF,
  student: ROLES.STUDENT,
};

/**
 * @param {string} instituteId
 * @param {{ userId: string, name?: string }} adminUser
 * @param {import('./notification.validator.js').broadcastNotificationSchema['_output']} payload
 */
export async function broadcastNotification(instituteId, adminUser, payload) {
  const { audience, targetUserId, title, body, link, category } = payload;
  let recipientIds = [];

  if (audience === 'all_staff') {
    const users = await User.find({ instituteId, role: ROLES.STAFF, isActive: true }).select('_id');
    recipientIds = users.map((user) => user._id.toString());
  } else if (audience === 'all_students') {
    const users = await User.find({ instituteId, role: ROLES.STUDENT, isActive: true }).select('_id');
    recipientIds = users.map((user) => user._id.toString());
  } else {
    const expectedRole = AUDIENCE_ROLE[audience];
    const user = await User.findOne({
      _id: targetUserId,
      instituteId,
      role: expectedRole,
      isActive: true,
    }).select('_id name');

    if (!user) {
      throw new AppError(`Selected ${audience} was not found or is inactive`, 404);
    }

    recipientIds = [user._id.toString()];
  }

  if (!recipientIds.length) {
    throw new AppError('No active recipients found for this audience', 400);
  }

  const broadcastId = crypto.randomUUID();
  const metadata = {
    broadcastId,
    audience,
    category,
    sentBy: adminUser.userId,
    sentByName: adminUser.name ?? 'Admin',
  };

  const docs = recipientIds.map((userId) => ({
    instituteId,
    userId,
    type: NOTIFICATION_TYPES.ANNOUNCEMENT,
    title,
    body,
    link: link ?? '',
    metadata,
  }));

  const created = await Notification.insertMany(docs, { ordered: false });

  for (const notification of created) {
    emitToUser(notification.userId.toString(), WS_EVENTS.NOTIFICATION_NEW, formatNotification(notification));
  }

  return {
    broadcastId,
    audience,
    category,
    title,
    body,
    recipientCount: created.length,
    createdAt: created[0]?.createdAt ?? new Date(),
  };
}

/**
 * Recent institute-wide announcements sent by admins.
 * @param {string} instituteId
 * @param {{ limit?: number }} [options]
 */
export async function listRecentBroadcasts(instituteId, options = {}) {
  const limit = Math.min(20, Math.max(1, options.limit ?? 10));

  const broadcasts = await Notification.aggregate([
    {
      $match: {
        instituteId: new mongoose.Types.ObjectId(instituteId),
        type: NOTIFICATION_TYPES.ANNOUNCEMENT,
        'metadata.broadcastId': { $exists: true, $ne: null },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$metadata.broadcastId',
        title: { $first: '$title' },
        body: { $first: '$body' },
        audience: { $first: '$metadata.audience' },
        category: { $first: '$metadata.category' },
        sentByName: { $first: '$metadata.sentByName' },
        recipientCount: { $sum: 1 },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
  ]);

  return broadcasts.map((item) => ({
    broadcastId: item._id,
    title: item.title,
    body: item.body,
    audience: item.audience,
    category: item.category,
    sentByName: item.sentByName,
    recipientCount: item.recipientCount,
    createdAt: item.createdAt,
  }));
}
