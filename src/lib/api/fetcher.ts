export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = (await res.json()) as ApiResult<T>;
  if (!body.success) throw new Error(body.error ?? 'Request failed');
  return body.data;
}
