'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthClientError, hasSession, meWithRefresh } from './lib/auth-client';
import type { AuthenticatedActor } from './lib/auth-client';

type RouteState = 'loading' | 'authorized' | 'unauthorized' | 'forbidden' | 'unavailable';
const DEFAULT_ADMIN_PERMISSIONS = ['report.read'];

/** Exported only so tests can provide a fake actor to components that call useCurrentActor() without driving the full async AdminRoute session check. */
export const ActorContext = createContext<AuthenticatedActor | null>(null);

/** The staff member `/auth/me` resolved for this route. Only valid inside an authorized `AdminRoute` — every page that renders this deep is already gated on that. */
export function useCurrentActor(): AuthenticatedActor {
  const actor = useContext(ActorContext);
  if (!actor) throw new Error('useCurrentActor() called outside an authorized AdminRoute');
  return actor;
}

export function AdminRoute({ children, requiredPermissions = DEFAULT_ADMIN_PERMISSIONS }: {
  children: ReactNode;
  requiredPermissions?: string[];
}) {
  const [state, setState] = useState<RouteState>('loading');
  const [actor, setActor] = useState<AuthenticatedActor | null>(null);

  useEffect(() => {
    if (!hasSession()) {
      setState('unauthorized');
      window.location.replace('/login');
      return;
    }

    void meWithRefresh().then((resolvedActor) => {
      setActor(resolvedActor);
      setState(requiredPermissions.every((permission) => resolvedActor.permissions.includes(permission))
        ? 'authorized' : 'forbidden');
    }).catch((error: unknown) => {
      if (error instanceof AuthClientError && error.kind === 'unavailable') setState('unavailable');
      else if (error instanceof AuthClientError && error.kind === 'forbidden') setState('forbidden');
      else {
        setState('unauthorized');
        window.location.replace('/login');
      }
    });
  }, [requiredPermissions]);

  return (
    <ActorContext.Provider value={actor}>
      <AdminRouteState state={state}>{children}</AdminRouteState>
    </ActorContext.Provider>
  );
}

export function AdminRouteState({ state, children }: { state: RouteState; children: ReactNode }) {
  if (state === 'authorized') return <>{children}</>;
  if (state === 'loading') return <main aria-busy="true"><p role="status">Đang kiểm tra phiên đăng nhập…</p></main>;
  if (state === 'forbidden') return <main><h1>Không có quyền truy cập</h1><p role="alert">Tài khoản không có quyền cần thiết cho trang này.</p></main>;
  if (state === 'unavailable') return <main><h1>Dịch vụ tạm thời gián đoạn</h1><p role="alert">Không thể kiểm tra quyền lúc này. Vui lòng thử lại.</p></main>;
  return <main><h1>Phiên đăng nhập đã hết hạn</h1><p role="alert">Đang chuyển về trang đăng nhập.</p></main>;
}
