/**
 * /api/auth — 공유 관리자 비밀번호 + HttpOnly 세션 쿠키
 *
 * GET  ?op=me
 * POST { op: 'login' | 'logout', password? }
 *
 * Env: ADMIN_PASSWORD (또는 AUTH_PASSWORD), AUTH_SECRET
 */
import crypto from 'crypto';

const COOKIE_NAME = 'mor_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7; /* 7일 */

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function getAdminPassword() {
  return trimOrEmpty(process.env.ADMIN_PASSWORD || process.env.AUTH_PASSWORD);
}

function getAuthSecret() {
  return trimOrEmpty(process.env.AUTH_SECRET) || getAdminPassword();
}

function timingSafeEqualString(a, b) {
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

function createSessionToken(secret) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = String(exp);
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

function verifySessionToken(token, secret) {
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

function setSessionCookie(res, token) {
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

function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function getSessionFromRequest(req) {
  const secret = getAuthSecret();
  if (!secret) return null;
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME], secret);
}

export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';
    const adminPassword = getAdminPassword();
    const secret = getAuthSecret();

    if (method === 'GET') {
      const op = trimOrEmpty(req.query?.op || 'me') || 'me';
      if (op !== 'me') {
        return res.status(400).json({ error: 'Unknown op', message: 'GET op=me 만 지원합니다' });
      }
      if (!adminPassword || !secret) {
        return res.status(503).json({
          ok: false,
          authenticated: false,
          message: 'ADMIN_PASSWORD / AUTH_SECRET 환경 변수가 필요합니다'
        });
      }
      const session = getSessionFromRequest(req);
      return res.status(200).json({
        ok: true,
        authenticated: Boolean(session),
        exp: session?.exp || null
      });
    }

    if (method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const op = trimOrEmpty(body.op);

    if (op === 'logout') {
      clearSessionCookie(res);
      return res.status(200).json({ ok: true, authenticated: false });
    }

    if (op === 'login') {
      if (!adminPassword || !secret) {
        return res.status(503).json({
          error: 'Auth not configured',
          message: 'ADMIN_PASSWORD와 AUTH_SECRET을 설정해주세요'
        });
      }
      const password = String(body.password ?? '');
      if (!timingSafeEqualString(password, adminPassword)) {
        return res.status(401).json({
          ok: false,
          authenticated: false,
          message: '비밀번호가 올바르지 않습니다'
        });
      }
      const token = createSessionToken(secret);
      setSessionCookie(res, token);
      const session = verifySessionToken(token, secret);
      return res.status(200).json({
        ok: true,
        authenticated: true,
        exp: session?.exp || null
      });
    }

    return res.status(400).json({
      error: 'Validation failed',
      message: "op은 'login' | 'logout' 중 하나여야 합니다"
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'auth API failed',
      message: error.message
    });
  }
}

/* 다른 API에서 재사용할 수 있도록 export (향후 mutation 가드용) */
export { getSessionFromRequest, COOKIE_NAME };
