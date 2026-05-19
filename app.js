/**
 * app.js
 *
 * list for the functions in here: 
 * - Tasks (create, subtasks, timers, complete)
 * - XP and Level handling
 * - Suggested tasks generation and refresh
 * - Theme switching and persistence
 * - UI wiring to avatar.js, crafting.js, rewards.js, storage.js
 * make sure to fix the avatar!
 * Usage:
 
 */

(function () {
  'use strict';

  /* ---------------------------
     Storage fallback (non-destructive)
  --------------------------- */
  if (typeof window.loadState !== 'function') {
    window.loadState = function () {
      try {
        const raw = localStorage.getItem('userState');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.tasks = parsed.tasks || [];
          parsed.completedTasks = parsed.completedTasks || [];
          parsed.avatarCustomization = parsed.avatarCustomization || {};
          parsed.points = Number(parsed.points || 0);
          parsed.xp = Number(parsed.xp || 0);
          parsed.xpToNext = Number(parsed.xpToNext || 100);
          parsed.level = parsed.level || Math.floor((parsed.points || 0) / 50) + 1;
          parsed.theme = parsed.theme || 'light';
          return parsed;
        }
      } catch (e) {
        console.warn('loadState parse failed, using defaults', e);
      }
      return {
        points: 0,
        xp: 0,
        xpToNext: 100,
        level: 1,
        tasks: [],
        completedTasks: [],
        ownedOutfits: [],
        currentOutfit: null,
        resources: {},
        avatarCustomization: {
          style: 'default',
          skin: '#ffe0b3',
          hat: '#222222',
          shirtTop: '#e74c3c',
          shirtBottom: '#c0392b',
          pantsTop: '#6a1b9a',
          pantsBottom: '#4a0f7a',
          options: { visor: false, glow: false, badge: false, badgeShape: 'circle' },
          gradient: { preset: 'flat', stops: ['#e74c3c', '#c0392b'], type: 'linear' }
        },
        theme: 'light'
      };
    };
  }

  if (typeof window.saveState !== 'function') {
    window.saveState = function (state) {
      try {
        localStorage.setItem('userState', JSON.stringify(state));
        localStorage.setItem('points', String(state.points || 0));
      } catch (e) {
        console.error('saveState failed', e);
      }
    };
  }

  /* ---------------------------
     Utilities
  --------------------------- */
  function uid(prefix = '') {
    return prefix + Math.random().toString(36).slice(2, 9);
  }

  function safeGet(id) {
    return document.getElementById(id) || null;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* ---------------------------
     Task timers and rendering
  --------------------------- */
  const TaskTimers = {};

  function formatTime(sec) {
    sec = Number(sec) || 0;
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function startTaskTimer(taskId, timerEl) {
    const t = TaskTimers[taskId];
    if (!t) return;
    if (t.intervalId) return;
    t.intervalId = setInterval(() => {
      if (t.remaining <= 0) {
        clearInterval(t.intervalId);
        t.intervalId = null;
        timerEl.textContent = '00:00';
        return;
      }
      t.remaining -= 1;
      timerEl.textContent = formatTime(t.remaining);
    }, 1000);
  }

  function persistTaskUpdate(taskObj) {
    const state = loadState();
    state.tasks = state.tasks || [];
    const idx = state.tasks.findIndex(t => t.id === taskObj.id);
    if (idx !== -1) {
      state.tasks[idx] = Object.assign({}, state.tasks[idx], taskObj);
    } else {
      state.tasks.push(taskObj);
    }
    saveState(state);
  }

  function finalizeTaskElement(li) {
    if (!li) return;
    li.classList.add('task-done');
    li.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const completed = safeGet('completedTasks');
    if (completed) {
      const clone = li.cloneNode(true);
      completed.insertBefore(clone, completed.firstChild);
      li.remove();
    }
  }

  function awardForTask(task) {
    const s = loadState();
    s.points = Number(s.points || 0) + Number(task.points || 0);
    saveState(s);
    updateRewardsUI(s);
    // If rewards.js exposes onRewardEarned, call it
    if (window.rewards && typeof window.rewards.onRewardEarned === 'function') {
      try { window.rewards.onRewardEarned(task); } catch (e) { console.warn(e); }
    }
  }

  function onTaskComplete(task) {
    awardForTask(task);
    addXP(task.xp || 15);

    if (TaskTimers[task.id] && TaskTimers[task.id].intervalId) {
      clearInterval(TaskTimers[task.id].intervalId);
      TaskTimers[task.id].intervalId = null;
    }

    const state = loadState();
    state.completedTasks = state.completedTasks || [];
    state.tasks = state.tasks || [];
    const idx = state.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) state.tasks[idx].completed = true;

    const text = task.text ? task.text : (state.tasks[idx] ? state.tasks[idx].text : 'Completed task');
    state.completedTasks.push({ id: task.id, text, completedAt: Date.now(), xp: task.xp || 0, points: task.points || 0 });
    saveState(state);

    loadTasks();
    // notify avatar or rewards if needed
    if (window.avatar && typeof window.avatar.onTaskComplete === 'function') {
      try { window.avatar.onTaskComplete(task); } catch (e) { /* ignore */ }
    }
  }

  function createTaskElement(taskObj) {
    const li = document.createElement('li');
    li.setAttribute('data-task-id', taskObj.id);
    li.className = 'task-item';

    const row = document.createElement('div');
    row.className = 'task-row';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '12px';

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = taskObj.text;

    left.appendChild(textSpan);

    // Subtask area
    const subContainer = document.createElement('div');
    subContainer.style.display = 'flex';
    subContainer.style.flexDirection = 'column';
    subContainer.style.gap = '6px';
    subContainer.style.marginLeft = '8px';

    const subInputRow = document.createElement('div');
    subInputRow.style.display = 'flex';
    subInputRow.style.gap = '6px';

    const subInput = document.createElement('input');
    subInput.type = 'text';
    subInput.placeholder = 'Add subtask';
    subInput.style.flex = '1';

    const addSubBtn = document.createElement('button');
    addSubBtn.textContent = 'Add Sub';
    addSubBtn.addEventListener('click', () => {
      const text = subInput.value.trim();
      if (!text) return;
      const newSub = { id: uid('sub_'), text, done: false };
      taskObj.subtasks = taskObj.subtasks || [];
      taskObj.subtasks.push(newSub);
      persistTaskUpdate(taskObj);
      const parent = li.parentElement;
      if (parent) {
        li.remove();
        parent.appendChild(createTaskElement(taskObj));
      }
    });

    subInputRow.appendChild(subInput);
    subInputRow.appendChild(addSubBtn);

    const subList = document.createElement('ul');
    subList.style.listStyle = 'none';
    subList.style.paddingLeft = '0';
    (taskObj.subtasks || []).forEach(st => {
      const stLi = document.createElement('li');
      stLi.style.display = 'flex';
      stLi.style.alignItems = 'center';
      stLi.style.gap = '8px';

      const stText = document.createElement('span');
      stText.textContent = st.text;

      const stBtn = document.createElement('button');
      stBtn.textContent = 'Done';
      stBtn.disabled = !!st.done;
      stBtn.addEventListener('click', () => {
        if (st.done) return;
        st.done = true;
        stBtn.disabled = true;
        stLi.remove();
        const state = loadState();
        state.tasks = state.tasks || [];
        const tIndex = state.tasks.findIndex(t => t.id === taskObj.id);
        if (tIndex !== -1) {
          state.tasks[tIndex].subtasks = state.tasks[tIndex].subtasks || [];
          const subIndex = state.tasks[tIndex].subtasks.findIndex(s => s.id === st.id);
          if (subIndex !== -1) state.tasks[tIndex].subtasks[subIndex].done = true;
          saveState(state);
        }
        onTaskComplete({
          id: uid('sub_complete_'),
          points: 2,
          branch: taskObj.branch,
          xp: 5
        });
      });

      stLi.appendChild(stText);
      stLi.appendChild(stBtn);
      subList.appendChild(stLi);
    });

    subContainer.appendChild(subInputRow);
    subContainer.appendChild(subList);

    left.appendChild(subContainer);

    row.appendChild(left);

    // Right side: timer + complete
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '8px';

    TaskTimers[taskObj.id] = TaskTimers[taskObj.id] || {
      remaining: taskObj.timer || 0,
      intervalId: null
    };

    const timerEl = document.createElement('span');
    timerEl.className = 'task-timer';
    timerEl.textContent = formatTime(TaskTimers[taskObj.id].remaining || taskObj.timer || 0);

    startTaskTimer(taskObj.id, timerEl);

    const btnComplete = document.createElement('button');
    btnComplete.textContent = 'Complete';
    btnComplete.addEventListener('click', () => onTaskComplete(taskObj));

    right.appendChild(timerEl);
    right.appendChild(btnComplete);

    row.appendChild(right);

    li.appendChild(row);

    if (taskObj.completed) {
      setTimeout(() => finalizeTaskElement(li), 0);
    }

    return li;
  }

  function loadTasks() {
    const state = loadState();
    const tasks = state.tasks || [];
    const list = safeGet('taskList');
    if (!list) return;
    list.innerHTML = '';
    tasks.forEach(task => {
      const el = createTaskElement(task);
      list.appendChild(el);
      if (task.completed) finalizeTaskElement(el);
    });
  }

  /* ---------------------------
     XP / Level / UI updates
  --------------------------- */
  function addXP(amount) {
    const state = loadState();
    state.xp = (state.xp || 0) + Number(amount || 0);
    state.xpToNext = state.xpToNext || 100;
    while (state.xp >= state.xpToNext) {
      state.xp -= state.xpToNext;
      state.level = (state.level || 1) + 1;
      state.xpToNext = Math.round(state.xpToNext * 1.15);
      // optional hook: rewards for leveling
      if (window.rewards && typeof window.rewards.onLevelUp === 'function') {
        try { window.rewards.onLevelUp(state.level); } catch (e) { /* ignore */ }
      }
    }
    state.level = state.level || Math.floor((state.points || 0) / 50) + 1;
    saveState(state);
    updateLevelUI(state);
  }

  function updateLevelUI(state) {
    state = state || loadState();
    const levelEl = safeGet('level');
    if (levelEl) levelEl.textContent = String(state.level || 1);
    const xpBar = safeGet('xpBar');
    if (xpBar) {
      const pct = state.xpToNext ? Math.min(100, Math.round((state.xp || 0) / state.xpToNext * 100)) : 0;
      xpBar.style.width = pct + '%';
    }
    const pointsEl = safeGet('points');
    if (pointsEl) pointsEl.textContent = String(state.points || 0);
  }

  function updateRewardsUI(state) {
    state = state || loadState();
    const pointsEl = safeGet('points');
    if (pointsEl) pointsEl.textContent = String(state.points || 0);
    // delegate to rewards.js if present
    if (window.rewards && typeof window.rewards.updateRewardsUI === 'function') {
      try { window.rewards.updateRewardsUI(state); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------------------
     Suggested tasks
  --------------------------- */
  const SUGGESTED_POOL = [
    'Plan tomorrow\'s top 3 tasks',
    'Clear your inbox for 15 minutes',
    'Take a 10-minute walk',
    'Review weekly goals',
    'Tidy your workspace',
    'Read one chapter of a book',
    'Practice a skill for 20 minutes',
    'Prepare lunch for tomorrow',
    'Backup important files',
    'Write a short journal entry'
  ];

  function generateSuggested(count = 4) {
    const pool = SUGGESTED_POOL.slice();
    const out = [];
    while (out.length < count && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  function renderSuggested() {
    const list = safeGet('suggestedTasks');
    if (!list) return;
    list.innerHTML = '';
    const suggestions = generateSuggested(5);
    suggestions.forEach(text => {
      const li = document.createElement('li');
      li.className = 'suggested-item';
      const span = document.createElement('span');
      span.textContent = text;
      const btn = document.createElement('button');
      btn.textContent = 'Add';
      btn.addEventListener('click', () => {
        const s = loadState();
        const task = {
          id: uid('task_'),
          text,
          xp: 10,
          points: 5,
          timer: 15 * 60,
          subtasks: [],
          createdAt: Date.now(),
          completed: false
        };
        s.tasks = s.tasks || [];
        s.tasks.push(task);
        saveState(s);
        loadTasks();
      });
      li.appendChild(span);
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

 /* ---------------------------
   Theme Switching (data-theme)
----------------------------*/
function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);

  const s = loadState();
  s.theme = theme;
  saveState(s);
}

function wireThemeSelector() {
  const select = document.getElementById("themeSelect");
  if (!select) return;

  const s = loadState();
  select.value = s.theme || "light";

  select.addEventListener("change", () => {
    applyTheme(select.value);
  });

  // Apply on load
  applyTheme(select.value);
}


  /* ---------------------------
     UI wiring and initialization
  --------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // initial state
    const state = loadState();

    // Level and rewards UI
    updateLevelUI(state);
    updateRewardsUI(state);

    // Tasks
    loadTasks();

    // Add task wiring
    const addBtn = safeGet('addTaskBtn');
    if (addBtn) addBtn.addEventListener('click', () => {
      const input = safeGet('taskInput');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      const taskObj = {
        id: uid('task_'),
        text,
        xp: 15,
        points: 10,
        branch: 'explorer',
        timer: 25 * 60,
        subtasks: [],
        createdAt: Date.now(),
        completed: false
      };
      const s = loadState();
      s.tasks = s.tasks || [];
      s.tasks.push(taskObj);
      saveState(s);
      loadTasks();
    });

    const taskInput = safeGet('taskInput');
    if (taskInput) {
      taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const btn = safeGet('addTaskBtn');
          if (btn) btn.click();
        }
      });
    }

    // Suggested tasks
    const refreshBtn = safeGet('refreshSuggestions');
    if (refreshBtn) refreshBtn.addEventListener('click', renderSuggested);
    renderSuggested();

    // Outfit select wiring (delegates to avatar.js via state)
    const outfitSelect = safeGet('outfitSelect');
    if (outfitSelect) {
      try { if (state && state.currentOutfit) outfitSelect.value = state.currentOutfit; } catch (e) {}
      outfitSelect.addEventListener('change', () => {
        const s2 = loadState();
        s2.currentOutfit = outfitSelect.value || null;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        } else if (typeof updateAvatarVisuals === 'function') {
          try { updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }

    // Color pickers for avatar parts (delegate to avatar.js by saving state and calling update)
    const colorInputs = [
      { id: 'skinColor', key: 'skin' },
      { id: 'shirtTopColor', key: 'shirtTop' },
      { id: 'pantsColor', key: 'pantsTop' },
      { id: 'hatColor', key: 'hat' }
    ];
    colorInputs.forEach(ci => {
      const el = safeGet(ci.id);
      if (!el) return;
      // initialize from state if present
      try {
        const val = state.avatarCustomization && state.avatarCustomization[ci.key];
        if (val) el.value = val;
      } catch (e) {}
      el.addEventListener('input', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization[ci.key] = el.value;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    });

    // Gradient editor wiring
    const editGradientBtn = safeGet('editGradientBtn');
    const closeGradientEditor = safeGet('closeGradientEditor');
    const applyGradientStops = safeGet('applyGradientStops');
    const gradStop1 = safeGet('gradStop1');
    const gradStop2 = safeGet('gradStop2');
    if (editGradientBtn) editGradientBtn.addEventListener('click', () => { const ed = safeGet('gradient-editor'); if (ed) ed.style.display = 'block'; });
    if (closeGradientEditor) closeGradientEditor.addEventListener('click', () => { const ed = safeGet('gradient-editor'); if (ed) ed.style.display = 'none'; });
    if (applyGradientStops && gradStop1 && gradStop2) {
      applyGradientStops.addEventListener('click', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.gradient = s2.avatarCustomization.gradient || { stops: [] };
        s2.avatarCustomization.gradient.stops = [gradStop1.value, gradStop2.value];
        s2.avatarCustomization.shirtTop = gradStop1.value;
        s2.avatarCustomization.shirtBottom = gradStop2.value;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
        const ed = safeGet('gradient-editor'); if (ed) ed.style.display = 'none';
      });
    }

    // Visor / Glow / Badge toggles
    const visorToggle = safeGet('visorToggle');
    const glowToggle = safeGet('glowToggle');
    const badgeToggle = safeGet('badgeToggle');
    if (visorToggle) {
      visorToggle.checked = !!(state.avatarCustomization && state.avatarCustomization.options && state.avatarCustomization.options.visor);
      visorToggle.addEventListener('change', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.options = s2.avatarCustomization.options || {};
        s2.avatarCustomization.options.visor = !!visorToggle.checked;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }
    if (glowToggle) {
      glowToggle.checked = !!(state.avatarCustomization && state.avatarCustomization.options && state.avatarCustomization.options.glow);
      glowToggle.addEventListener('change', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.options = s2.avatarCustomization.options || {};
        s2.avatarCustomization.options.glow = !!glowToggle.checked;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }
    if (badgeToggle) {
      badgeToggle.checked = !!(state.avatarCustomization && state.avatarCustomization.options && state.avatarCustomization.options.badge);
      badgeToggle.addEventListener('change', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.options = s2.avatarCustomization.options || {};
        s2.avatarCustomization.options.badge = !!badgeToggle.checked;
        saveState(s2);
        if (window.avatar && typeof window.avatar.toggleBadge === 'function') {
          try { window.avatar.toggleBadge(!!badgeToggle.checked); } catch (e) { /* ignore */ }
        } else if (typeof toggleBadge === 'function') {
          try { toggleBadge(!!badgeToggle.checked); } catch (e) { /* ignore */ }
        } else if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
        // show/hide badge menu
        const badgeMenuRow = safeGet('badgeMenuRow');
        if (badgeMenuRow) badgeMenuRow.style.display = badgeToggle.checked ? 'flex' : 'none';
      });
      // initial badge menu visibility
      const badgeMenuRow = safeGet('badgeMenuRow');
      if (badgeMenuRow) badgeMenuRow.style.display = badgeToggle.checked ? 'flex' : 'none';
    }

    // Badge shape apply
    const badgeShapeSelect = safeGet('badgeShapeSelect');
    const applyBadgeShape = safeGet('applyBadgeShape');
    if (applyBadgeShape && badgeShapeSelect) {
      applyBadgeShape.addEventListener('click', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.options = s2.avatarCustomization.options || {};
        s2.avatarCustomization.options.badgeShape = badgeShapeSelect.value;
        saveState(s2);
        if (window.avatar && typeof window.avatar.setBadgeShape === 'function') {
          try { window.avatar.setBadgeShape(badgeShapeSelect.value); } catch (e) { /* ignore */ }
        } else if (typeof setBadgeShape === 'function') {
          try { setBadgeShape(badgeShapeSelect.value); } catch (e) { /* ignore */ }
        } else if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }

    // Eye style
    const eyeStyleSelect = safeGet('eyeStyleSelect');
    if (eyeStyleSelect) {
      try { if (state.avatarCustomization && state.avatarCustomization.eyeStyle) eyeStyleSelect.value = state.avatarCustomization.eyeStyle; } catch (e) {}
      eyeStyleSelect.addEventListener('change', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.eyeStyle = eyeStyleSelect.value;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }

    // Expression buttons
    const exprBtns = document.querySelectorAll('.expr-btn');
    exprBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const expr = btn.getAttribute('data-expr');
        if (window.avatar && typeof window.avatar.setExpression === 'function') {
          try { window.avatar.setExpression(expr); } catch (e) { /* ignore */ }
        }
      });
    });

    // Play jump and toggle badge buttons
    const playJump = safeGet('playJump');
    if (playJump) {
      playJump.addEventListener('click', () => {
        if (window.avatar && typeof window.avatar.playJump === 'function') {
          try { window.avatar.playJump(); } catch (e) { /* ignore */ }
        }
      });
    }
    const toggleBadgeBtn = safeGet('toggleBadge');
    if (toggleBadgeBtn) {
      toggleBadgeBtn.addEventListener('click', () => {
        const s2 = loadState();
        s2.avatarCustomization = s2.avatarCustomization || {};
        s2.avatarCustomization.options = s2.avatarCustomization.options || {};
        s2.avatarCustomization.options.badge = !s2.avatarCustomization.options.badge;
        saveState(s2);
        if (window.avatar && typeof window.avatar.toggleBadge === 'function') {
          try { window.avatar.toggleBadge(!!s2.avatarCustomization.options.badge); } catch (e) { /* ignore */ }
        } else if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
        const badgeToggleEl = safeGet('badgeToggle');
        if (badgeToggleEl) badgeToggleEl.checked = !!s2.avatarCustomization.options.badge;
        const badgeMenuRow = safeGet('badgeMenuRow');
        if (badgeMenuRow) badgeMenuRow.style.display = s2.avatarCustomization.options.badge ? 'flex' : 'none';
      });
    }

    // Randomize avatar
    const randBtn = safeGet('randomizeAvatar');
    if (randBtn) {
      randBtn.addEventListener('click', () => {
        const s2 = loadState();
        const outfits = s2.ownedOutfits && s2.ownedOutfits.length ? s2.ownedOutfits : ['blue','red','purple','explorer','ninja','knight'];
        const pick = outfits[Math.floor(Math.random() * outfits.length)];
        s2.currentOutfit = pick;
        saveState(s2);
        if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
          try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
        }
      });
    }

    // Craft modal wiring (delegates to crafting.js)
    const openCraft = safeGet('open-craft');
    const closeCraft = safeGet('close-craft');
    const craftModal = safeGet('crafting-modal');
    if (openCraft && craftModal) openCraft.addEventListener('click', () => { craftModal.style.display = 'block'; if (window.crafting && typeof window.crafting.onOpenCraft === 'function') { try { window.crafting.onOpenCraft(); } catch (e) {} } });
    if (closeCraft && craftModal) closeCraft.addEventListener('click', () => { craftModal.style.display = 'none'; });

    // Craft button (delegates)
    const craftBtn = safeGet('craft-button');
    if (craftBtn) {
      craftBtn.addEventListener('click', () => {
        if (window.crafting && typeof window.crafting.craftItem === 'function') {
          try { window.crafting.craftItem('explorer-outfit'); } catch (e) { console.warn(e); }
        }
      });
    }

    // Theme selector
    const themeSelect = safeGet('themeSelect');
    if (themeSelect) {
      try { themeSelect.value = state.theme || 'light'; } catch (e) {}
      themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
    }
    // apply initial theme
    applyTheme(state.theme || 'light');

    // Wire rewards UI update hook if rewards.js exists
    if (window.rewards && typeof window.rewards.init === 'function') {
      try { window.rewards.init(); } catch (e) { /* ignore */ }
    }

    // Final avatar update call (if avatar.js present)
    if (window.avatar && typeof window.avatar.updateAvatarVisuals === 'function') {
      try { window.avatar.updateAvatarVisuals(); } catch (e) { /* ignore */ }
    }

  }); // DOMContentLoaded

  /* ---------------------------
     Public API for debugging
  --------------------------- */
  window.app = window.app || {};
  window.app.loadTasks = loadTasks;
  window.app.addTask = function (text) {
    const input = safeGet('taskInput');
    if (input) { input.value = text; const btn = safeGet('addTaskBtn'); if (btn) btn.click(); }
  };
  window.app.addXP = addXP;
  window.app.updateLevelUI = updateLevelUI;
  window.app.updateRewardsUI = updateRewardsUI;
  window.app.renderSuggested = renderSuggested;
  window.app.applyTheme = applyTheme;

})();
