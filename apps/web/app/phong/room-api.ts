export interface PublicRoom {
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  capacity: { standardAdults: number; maxAdults: number; maxChildren: number; maxTotalGuests: number };
  bedConfiguration: unknown;
  amenities: unknown;
  isSandbox: true;
}

export interface PublicQuote {
  currency: 'VND';
  nights: number;
  nightlySubtotal: number;
  extraGuestSubtotal: number;
  total: number;
  isSandbox: true;
}

const apiBase = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002';

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error('PUBLIC_ROOMS_API_FAILED');
  return response.json() as Promise<T>;
}

export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
