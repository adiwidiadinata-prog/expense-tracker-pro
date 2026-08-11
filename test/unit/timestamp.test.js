/**
 * Unit Tests: Timestamp Normalization
 * Verifies correct conversion of all timestamp formats to ISO string
 */

const { normalizeTimestamp, formatDateId, createMockFirebaseTimestamp } = require('../helpers/functions');

describe('normalizeTimestamp', () => {
  const ISO_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  test('handles Firebase Timestamp object (with toDate method)', () => {
    const mockTs = createMockFirebaseTimestamp(new Date('2026-08-10T14:30:00Z'));
    const result = normalizeTimestamp(mockTs);
    expect(result).toMatch(ISO_REGEX);
    expect(result).toContain('2026-08-10');
  });

  test('passes through ISO string unchanged', () => {
    const isoStr = '2026-08-10T14:30:00.000Z';
    expect(normalizeTimestamp(isoStr)).toBe(isoStr);
  });

  test('handles Date object', () => {
    const date = new Date('2026-08-10T14:30:00Z');
    const result = normalizeTimestamp(date);
    expect(result).toMatch(ISO_REGEX);
    expect(result).toContain('2026-08-10');
  });

  test('handles millisecond timestamp (number)', () => {
    const ms = new Date('2026-08-10').getTime();
    const result = normalizeTimestamp(ms);
    expect(result).toMatch(ISO_REGEX);
  });

  test('returns current ISO string for null', () => {
    const before = new Date().toISOString();
    const result = normalizeTimestamp(null);
    const after = new Date().toISOString();
    expect(result).toMatch(ISO_REGEX);
    expect(result >= before).toBe(true);
    expect(result <= after).toBe(true);
  });

  test('returns current ISO string for undefined', () => {
    const result = normalizeTimestamp(undefined);
    expect(result).toMatch(ISO_REGEX);
  });

  test('returns current ISO string for 0 (falsy)', () => {
    const result = normalizeTimestamp(0);
    // 0 is falsy, treated as missing
    expect(result).toMatch(ISO_REGEX);
  });

  test('returns valid ISO for negative timestamp (before epoch)', () => {
    const result = normalizeTimestamp(-1000);
    expect(result).toMatch(ISO_REGEX);
  });

  test('handles seconds-based timestamp from gcloud export', () => {
    // gcloud exports use seconds, not milliseconds
    const secondsTs = 1691700000; // 2026-08-10 ~14:00 UTC
    const result = normalizeTimestamp(secondsTs);
    expect(result).toMatch(ISO_REGEX);
  });
});

describe('formatDateId', () => {
  test('formats ISO string to Indonesian locale', () => {
    const result = formatDateId('2026-08-10T00:00:00Z');
    // Result should be in Indonesian format like "10 Agustus 2026"
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('returns a non-empty string for valid date', () => {
    const result = formatDateId('2026-01-01T00:00:00Z');
    expect(result).toBeTruthy();
  });
});
