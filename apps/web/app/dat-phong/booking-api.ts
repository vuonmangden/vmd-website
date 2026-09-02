const apiBase = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://localhost:3002'}/api/v1`;

export interface CheckoutPayload {
  roomSlug: string; checkIn: string; checkOut: string; fullName: string; phone: string;
  email?: string; adults: number; children: number; extraMattressQuantity: number;
  bookingPolicyAccepted: boolean; privacyPolicyAccepted: boolean;
  specialRequest?: string; expectedArrivalTime?: string;
}
export interface CheckoutResponse { bookingCode: string; status: 'PENDING_PAYMENT'; paymentReference: string; totalAmount: string; depositRequiredAmount: string; depositPolicy: 'STANDARD_50' | 'LAST_MINUTE_100' | 'HOLIDAY_100'; holdExpiresAt: string; currency: 'VND'; }

export async function createRoomBooking(payload: CheckoutPayload, idempotencyKey: string): Promise<CheckoutResponse> {
  const response = await fetch(`${apiBase}/public/room-bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('ROOM_CHECKOUT_FAILED');
  // The API wraps every response in { data, meta, correlationId } (ResponseTransformInterceptor).
  const envelope = (await response.json()) as { data: CheckoutResponse };
  return envelope.data;
}
