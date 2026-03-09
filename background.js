/**
 * background.js - Service Worker
 * 주기적으로 사용량 체크 → 한도 80% 이상 시 알림
 */

import { fetchPremiumUsage } from './core/api.js';
import { parseUsageData, getAllowance } from './core/parser.js';
import { storage } from './core/storage.js';

const ALARM_NAME    = 'usage-check';
const CHECK_MINUTES = 60; // 1시간마다 체크

// ── 알람 등록 ──────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: CHECK_MINUTES,
    periodInMinutes: CHECK_MINUTES,
  });
});

// ── 알람 발생 시 사용량 체크 ───────────────────
chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== ALARM_NAME) return;
  await checkUsageAndNotify();
});

// ── 팝업에서 수동 체크 요청 ────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'FETCH_USAGE') {
    handleFetchUsage().then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true; // async response
  }
  if (msg.type === 'CHECK_NOTIFY') {
    checkUsageAndNotify().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// ── 배지 업데이트 ──────────────────────────────
function updateBadge(pct) {
  const text = pct >= 100 ? '100%'
             : pct >= 10  ? `${Math.floor(pct)}%`
             : `${pct.toFixed(1)}%`;

  const color = pct >= 90 ? '#f85149'   // 빨강
              : pct >= 70 ? '#d29922'   // 노랑
              :              '#1f6feb';  // 파랑

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
}

// ── 사용량 조회 (팝업 요청용) ──────────────────
async function handleFetchUsage() {
  const token    = await storage.getToken();
  const username = await storage.getUsername();

  if (!token || !username) {
    throw new Error('토큰과 유저네임을 먼저 설정해주세요.');
  }

  const [rawUsage, userInfo] = await Promise.all([
    fetchPremiumUsage(token, username),
    fetch(`https://api.github.com/users/${username}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }).then(r => r.ok ? r.json() : { login: username, avatar_url: '', name: username }),
  ]);

  const parsed    = parseUsageData(rawUsage);
  const plan      = await storage.getPlan() ?? 'pro';
  const allowance = getAllowance(plan);
  const pct       = allowance > 0 ? (parsed.totalRequests / allowance) * 100 : 0;

  // 배지 업데이트
  updateBadge(pct);

  // 마지막 조회 결과 캐시
  await storage.set('last_usage', { parsed, userInfo, updatedAt: Date.now() });

  return { parsed, userInfo };
}

// ── 사용량 체크 + 알림 + 배지 ─────────────────
async function checkUsageAndNotify() {
  try {
    const token    = await storage.getToken();
    const username = await storage.getUsername();
    const plan     = await storage.getPlan() ?? 'pro';
    if (!token || !username) {
      clearBadge();
      return;
    }

    const raw       = await fetchPremiumUsage(token, username);
    const parsed    = parseUsageData(raw);
    const allowance = getAllowance(plan);
    const pct       = (parsed.totalRequests / allowance) * 100;

    // 배지 업데이트
    updateBadge(pct);

    // 이전 알림 레벨 확인 (중복 알림 방지)
    const lastNotified = await storage.get('last_notified_pct') ?? 0;

    if (pct >= 100 && lastNotified < 100) {
      notify('🚨 Copilot 한도 초과', `이번 달 Premium Request를 모두 사용했습니다. (${parsed.totalRequests} req)`);
      await storage.set('last_notified_pct', 100);
    } else if (pct >= 90 && lastNotified < 90) {
      notify('⚠️ Copilot 한도 90% 도달', `${parsed.totalRequests} / ${allowance} req 사용 중`);
      await storage.set('last_notified_pct', 90);
    } else if (pct >= 80 && lastNotified < 80) {
      notify('📊 Copilot 한도 80% 도달', `${parsed.totalRequests} / ${allowance} req 사용 중`);
      await storage.set('last_notified_pct', 80);
    }

    // 매월 1일 알림 레벨 리셋
    const now = new Date();
    if (now.getDate() === 1) {
      await storage.set('last_notified_pct', 0);
    }
  } catch {
    // 백그라운드 오류는 조용히 무시
  }
}

function notify(title, message) {
  chrome.notifications.create({
    type:    'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message,
  });
}
