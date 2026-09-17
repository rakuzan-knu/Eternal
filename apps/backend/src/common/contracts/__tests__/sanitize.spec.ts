import { sanitizePlainText, sanitizeHtml } from '../sanitize';

describe('sanitizePlainText', () => {
  it('returns non-string values unchanged', () => {
    expect(sanitizePlainText(123)).toBe(123);
    expect(sanitizePlainText(null)).toBe(null);
    expect(sanitizePlainText(undefined)).toBe(undefined);
  });

  it('strips basic HTML tags', () => {
    expect(sanitizePlainText('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('handles nested tags that attempt bypass in single-pass regexes', () => {
    const result = sanitizePlainText('<scr<script>ipt>alert(1)</script>');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(sanitizePlainText('<<script>script>evil()</script></script>')).toBe('');
  });

  it('strips script end tags with whitespace variations like </script >', () => {
    expect(sanitizePlainText('<script>alert("xss")</script >')).toBe('');
    expect(sanitizePlainText('<script src="x">console.log(1)</script   >')).toBe('');
  });

  it('strips style tags with whitespace variations', () => {
    expect(sanitizePlainText('<style >body { color: red; }</style >')).toBe('');
  });

  it('strips nested comments', () => {
    expect(sanitizePlainText('<!-- <!-- nested --> evil -->')).toBe('evil -->');
  });

  it('prevents double unescaping of HTML entities', () => {
    // &amp;lt; should decode to &lt;, NOT double decode into <
    expect(sanitizePlainText('&amp;lt;')).toBe('&lt;');
    expect(sanitizePlainText('&lt;b&gt;bold&lt;/b&gt;')).toBe('<b>bold</b>');
    expect(sanitizePlainText('&quot;quoted&quot; &amp; &#39;apostrophe&#39;')).toBe(
      '"quoted" & \'apostrophe\'',
    );
  });

  it('trims outer whitespace', () => {
    expect(sanitizePlainText('   <span>  content  </span>  ')).toBe('content');
  });

  it('exports sanitizeHtml as alias', () => {
    expect(sanitizeHtml).toBe(sanitizePlainText);
  });
});
