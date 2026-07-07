import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';

// scrypt 파생 키 길이(bytes). 저장 해시와 검증 양쪽에서 동일해야 한다.
const PASSWORD_KEY_LENGTH = 64;

function passwordOptions(n: number, r: number, p: number) {
  return {
    N: n,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  };
}

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
  options: ReturnType<typeof passwordOptions>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(16384, 8, 1),
  );
  return ['scrypt', '16384', '8', '1', salt, key.toString('base64url')].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== PASSWORD_KEY_LENGTH) return false;

  const actual = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(n, r, p),
  );
  return timingSafeEqual(actual, expected);
}
