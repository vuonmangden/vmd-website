import { AdminRoute } from '../../admin-route';
import { AdminShell } from '../../shell/admin-shell';
import { BookingDetailView } from '../booking-detail-view';

type Props = Readonly<{ params: Promise<{ id: string }> }>;

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminRoute requiredPermissions={['booking.read']}>
      <AdminShell>
        <h1>Chi tiết booking</h1>
        <BookingDetailView id={id} />
      </AdminShell>
    </AdminRoute>
  );
}
