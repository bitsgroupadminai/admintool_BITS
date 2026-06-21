import * as notificationService from './notification.service.js';

import { broadcastNotificationSchema } from './notification.validator.js';

import { sendSuccess } from '../../core/utils/apiResponse.js';



export async function list(req, res, next) {

  try {

    const unreadOnly = req.query.unreadOnly === '1';

    const limit = req.query.limit ? Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10))) : 20;

    const result = await notificationService.listUserNotifications(

      req.user.instituteId,

      req.user.userId,

      { unreadOnly, limit: Number.isNaN(limit) ? 20 : limit },

    );

    sendSuccess(res, 200, 'Notifications', result);

  } catch (err) {

    next(err);

  }

}



export async function markAllRead(req, res, next) {

  try {

    const result = await notificationService.markAllNotificationsRead(

      req.user.instituteId,

      req.user.userId,

    );

    sendSuccess(res, 200, 'All notifications marked read', result);

  } catch (err) {

    next(err);

  }

}



export async function markRead(req, res, next) {

  try {

    const notification = await notificationService.markNotificationRead(

      req.user.instituteId,

      req.user.userId,

      req.params.id,

    );

    sendSuccess(res, 200, 'Notification updated', { notification });

  } catch (err) {

    next(err);

  }

}



export async function broadcast(req, res, next) {

  try {

    const payload = broadcastNotificationSchema.parse(req.body);

    const result = await notificationService.broadcastNotification(

      req.user.instituteId,

      req.user,

      payload,

    );

    sendSuccess(res, 201, 'Announcement sent', { broadcast: result });

  } catch (err) {

    next(err);

  }

}



export async function listBroadcasts(req, res, next) {

  try {

    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 10;

    const broadcasts = await notificationService.listRecentBroadcasts(req.user.instituteId, {

      limit: Number.isNaN(limit) ? 10 : limit,

    });

    sendSuccess(res, 200, 'Recent announcements', { broadcasts });

  } catch (err) {

    next(err);

  }

}


