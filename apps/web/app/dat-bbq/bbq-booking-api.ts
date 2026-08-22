const apiBase = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002';

export interface BbqCheckoutPayload {
  tableId: string;
  date: string;
  startTime: string;
  endTime: string;
  fullName: string;
  phone: string;
  email?: string;
  adults: number;
  children: number;
  specialRequest?: string;
}
export interface BbqCheckoutResponse { reservationCode: string; status: 'PENDING_PAYMENT'; paymentReference: string; }

export async function createBbqReservation(payload: BbqCheckoutPayload, idempotencyKey: string): Promise<BbqCheckoutResponse> {
  const response = await fetch(`${apiBase}/public/bbq-reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('BBQ_CHECKOUT_FAILED');
  return response.json() as Promise<BbqCheckoutResponse>;
}
