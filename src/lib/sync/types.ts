import type { Integration } from "@prisma/client";

export interface SyncResult {
  recordsCount: number;
  details?: Record<string, unknown>;
}

export interface SyncProvider {
  id: string;
  sync(integration: Integration): Promise<SyncResult>;
}
