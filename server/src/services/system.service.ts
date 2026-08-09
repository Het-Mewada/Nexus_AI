import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define default features for new instantiations or fallback
export const DEFAULT_FEATURES: Record<string, string> = {};

class SystemService {
  private cachedSettings: Record<string, string> = {};
  private lastFetch: number = 0;
  private readonly SETTINGS_ID = "system-settings";
  private readonly CACHE_TTL_MS = 60000; // 1 minute fallback cache

  async getSettings(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && (now - this.lastFetch < this.CACHE_TTL_MS) && Object.keys(this.cachedSettings).length > 0) {
      return this.cachedSettings;
    }

    let settings = await prisma.systemSetting.findUnique({
      where: { id: this.SETTINGS_ID },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: this.SETTINGS_ID,
          features: DEFAULT_FEATURES,
        },
      });
    }

    this.cachedSettings = settings.features as Record<string, string>;
    this.lastFetch = now;
    return this.cachedSettings;
  }

  async updateSettings(features: Record<string, string>) {
    const settings = await prisma.systemSetting.upsert({
      where: { id: this.SETTINGS_ID },
      update: { features },
      create: {
        id: this.SETTINGS_ID,
        features,
      },
    });

    this.cachedSettings = settings.features as Record<string, string>;
    this.lastFetch = Date.now();
    return this.cachedSettings;
  }
}

export const systemService = new SystemService();
