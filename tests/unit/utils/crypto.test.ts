import { describe, it, expect } from 'vitest';
import { generateTokenHash, generateRandomToken } from '../../../src/lib/server/crypto.js';

describe('crypto Unit Tests', () => {
  describe('generateTokenHash', () => {
    it('returns a SHA-256 hash as hex string', () => {
      const token = 'test-token-123';
      const hash = generateTokenHash(token);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });

    it('produces consistent hashes for same input', () => {
      const token = 'consistent-test';
      const hash1 = generateTokenHash(token);
      const hash2 = generateTokenHash(token);
      
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different inputs', () => {
      const hash1 = generateTokenHash('token1');
      const hash2 = generateTokenHash('token2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateRandomToken', () => {
    it('returns a hex string', () => {
      const token = generateRandomToken();
      
      expect(typeof token).toBe('string');
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('returns a 64-character string (32 bytes = 64 hex chars)', () => {
      const token = generateRandomToken();
      
      expect(token.length).toBe(64);
    });

    it('produces unique tokens on each call', () => {
      const token1 = generateRandomToken();
      const token2 = generateRandomToken();
      
      expect(token1).not.toBe(token2);
    });
  });
});
