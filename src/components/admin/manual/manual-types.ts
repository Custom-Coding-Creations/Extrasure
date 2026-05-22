export type PlatformSection = {
  id: string;
  category: string;
  title: string;
  purpose: string;
  plainEnglish: string;
  whyItExists: string;
  links: Array<{ label: string; href: string }>;
  setupChecklist: string[];
  dailyChecks: string[];
  troubleshooting: string[];
};

export type ManualSecretClientItem = {
  id: string;
  title: string;
  platform: string;
  category: string;
  portalUrl: string | null;
  username: string | null;
  notes: string | null;
  isActive: boolean;
  lastRotatedAt: string | null;
  updatedAt: string;
};

export type ManualSecretsByCategoryClient = Record<string, ManualSecretClientItem[]>;
