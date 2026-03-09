import { parseUsageData, getAllowance } from './core/parser.js';
import { storage } from './core/storage.js';

// ── 유틸 ────────────────────────────────────────
const $ = id => document.getElementById(id);

function fmt(n)     { return typeof n === 'number' ? n.toLocaleString() : '—'; }
function fmtCost(n) { return `$${(n ?? 0).toFixed(2)}`; }

function daysElapsed() { return new Date().getDate(); }

function resetCountdown() {
  const now  = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const diff = next - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  return `리셋 ${d}일 ${h}h`;
}

function showError(msg) {
  $('errorMsg').innerHTML = msg.replace(/\n/g, '<br>');
  $('errorAlert').classList.add('show');
  $('infoAlert').classList.remove('show');
}

function clearAlerts() {
  $('errorAlert').classList.remove('show');
  $('infoAlert').classList.remove('show');
}

function setLoading(on) {
  $('loading').classList.toggle('show', on);
  if (on) {
    $('emptyState').style.display = 'none';
    $('dataArea').style.display   = 'none';
    $('footer').style.display     = 'none';
  }
}

// ── 차트 (순수 Canvas — Chart.js 의존성 없음) ────
function renderDonut(byModel) {
  const canvas = $('donutChart');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width  = canvas.offsetWidth  || 220;
  const H = canvas.height = canvas.offsetHeight || 140;

  ctx.clearRect(0, 0, W, H);

  if (!byModel.length) {
    ctx.fillStyle = '#484f58';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('사용 내역 없음', W / 2, H / 2);
    return;
  }

  const total   = byModel.reduce((s, m) => s + m.requests, 0);
  const cx      = W * 0.38;   // 도넛 중심 x (오른쪽에 범례 공간)
  const cy      = H / 2;
  const radius  = Math.min(cx, cy) - 8;
  const inner   = radius * 0.58;
  const gap     = 0.015;      // 조각 사이 간격 (라디안)

  let angle = -Math.PI / 2;

  byModel.forEach(m => {
    const slice = (m.requests / total) * (Math.PI * 2 - gap * byModel.length);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle + gap / 2, angle + slice - gap / 2);
    ctx.closePath();
    ctx.fillStyle = m.meta.color;
    ctx.fill();
    angle += slice;
  });

  // 내부 구멍 (도넛)
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1117';
  ctx.fill();

  // 중앙 텍스트
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e6edf3';
  ctx.font = `bold 15px monospace`;
  ctx.fillText(total.toLocaleString(), cx, cy + 2);
  ctx.fillStyle = '#8b949e';
  ctx.font = '9px monospace';
  ctx.fillText('requests', cx, cy + 14);

  // 범례 (오른쪽)
  const legendX = W * 0.72;
  const maxItems = Math.min(byModel.length, 5);
  const lineH    = Math.min(22, (H - 10) / maxItems);
  const startY   = (H - lineH * maxItems) / 2 + lineH / 2;

  byModel.slice(0, maxItems).forEach((m, i) => {
    const y = startY + i * lineH;
    // 색상 점
    ctx.beginPath();
    ctx.arc(legendX, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = m.meta.color;
    ctx.fill();
    // 라벨
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8b949e';
    ctx.font = '9px monospace';
    const label = m.meta.label.length > 12 ? m.meta.label.slice(0, 11) + '…' : m.meta.label;
    ctx.fillText(label, legendX + 9, y + 3);
  });

  if (byModel.length > 5) {
    ctx.fillStyle = '#484f58';
    ctx.font = '9px monospace';
    ctx.fillText(`+${byModel.length - 5} more`, legendX + 9, startY + 5 * lineH + 3);
  }
}

