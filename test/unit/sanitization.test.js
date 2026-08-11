/**
 * Unit Tests: HTML Sanitization & Escaping
 * Verifies that dangerous content is neutralized before display
 */

const { sanitizeHtml, escapeText } = require('../helpers/functions');

describe('sanitizeHtml', () => {
  test('removes script tags and their content', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert("xss")');
  });

  test('removes inline event handlers (onerror)', () => {
    const input = '<img src=x onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  test('removes onclick handler', () => {
    const input = '<div onclick="stealData()">Click me</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
  });

  test('removes onmouseover handler', () => {
    const input = '<span onmouseover="run()">hover</span>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onmouseover');
  });

  test('removes javascript: protocol references', () => {
    const input = 'Click <a href="javascript:alert(1)">here</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  test('escapes angle brackets', () => {
    const input = '2 < 5 and 10 > 3';
    const result = sanitizeHtml(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  test('preserves normal text content unchanged', () => {
    const input = 'Makan siang di Cafe Baru';
    const result = sanitizeHtml(input);
    expect(result).toContain('Makan siang di Cafe Baru');
  });

  test('handles empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  test('handles null/undefined', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  test('removes nested script tags', () => {
    const input = '<scr<script>ipt>alert(1)</scr</script>ipt>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('alert(1)');
  });
});

describe('escapeText', () => {
  test('escapes ampersand', () => {
    expect(escapeText('Fish & Chips')).toContain('&amp;');
  });

  test('escapes double quotes', () => {
    expect(escapeText('Say "hello"')).toContain('&quot;');
  });

  test('escapes angle brackets', () => {
    const result = escapeText('<test>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  test('handles empty string', () => {
    expect(escapeText('')).toBe('');
  });

  test('handles null', () => {
    expect(escapeText(null)).toBe('');
  });

  test('preserves normal text', () => {
    expect(escapeText('Hello World 123')).toBe('Hello World 123');
  });
});
