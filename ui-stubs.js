/* ui-stubs.js — Minimal UI helpers so the app updates immediately */

function showToast(msg) {
  // Simple console fallback; replace with a nicer toast UI if you have one
  console.log('TOAST:', msg);
  const existing = document.getElementById('toast-area');
  if (!existing) {
    const t = document.createElement('div');
    t.id = 'toast-area';
    t.style.position = 'fixed';
    t.style.right = '12px';
    t.style.bottom = '12px';
    t.style.zIndex = 2000;
    document.body.appendChild(t);
  }
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.background = 'rgba(0,0,0,0.8)';
  el.style.color = '#fff';
  el.style.padding = '8px 12px';
  el.style.marginTop = '6px';
  el.style.borderRadius = '6px';
  document.getElementById('toast-area').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function updateRewardsUI(state) {
  state = state || loadState();
  const pointsEl = document.getElementById('points');
  if (pointsEl) pointsEl.textContent = state.points || 0;

  const explorer = (state.affinity && state.affinity.explorer) || 0;
  const scholar = (state.affinity && state.affinity.scholar) || 0;
  const eFill = document.getElementById('affinity-explorer');
  const sFill = document.getElementById('affinity-scholar');
  if (eFill) eFill.style.width = Math.min(100, explorer * 6) + '%';
  if (sFill) sFill.style.width = Math.min(100, scholar * 6) + '%';
}

function updateLevelUI(state) {
  state = state || loadState();
  const levelEl = document.getElementById('level');
  if (levelEl) levelEl.textContent = state.level || 1;
  const xpBar = document.getElementById('xpBar');
  if (xpBar) {
    const percent = Math.max(0, Math.min(100, ((state.xp || 0) / (state.xpToNext || 100)) * 100));
    xpBar.style.width = percent + '%';
    xpBar.style.transition = 'width 400ms ease';
  }
}

function updateEventUI(eventId, progress) {
  const banner = document.getElementById('event-banner');
  if (!banner) return;
  banner.style.display = 'block';
  banner.textContent = `${eventId}: ${progress.tasksCompleted || 0} tasks completed`;
}

function showEventBanner(eventId) {
  const banner = document.getElementById('event-banner');
  if (!banner) return;
  banner.style.display = 'block';
  banner.textContent = `Event active: ${eventId}`;
}