// ── 대시보드 렌더 ─────────────────────────────────
function renderDashboard(userInfo, parsed, plan) {
  const allowance = getAllowance(plan);
  const elapsed   = daysElapsed();
  const weekEst   = elapsed > 0 ? Math.round((parsed.totalRequests / elapsed) * 7) : 0;
  const monthPct  = Math.min((parsed.totalRequests / allowance) * 100, 100);
  const weekPct   = Math.min((weekEst / allowance) * 100, 100);

  // 프로필
  $('avatar').src          = userInfo.avatar_url ?? '';
  $('profileName').textContent = userInfo.name ?? userInfo.login;
  $('profileMeta').textContent = `@${userInfo.login}`;
  $('resetTime').textContent   = resetCountdown();
  $('planBadge').textContent   = plan.toUpperCase();

  // 통계
  $('totalReq').textContent    = fmt(parsed.totalRequests);
  $('totalReqSub').textContent = `req · ${elapsed}일 기준`;
  $('weekReq').textContent     = fmt(weekEst);

  // 진행 바
  const monthColor = monthPct >= 90 ? 'var(--red)' : monthPct >= 70 ? 'var(--yellow)' : 'var(--accent)';
  const weekColor  = weekPct  >= 90 ? 'var(--red)' : weekPct  >= 70 ? 'var(--yellow)' : 'var(--green)';

  $('monthCount').textContent = `${fmt(parsed.totalRequests)} / ${fmt(allowance)}`;
  $('weekCount').textContent  = `${fmt(weekEst)} / ${fmt(allowance)}`;

  setTimeout(() => {
    $('monthBar').style.cssText = `width:${monthPct}%;background:${monthColor}`;
    $('weekBar').style.cssText  = `width:${weekPct}%;background:${weekColor}`;
  }, 80);

  // 도넛 차트
  renderDonut(parsed.byModel);

  // 모델 목록
  const list = $('modelList');
  list.innerHTML = parsed.byModel.length
    ? parsed.byModel.map(m => `
        <div class="model-item">
          <div class="model-dot" style="background:${m.meta.color}"></div>
          <div class="model-name">${m.meta.label}</div>
          <div class="model-req">${fmt(m.requests)} req</div>
          <div class="model-cost">${fmtCost(m.cost)}</div>
        </div>
      `).join('')
    : `<div style="padding:16px;text-align:center;color:var(--text3);font-size:11px;">이번 달 사용 내역 없음</div>`;

  // 타임스탬프
  $('lastUpdated').textContent = new Date().toLocaleTimeString('ko-KR');

  // 표시
  $('emptyState').style.display = 'none';
  $('dataArea').style.display   = 'block';
  $('footer').style.display     = 'flex';
}

// ── 사용량 조회 ──────────────────────────────────
async function loadUsage() {
  clearAlerts();
  setLoading(true);

  try {
    const result = await chrome.runtime.sendMessage({ type: 'FETCH_USAGE' });

    if (result.error) throw new Error(result.error);

    const plan = await storage.getPlan() ?? 'pro';
    renderDashboard(result.userInfo, result.parsed, plan);
  } catch (e) {
    setLoading(false);
    $('emptyState').style.display = 'block';
    showError(e.message);
  } finally {
    setLoading(false);
  }
}

// ── 초기화 ───────────────────────────────────────
async function init() {
  const { gh_token, gh_username, gh_plan } = await storage.getAll();

  // 저장된 값 복원
  if (gh_username) $('usernameInput').value = gh_username;
  if (gh_plan)     $('planSelect').value    = gh_plan;
  // 토큰은 보안상 입력창에 복원 안 함

  if (gh_token && gh_username) {
    // 캐시된 데이터 먼저 표시
    const cached = await storage.get('last_usage');
    if (cached) {
      const plan = gh_plan ?? 'pro';
      renderDashboard(cached.userInfo, cached.parsed, plan);
    }
    // 최신 데이터 갱신
    await loadUsage();
  } else {
    $('emptyState').style.display = 'block';
  }
}

// ── 이벤트 바인딩 ────────────────────────────────

// 탭 전환
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $(`panel-${tab.dataset.tab}`).classList.add('active');
  });
});

// 헤더 설정 버튼
$('settingsBtn').addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="settings"]').classList.add('active');
  $('panel-settings').classList.add('active');
});

// 토큰 가이드 — 새 탭으로 열기
$('openGuideBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('guide.html') });
});

// 공지사항 — 새 탭으로 열기
$('noticesBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('notices.html') });
});

// 저장 및 조회
$('saveBtn').addEventListener('click', async () => {
  const token    = $('tokenInput').value.trim();
  const username = $('usernameInput').value.trim();
  const plan     = $('planSelect').value;

  if (!username) { showError('Username을 입력해주세요.'); return; }
  if (!token)    { showError('Token을 입력해주세요.'); return; }

  await storage.setToken(token);
  await storage.setUsername(username);
  await storage.setPlan(plan);

  // 대시보드 탭으로 전환
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="dashboard"]').classList.add('active');
  $('panel-dashboard').classList.add('active');

  await loadUsage();
});

// 초기화
$('clearBtn').addEventListener('click', async () => {
  await storage.clearAll();
  $('tokenInput').value    = '';
  $('usernameInput').value = '';
  $('planSelect').value    = 'pro';
  $('dataArea').style.display   = 'none';
  $('footer').style.display     = 'none';
  $('emptyState').style.display = 'block';
  clearAlerts();
  if (donutInst) { donutInst.destroy(); donutInst = null; }
});

// 새로고침
$('refreshBtn').addEventListener('click', loadUsage);

// 실행
init();
