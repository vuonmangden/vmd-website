import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Page from './page';

describe('public web shell', () => {
  it('renders the expected technical label', () => {
    expect(renderToStaticMarkup(<Page />)).toContain('VMD Public Web');
  });
});
