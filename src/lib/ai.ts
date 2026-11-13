import type {
  AiStatus,
  CoverCorners,
  FitResponse,
  IdentifyResponse,
  RecommendRequest,
  RecommendResponse,
  SeriesResponse,
} from '../shared';
import { syncNow } from './sync';

async function post<T>(url: string, body: unknown): Promise<T> {
  if (!navigator.onLine) throw new Error("You're offline. Tips and cover reading need internet.");
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong');
  return json;
}

export async function identifyCover(dataUrl: string) {
  const [meta, image] = dataUrl.split(',');
  const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  return post<IdentifyResponse>('/api/ai/identify', { image, mediaType });
}

/** Where the book is in a photo (for cutting out her own cover) */
export async function findCorners(dataUrl: string, width: number, height: number) {
  const [meta, image] = dataUrl.split(',');
  const mediaType = meta.match(/data:(.*?);/)?.[1] ?? 'image/jpeg';
  return post<CoverCorners>('/api/ai/corners', {
    image,
    mediaType,
    width,
    height,
  });
}

/** Tips use the library on the server, so make sure her latest changes are there first */
export async function recommend(req: RecommendRequest) {
  await syncNow();
  return post<RecommendResponse>('/api/ai/recommend', req);
}

export async function fitCheck(book: { title: string; author: string; description?: string; genres?: string[] }) {
  await syncNow();
  return post<FitResponse>('/api/ai/fit', book);
}

export function seriesInfo(name: string, author: string) {
  return post<SeriesResponse>('/api/ai/series', { name, author });
}

export async function aiStatus(): Promise<AiStatus | null> {
  try {
    return (await (await fetch('/api/ai/status')).json()) as AiStatus;
  } catch {
    return null;
  }
}
