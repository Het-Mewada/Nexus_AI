import { settingsRepository } from "../repositories/settings.repository";

export class SettingsService {
  async get(userId: string) {
    let settings = await settingsRepository.findByUserId(userId);
    if (!settings) {
      settings = await settingsRepository.upsert(userId, {});
    }
    return settings;
  }

  async update(userId: string, data: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weeklyReport?: boolean;
    monthlyReport?: boolean;
  }) {
    return settingsRepository.upsert(userId, data);
  }
}

export const settingsService = new SettingsService();
