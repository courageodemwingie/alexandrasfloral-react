
const PASSWORD_ITERATIONS = 600000;

function toBase64Url(bytes) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

return btoa(binary)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const base64 = value
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(
    base64 + '='.repeat((4 - base64.length % 4) % 4)
  );

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hash = new Uint8Array(derivedBits);

  return [
    'pbkdf2-sha256',
    PASSWORD_ITERATIONS,
    toBase64Url(salt),
    toBase64Url(hash),
  ].join('$');
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, iterationsText, saltText, hashText] =
      storedHash.split('$');

    if (
      algorithm !== 'pbkdf2-sha256' ||
      !/^\d+$/.test(iterationsText)
    ) {
      return false;
    }

    const iterations = Number(iterationsText);

    if (iterations !== PASSWORD_ITERATIONS) {
      return false;
    }

    const salt = fromBase64Url(saltText);
    const expectedHash = fromBase64Url(hashText);

    if (salt.length !== 16 || expectedHash.length !== 32) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      key,
      256
    );

    const actualHash = new Uint8Array(derivedBits);

    let difference = 0;

    for (let i = 0; i < expectedHash.length; i++) {
      difference |= expectedHash[i] ^ actualHash[i];
    }

    return difference === 0;
  } catch {
    return false;
  }
}

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return toBase64Url(bytes);
}

export async function hashSessionToken(token) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  );

  return toBase64Url(new Uint8Array(digest));
}
