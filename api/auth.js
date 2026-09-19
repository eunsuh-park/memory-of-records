/**
 * /api/auth — 공유 관리자 비밀번호 + HttpOnly 세션 쿠키
 *
 * GET  ?op=me
 * POST { op: 'login' | 'logout', password? }
 *
 * Env: ADMIN_PASSWORD (또는 AUTH_PASSWORD), AUTH_SECRET
 */
import {
  COOKIE_NAME,
  clearSessionCookie,
  createSessionToken,
  getAdminPassword,
  getAuthSecret,
  getSessionFromRequest,
  isLocalDevAuth,
  setSessionCookie,
  timingSafeEqualString,
  verifySessionToken
} from './_lib/session.js';

const LOCAL_DEV_PASSWORD = '1114';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
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
      if (!secret) {
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
      const password = String(body.password ?? '');
      const adminOk = Boolean(adminPassword) && timingSafeEqualString(password, adminPassword);
      const localOk = isLocalDevAuth() && timingSafeEqualString(password, LOCAL_DEV_PASSWORD);
      if (!adminPassword && !localOk) {
        return res.status(503).json({
          error: 'Auth not configured',
          message: 'ADMIN_PASSWORD와 AUTH_SECRET을 설정해주세요'
        });
      }
      if (!adminOk && !localOk) {
        return res.status(401).json({
          ok: false,
          authenticated: false,
          message: '비밀번호가 올바르지 않습니다'
        });
      }
      if (!secret) {
        return res.status(503).json({
          error: 'Auth not configured',
          message: 'ADMIN_PASSWORD와 AUTH_SECRET을 설정해주세요'
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

export { getSessionFromRequest, COOKIE_NAME };
