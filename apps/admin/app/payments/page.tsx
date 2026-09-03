import { AdminRoute } from '../admin-route';
import { AdminShell } from '../shell/admin-shell';
import { PaymentsListView } from './payments-list-view';
import { ReconciliationSection } from './reconciliation-view';

/**
 * Two permissions, two sections: `payment.read` gates the page, and the
 * reconciliation half additionally needs `payment.reconcile` — matching the
 * API, where the reconciliation controller requires that stronger permission.
 * Showing it to a `payment.read`-only actor would just produce 403s.
 */
export default function PaymentsPage() {
  return (
    <AdminRoute requiredPermissions={['payment.read']}>
      <AdminShell>
        <h1>Thanh toán</h1>
        <PaymentsListView />
        <ReconciliationSection />
      </AdminShell>
    </AdminRoute>
  );
}
