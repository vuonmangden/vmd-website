const apiBase = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002';

export interface CheckoutPayload {
  roomSlug: string; checkIn: string; checkOut: string; fullName: string; phone: string;
  email?: string; adults: number; children: number; specialRequest?: string; expectedArrivalTime?: string;
}
export interface CheckoutResponse { bookingCode: string; status: 'PENDING_PAYMENT'; paymentReference: string; }

export async function createRoomBooking(payload: CheckoutPayload, idempotencyKey: string): Promise<CheckoutResponse> {
  const response = await fetch(`${apiBase}/public/room-bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('ROOM_CHECKOUT_FAILED');
  return response.json() as Promise<CheckoutResponse>;
}
