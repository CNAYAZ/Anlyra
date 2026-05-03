import type { SyncProvider, SyncResult } from "@/lib/sync/types";

export function makeStubProvider(id: string): SyncProvider {
  return {
    id,
    async sync(): Promise<SyncResult> {
      throw new Error(`Provider "${id}" sync not yet implemented`);
    },
  };
}
