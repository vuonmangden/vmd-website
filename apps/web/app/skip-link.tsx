'use client';

import type { MouseEvent } from 'react';

export function SkipLink() {
  function moveFocusToMain(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById('noi-dung')?.focus();
  }

  return (
    <a className="skip-link" href="#noi-dung" onClick={moveFocusToMain}>
      Chuyển đến nội dung chính
    </a>
  );
}
