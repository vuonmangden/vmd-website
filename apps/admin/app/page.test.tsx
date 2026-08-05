import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';

describe('admin shell', () => {
  it('renders its non-production authentication and authorization warning', () => {
    const markup = renderToStaticMarkup(<Page />);

    expect(markup).toContain('Non-production shell');
    expect(markup).toContain('Authentication');
    expect(markup).toContain('server-side authorization');
  });
});
