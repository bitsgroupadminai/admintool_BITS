const SESSION_TOKEN_KEY = 'campusflow.session';

export function readSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function persistSessionToken(token) {
  if (typeof token !== 'string' || !token.trim()) return;
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token.trim());
  } catch {
    // Private mode / blocked storage — cookie auth may still work.
  }
}

export function clearSessionToken() {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore
  }
}
