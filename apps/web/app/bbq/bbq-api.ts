export interface PublicBbqTable {
  id: string;
  code: string;
  name: string;
  maxCapacity: number;
}

export interface PublicBbqArea {
  id: string;
  code: string;
  name: string;
  availableTables: PublicBbqTable[];
}

export interface PublicBbqAvailability {
  date: string;
  startTime: string;
  endTime: string;
  guests: number;
  areas: PublicBbqArea[];
}

const apiBase = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002';

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  if (!response.ok) throw new Error('PUBLIC_BBQ_API_FAILED');
  return response.json() as Promise<T>;
}
