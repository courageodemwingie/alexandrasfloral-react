
import {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  hashSessionToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from './security.js';

const SESSION_DURATION_HOURS = 8;
const SESSION_TOKEN_LENGTH = 43;
const PASSWORD_RESET_DURATION_MINUTES = 30;

function getCookieName(request) {
  const url = new URL(request.url);

  return url.hostname === '127.0.0.1' ||
    url.hostname === 'localhost'
    ? 'af_admin_session'
    : '__Host-af_admin_session';
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split('=');

    if (key === name) {
      return valueParts.join('=');
    }
  }

  return null;
}

function isValidSessionToken(token) {
  return (
    typeof token === 'string' &&
    token.length === SESSION_TOKEN_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

function createSessionCookie(token, cookieName, isLocal) {
  const attributes = [
    `${cookieName}=${token}`,
    'HttpOnly',
    isLocal ? 'SameSite=Lax' : 'SameSite=None',
    'Path=/',
    `Max-Age=${SESSION_DURATION_HOURS * 60 * 60}`,
  ];

  if (!isLocal) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

function clearSessionCookie(cookieName, isLocal) {
  const attributes = [
    `${cookieName}=`,
    'HttpOnly',
    isLocal ? 'SameSite=Lax' : 'SameSite=None',
    'Path=/',
    'Max-Age=0',
  ];

  if (!isLocal) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

export async function loginAdmin(client, email, password, request) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await client.query(
    `SELECT id, email, password_hash, is_active
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  const admin = result.rows[0];

  if (!admin || !admin.is_active) {
    return {
      success: false,
      message: 'Invalid email or password.',
    };
  }

  const passwordIsValid = await verifyPassword(
    password,
    admin.password_hash
  );

  if (!passwordIsValid) {
    return {
      success: false,
      message: 'Invalid email or password.',
    };
  }

  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  );

  await client.query(
    `INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [admin.id, tokenHash, expiresAt]
  );

  await client.query(
    `UPDATE admin_users
     SET last_login_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [admin.id]
  );

  const isLocal =
    new URL(request.url).hostname === '127.0.0.1' ||
    new URL(request.url).hostname === 'localhost';

  const cookieName = getCookieName(request);

  return {
    success: true,
    admin: {
      id: admin.id,
      email: admin.email,
    },
    cookie: createSessionCookie(token, cookieName, isLocal),
  };
}

export async function getAuthenticatedAdmin(client, request) {
  const cookieName = getCookieName(request);
  const token = getCookie(request, cookieName);

  if (!isValidSessionToken(token)) {
    return null;
  }

  const tokenHash = await hashSessionToken(token);

  const result = await client.query(
    `SELECT a.id, a.email, s.id AS session_id
     FROM admin_sessions s
     JOIN admin_users a ON a.id = s.admin_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
       AND a.is_active = TRUE
     LIMIT 1`,
    [tokenHash]
  );

  const admin = result.rows[0];

  if (!admin) {
    return null;
  }

  await client.query(
    `UPDATE admin_sessions
     SET last_seen_at = NOW()
     WHERE id = $1
       AND (
         last_seen_at IS NULL
         OR last_seen_at < NOW() - INTERVAL '5 minutes'
       )`,
    [admin.session_id]
  );

  return {
    id: admin.id,
    email: admin.email,
  };
}

export async function logoutAdmin(client, request) {
  const cookieName = getCookieName(request);
  const token = getCookie(request, cookieName);

  if (isValidSessionToken(token)) {
    const tokenHash = await hashSessionToken(token);

    await client.query(
      `UPDATE admin_sessions
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL`,
      [tokenHash]
    );
  }

  const isLocal =
    new URL(request.url).hostname === '127.0.0.1' ||
    new URL(request.url).hostname === 'localhost';

  return {
    success: true,
    cookie: clearSessionCookie(cookieName, isLocal),
  };
}

// Create a password-reset request.
// The original token is returned only to the API handler for email delivery.
// Only its SHA-256 hash is stored in Neon.
export async function requestPasswordReset(client, email) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await client.query(
    `SELECT id, email
     FROM admin_users
     WHERE email = $1
       AND is_active = TRUE
     LIMIT 1`,
    [normalizedEmail]
  );

  const admin = result.rows[0];

  if (!admin) {
    return {
      success: true,
      resetToken: null,
      email: null,
    };
  }

  const resetToken = generatePasswordResetToken();
  const tokenHash = await hashPasswordResetToken(resetToken);

  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_DURATION_MINUTES * 60 * 1000
  );

  await client.query(
    `UPDATE admin_password_resets
     SET used_at = NOW()
     WHERE admin_id = $1
       AND used_at IS NULL`,
    [admin.id]
  );

  await client.query(
    `INSERT INTO admin_password_resets
       (admin_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [admin.id, tokenHash, expiresAt]
  );

  return {
    success: true,
    resetToken,
    email: admin.email,
  };
}

// Validate a reset token and update the administrator's password.
// A reset token can only be used once.

export async function resetAdminPassword(
  client,
  token,
  newPassword
) {
  if (
    typeof token !== 'string' ||
    token.length !== SESSION_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return {
      success: false,
      message: 'This password reset link is invalid or has expired.',
    };
  }

  const tokenHash = await hashPasswordResetToken(token);

  try {
    await client.query('BEGIN');

    // Atomically claim the token. Expired and previously used
    // tokens cannot be claimed.
    const result = await client.query(
      `UPDATE admin_password_resets
       SET used_at = NOW()
       WHERE token_hash = $1
         AND used_at IS NULL
         AND expires_at > NOW()
       RETURNING admin_id`,
      [tokenHash]
    );

    const reset = result.rows[0];

    if (!reset) {
      await client.query('ROLLBACK');

      return {
        success: false,
        message: 'This password reset link is invalid or has expired.',
      };
    }

    // Hash the new password only after successfully claiming the token.
    const newPasswordHash = await hashPassword(newPassword);

    const adminResult = await client.query(
      `UPDATE admin_users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2
         AND is_active = TRUE
       RETURNING id`,
      [newPasswordHash, reset.admin_id]
    );

    if (adminResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return {
        success: false,
        message: 'This password reset link is invalid or has expired.',
      };
    }

    // Revoke every existing session for this administrator.
    await client.query(
      `UPDATE admin_sessions
       SET revoked_at = NOW()
       WHERE admin_id = $1
         AND revoked_at IS NULL`,
      [reset.admin_id]
    );

    // Invalidate any other outstanding reset links.
    await client.query(
      `UPDATE admin_password_resets
       SET used_at = NOW()
       WHERE admin_id = $1
         AND used_at IS NULL`,
      [reset.admin_id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Your password has been reset successfully.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
