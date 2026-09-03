import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CategoryRow } from './category-row';
import type { ArticleCategory } from './articles-api';

const CATEGORY: ArticleCategory = { id: 'c1', name: 'Kinh nghiệm', slug: 'kinh-nghiem', description: null, sortOrder: 3, status: 'ACTIVE' };

describe('CategoryRow', () => {
  it('renders the slug read-only alongside editable name, sort order, and status pre-filled from the category', () => {
    const markup = renderToStaticMarkup(<CategoryRow category={CATEGORY} onSave={vi.fn()} />);
    expect(markup).toContain('kinh-nghiem');
    expect(markup).toContain('value="Kinh nghiệm"');
    expect(markup).toContain('value="3"');
    expect(markup).toMatch(/<option value="ACTIVE" selected="">/);
  });

  it('pre-selects INACTIVE for an inactive category', () => {
    const markup = renderToStaticMarkup(<CategoryRow category={{ ...CATEGORY, status: 'INACTIVE' }} onSave={vi.fn()} />);
    expect(markup).toMatch(/<option value="INACTIVE" selected="">/);
  });
});
