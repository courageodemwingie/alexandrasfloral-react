
import { describe, it, expect, vi } from 'vitest';
import {
  requestPasswordReset,
  resetAdminPassword,
} from '../src/auth.js';

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  verifyPassword,
} from '../src/security.js';

describe('Admin password recovery', () => {
  it('rejects an invalid reset token', async () => {
    const client = {
      query: vi.fn(),
    };

    const result = await resetAdminPassword(
      client,
      'invalid-token',
      'NewSecurePassword123!'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('invalid or has expired');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('rejects an expired or already-used token', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const token = generatePasswordResetToken();

    const result = await resetAdminPassword(
      client,
      token,
      'NewSecurePassword123!'
    );

    expect(result.success).toBe(false);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('successfully resets the password and revokes existing sessions', async () => {
    const adminId = 'aa51f0f2-c208-4a84-97b8-2d28b8eb79aa';
    const token = generatePasswordResetToken();

    const client = {
      query: vi.fn(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') {
          return { rows: [] };
        }

        if (sql.includes('UPDATE admin_password_resets') &&
            sql.includes('RETURNING admin_id')) {
          return { rows: [{ admin_id: adminId }] };
        }

        if (sql.includes('UPDATE admin_users')) {
          return { rows: [{ id: adminId }] };
        }

        return { rows: [] };
      }),
    };

    const result = await resetAdminPassword(
      client,
      token,
      'NewSecurePassword123!'
    );

    expect(result.success).toBe(true);
    expect(client.query).toHaveBeenCalledWith('COMMIT');

    const sessionRevocation = client.query.mock.calls.find(
      ([sql]) =>
        sql.includes('UPDATE admin_sessions') &&
        sql.includes('revoked_at = NOW()')
    );

    expect(sessionRevocation).toBeDefined();

    const tokenInvalidation = client.query.mock.calls.find(
      ([sql]) =>
        sql.includes('UPDATE admin_password_resets') &&
        !sql.includes('RETURNING admin_id')
    );

    expect(tokenInvalidation).toBeDefined();
  });

  it('does not reuse a reset token', async () => {
    const adminId = 'aa51f0f2-c208-4a84-97b8-2d28b8eb79aa';
    const token = generatePasswordResetToken();

    let tokenUsed = false;

    const client = {
      query: vi.fn(async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }

        if (sql.includes('UPDATE admin_password_resets') &&
            sql.includes('RETURNING admin_id')) {
          if (tokenUsed) {
            return { rows: [] };
          }

          tokenUsed = true;
          return { rows: [{ admin_id: adminId }] };
        }

        if (sql.includes('UPDATE admin_users')) {
          return { rows: [{ id: adminId }] };
        }

        return { rows: [] };
      }),
    };

    const firstAttempt = await resetAdminPassword(
      client,
      token,
      'NewSecurePassword123!'
    );

    const secondAttempt = await resetAdminPassword(
      client,
      token,
      'AnotherSecurePassword123!'
    );

    expect(firstAttempt.success).toBe(true);
    expect(secondAttempt.success).toBe(false);
  });
});


describe('Admin password reset requests', () => {
  it('does not reveal whether an email address has an admin account', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    const result = await requestPasswordReset(
      client,
      'unknown@example.com'
    );

    expect(result).toEqual({
      success: true,
      resetToken: null,
      email: null,
    });

    expect(client.query).toHaveBeenCalledTimes(1);
  });

  it('normalizes the email address before searching', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    };

    await requestPasswordReset(
      client,
      '  ALEXANDRASFLORAL@GMAIL.COM  '
    );

    expect(client.query.mock.calls[0][1]).toEqual([
      'alexandrasfloral@gmail.com',
    ]);
  });

  it('generates a reset token and stores its hash for an active admin', async () => {
    const admin = {
      id: 'aa51f0f2-c208-4a84-97b8-2d28b8eb79aa',
      email: 'alexandrasfloral@gmail.com',
    };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [admin] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    const result = await requestPasswordReset(
      client,
      'ALEXANDRASFLORAL@GMAIL.COM'
    );

    expect(result.success).toBe(true);
    expect(result.email).toBe(admin.email);
    expect(result.resetToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // The previous outstanding reset links should be invalidated.
    expect(client.query.mock.calls[1][0]).toContain(
      'UPDATE admin_password_resets'
    );

    // The new reset token should be stored as a hash, not plaintext.
    const insertCall = client.query.mock.calls[2];

    expect(insertCall[0]).toContain(
      'INSERT INTO admin_password_resets'
    );

    expect(insertCall[1][0]).toBe(admin.id);
    expect(insertCall[1][1]).not.toBe(result.resetToken);
    expect(insertCall[1][2]).toBeInstanceOf(Date);

    // The reset link should expire approximately 30 minutes later.
    const expiry = insertCall[1][2].getTime();
    const remainingTime = expiry - Date.now();

    expect(remainingTime).toBeGreaterThan(29 * 60 * 1000);
    expect(remainingTime).toBeLessThanOrEqual(30 * 60 * 1000);
  });
});

