// src/services/notification.service.js

const logger = require('../utils/logger');

class NotificationService {
  async sendEmail({ to, subject, html, text }) {
    try {
      // TODO: integrate with email provider (SendGrid, SES, etc.)
      return { success: true };
    } catch (err) {
      logger.error('NotificationService.sendEmail failed', err);
      throw err;
    }
  }

  async sendPush({ to, title, body, data = {} }) {
    try {
      // TODO: integrate with push provider (FCM, OneSignal, etc.)
      return { success: true };
    } catch (err) {
      logger.error('NotificationService.sendPush failed', err);
      throw err;
    }
  }
}

module.exports = new NotificationService();

