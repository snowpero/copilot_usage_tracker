/**
 * core/api.js
 * 크롬 확장에서 GitHub API 직접 호출
 * host_permissions에 api.github.com이 있어서 CORS 없음
 */

const API_BASE    = 'https://api.github.com';
const API_VERSION = '2022-11-28';

function buildHeaders(token) {
  return {
    'Accept':               'application/vnd.github+json',
    'Authorization':        `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
  };
}

export async function fetchUserInfo(token, username) {
  const r = await fetch(`${API_BASE}/users/${username}`, {
    headers: buildHeaders(token),
  });
  if (!r.ok) return { login: username, avatar_url: '', name: username, bio: '' };
  return r.json();
}

export async function fetchPremiumUsage(token, username) {
  const r = await fetch(
    `${API_BASE}/users/${username}/settings/billing/premium_request/usage`,
    { headers: buildHeaders(token) }
  );

  if (r.status === 401) throw new Error('토큰 인증 실패\n"Plan" Read-only 권한의 Fine-grained token인지 확인하세요.');
  if (r.status === 403) throw new Error('권한 없음\n토큰에 "Plan" 권한이 없습니다. 재발급해주세요.');
  if (r.status === 404) throw new Error('사용량 데이터 없음\nEnhanced Billing이 활성화된 유료 플랜 계정인지 확인해주세요.');
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.message || `GitHub API 오류 (${r.status})`);
  }
  return r.json();
}
