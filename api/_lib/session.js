/**
 * 관리자 세션 쿠키 — auth 엔트리와 writePages OCR 가드가 같이 쓴다.
 */
import crypto from 'crypto';

export const COOKIE_NAME = 'mor_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

export function isLocalDevAuth() {
  const vercelEnv = trimOrEmpty(process.env.VERCEL_ENV).toLowerCase();
  if (vercelEnv === 'production' || vercelEnv === 'preview') return false;
  if (process.env.VERCEL === '1' && vercelEnv !== 'development') return false;
  if (vercelEnv === 'development') return true;
  return process.env.NODE_ENV !== 'production';
}

export function getAdminPassword() {
  return trimOrEmpty(process.env.ADMIN_PASSWORD || process.env.AUTH_PASSWORD);
}

export function getAuthSecret() {
  return (
    trimOrEmpty(process.env.AUTH_SECRET) ||
    getAdminPassword() ||
    (isLocalDevAuth() ? 'mor-local-dev-auth' : '')
  );
}

export function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken(secret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = String(exp);
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function verifySessionToken(token, secret) {
  const raw = trimOrEmpty(token);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!/^\d+$/.test(payload) || !/^[a-f0-9]{64}$/i.test(sig)) return null;
  const expected = signPayload(payload, secret);
  if (!timingSafeEqualString(sig.toLowerCase(), expected.toLowerCase())) return null;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return { exp };
}

function parseCookies(req) {
  const header = req.headers?.cookie || req.headers?.Cookie || '';
  const out = {};
  String(header)
    .split(';')
    .forEach((part) => {
      const idx = part.indexOf('=');
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key) out[key] = decodeURIComponent(value);
    });
  return out;
}

export function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SEC}`
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function getSessionFromRequest(req) {
  const secret = getAuthSecret();
  if (!secret) return null;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME], secret);
}
