import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { getDb } from '../../../src/lib/server/db/index.js';
import { authService } from '../../../src/lib/server/services/auth.service.js';

describe('auth.service Unit Tests', () => {
  beforeEach(() => {
    const db = getDb();
    db.run('DELETE FROM audit_log');
    db.run('DELETE FROM refresh_tokens');
    db.run('DELETE FROM users');
  });

  afterEach(() => {
    const db = getDb();
    db.run('DELETE FROM audit_log');
    db.run('DELETE FROM refresh_tokens');
    db.run('DELETE FROM users');
  });

  describe('register', () => {
    it('successfully registers a new user', async () => {
      const user = await authService.register({
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        email: 'test@example.com',
        identity_number: 'TST00001'
      });

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.role).toBe('customer');
    });

    it('hashes the password', async () => {
      await authService.register({
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        email: 'test@example.com',
        identity_number: 'TST00001'
      });

      const db = getDb();
      const dbUser = db.get<{ password: string }>('SELECT password FROM users WHERE username = ?', ['testuser']);
      
      expect(dbUser).toBeDefined();
      const isPasswordValid = await bcrypt.compare('Test123!', dbUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('creates an audit log entry', async () => {
      await authService.register({
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        email: 'test@example.com',
        identity_number: 'TST00001',
        ipAddress: '127.0.0.1'
      });

      const db = getDb();
      const log = db.get<{ action: string }>('SELECT * FROM audit_log WHERE action = ?', ['REGISTER']);
      
      expect(log).toBeDefined();
      expect(log?.action).toBe('REGISTER');
    });
  });

  describe('validateRefreshToken', () => {
    it('returns valid true for valid token', async () => {
      // Register a user and save a refresh token
      const user = await authService.register({
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        email: 'test@example.com',
        identity_number: 'TST00001'
      });

      const token = 'test-refresh-token';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      authService.saveRefreshToken(user.id, token, expiresAt);
      
      const result = authService.validateRefreshToken(token);
      expect(result.valid).toBe(true);
    });

    it('returns valid false for invalid token', () => {
      const result = authService.validateRefreshToken('invalid-token');
      expect(result.valid).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('returns the correct role for a user', async () => {
      const user = await authService.register({
        username: 'testuser',
        password: 'Test123!',
        name: 'Test User',
        email: 'test@example.com',
        identity_number: 'TST00001'
      });

      const role = authService.getUserRole(user.id);
      expect(role).toBe('customer');
    });

    it('returns null for non-existent user', () => {
      const role = authService.getUserRole(999);
      expect(role).toBeNull();
    });
  });
});
