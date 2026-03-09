// ── 탭 전환
document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
  });
});

const TAG_MAP = {
  latest:  { cls: 'tag-latest',  label: 'LATEST'   },
  feature: { cls: 'tag-feature', label: '기능 추가' },
  fix:     { cls: 'tag-fix',     label: '버그 수정' },
  release: { cls: 'tag-release', label: '최초 출시' },
};

// ── Changelog
function renderChangelog(data) {
  const GROUP = [
    { key: 'new',      label: '✨ 신규 기능', dot: 'dot-green'  },
    { key: 'improved', label: '🔧 개선 사항', dot: 'dot-blue'   },
    { key: 'fixed',    label: '🐛 버그 수정', dot: 'dot-yellow' },
  ];

  const cards = data.changelog.map((v, i) => {
    const tags = v.tags.map(t => {
      const m = TAG_MAP[t] || { cls: 'tag-feature', label: t };
      return `<span class="version-tag ${m.cls}">${m.label}</span>`;
    }).join('');

    const groups = GROUP.filter(g => v.changes[g.key]?.length).map(g => `
      <div class="change-group">
        <div class="change-group-title">${g.label}</div>
        <ul class="change-list">
          ${v.changes[g.key].map(c =>
            `<li class="change-item"><span class="change-dot ${g.dot}"></span>${c}</li>`
          ).join('')}
        </ul>
      </div>`).join('');

    return `
      <div class="version-card ${i === 0 ? 'open' : ''}" data-card>
        <div class="version-header">
          <div class="version-left">
            <span class="version-badge">v${v.version}</span>${tags}
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="version-date">${v.date.replaceAll('-', '.')}</span>
            <span class="version-chevron">▼</span>
          </div>
        </div>
        <div class="version-body">${groups}</div>
      </div>`;
  }).join('');

  document.getElementById('panel-changelog').innerHTML = `
    <div class="section-header">
      <span class="section-icon">📋</span>
      <div>
        <div class="section-title">업데이트 내역</div>
        <div class="section-desc">버전별 변경 사항을 확인하세요</div>
      </div>
    </div>${cards}`;

  // 카드 토글 이벤트 (인라인 onclick 대신)
  document.querySelectorAll('[data-card] .version-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('[data-card]').classList.toggle('open');
    });
  });
}

// ── Guide
function renderGuide(data) {
  const steps = data.guide.map(s => `
    <div class="step-card">
      <div class="step-num">${s.step}</div>
      <div class="step-content">
        <div class="step-title">${s.title}</div>
        <div class="step-desc">${s.desc}</div>
        ${s.tip ? `<div class="step-tip">💡 ${s.tip}</div>` : ''}
      </div>
    </div>`).join('');

  document.getElementById('panel-guide').innerHTML = `
    <div class="section-header">
      <span class="section-icon">📖</span>
      <div>
        <div class="section-title">사용 방법</div>
        <div class="section-desc">처음 시작하는 분들을 위한 단계별 안내</div>
      </div>
    </div>
    <div class="guide-steps">${steps}</div>`;
}

// ── Issues
const STATUS_MAP = {
  known:    { cls: 'status-known',    label: '알려진 이슈' },
  wip:      { cls: 'status-wip',      label: '수정 중'    },
  resolved: { cls: 'status-resolved', label: '해결됨'     },
};

function renderIssues(data) {
  const knownCount = data.issues.filter(i => i.status !== 'resolved').length;
  if (knownCount > 0) {
    document.getElementById('issuesTab').innerHTML =
      `🐛 알려진 이슈<span class="badge-new">${knownCount}</span>`;
  }

  const cards = data.issues.map(issue => {
    const s = STATUS_MAP[issue.status] || STATUS_MAP.known;
    const resolvedLabel = issue.resolvedIn ? ` (v${issue.resolvedIn})` : '';
    const workaround = issue.workaround
      ? `<div class="issue-workaround"><strong>해결 방법:</strong> ${issue.workaround}</div>` : '';

    return `
      <div class="issue-card ${issue.status === 'resolved' ? 'resolved' : ''}">
        <div class="issue-icon">${issue.icon}</div>
        <div class="issue-content">
          <div class="issue-title">
            ${issue.title}
            <span class="issue-status ${s.cls}">${s.label}${resolvedLabel}</span>
          </div>
          <div class="issue-desc">${issue.desc}</div>
          ${workaround}
        </div>
      </div>`;
  }).join('');

  document.getElementById('panel-issues').innerHTML = `
    <div class="section-header">
      <span class="section-icon">🐛</span>
      <div>
        <div class="section-title">알려진 이슈</div>
        <div class="section-desc">현재 확인된 버그 및 임시 해결 방법 안내</div>
      </div>
    </div>
    <div class="issue-list">${cards}</div>`;
}

// ── 공지사항 소스 URL
const GIST_URL  = 'https://gist.githubusercontent.com/snowpero/4da945b902a7e97a2070815208e819f5/raw/notices.json';
const LOCAL_URL = chrome.runtime.getURL('notices.json');

// ── 메인: Gist → 로컬 폴백 순서로 로드
async function loadNotices() {
  let data = null;
  let source = '';

  try {
    const res = await fetch(GIST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    source = 'gist';
  } catch {
    try {
      const res = await fetch(LOCAL_URL);
      data = await res.json();
      source = 'local';
    } catch {
      ['changelog', 'guide', 'issues'].forEach(id => {
        document.getElementById('panel-' + id).innerHTML =
          `<div class="error-state">⚠️ 공지사항을 불러올 수 없습니다.<br><small>인터넷 연결을 확인해 주세요.</small></div>`;
      });
      return;
    }
  }

  renderChangelog(data);
  renderGuide(data);
  renderIssues(data);

  const verEl = document.getElementById('footerVersion');
  verEl.textContent = `Copilot Usage Tracker v${data.version} · MIT License`;
  if (source === 'local') {
    verEl.textContent += ' (오프라인 — 로컬 데이터)';
  }
}

loadNotices();
