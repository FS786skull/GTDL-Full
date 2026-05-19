/* storage.js — central user state */

function loadState() {
  const raw = localStorage.getItem('userState');
  const defaults = {
    points: 0,
    resources: {},
    affinity: {},
    currentBranch: null,
    unlockedBranches: [],
    ownedOutfits: [],
    ownedItems: [],
    currentOutfit: null,
    avatarCustomization: {
      style: 'default',
      skin: '#ffe0b3',
      shirtTop: '#e74c3c',
      shirtBottom: '#c0392b',
      pantsTop: '#6a1b9a',
      pantsBottom: '#4a0f7a',
      hat: '#222222',
      eyeStyle: 'normal',
      options: {
        visor: false,
        glow: false,
        badge: false,
        badgeShape: 'circle'
      },
      gradient: { preset: 'flat', stops: ['#e74c3c', '#c0392b'], type: 'linear' }
    },
    activeEventProgress: {},
    level: 1,
    xp: 0,
    xpToNext: 100,
    theme: 'light',
    completedTasks: [],
    tasks: []
  };

  let parsed = {};
  if (raw) {
    try {
      parsed = JSON.parse(raw) || {};
    } catch (err) {
      console.warn('userState JSON parse failed, resetting to defaults:', err);
      localStorage.removeItem('userState');
      parsed = {};
    }
  }

  const state = Object.assign({}, defaults, parsed);

  if (!state.avatarCustomization || typeof state.avatarCustomization !== 'object') {
    state.avatarCustomization = defaults.avatarCustomization;
  } else {
    if (!state.avatarCustomization.options || typeof state.avatarCustomization.options !== 'object') {
      state.avatarCustomization.options = Object.assign({}, defaults.avatarCustomization.options);
    } else {
      state.avatarCustomization.options.visor = !!state.avatarCustomization.options.visor;
      state.avatarCustomization.options.glow = !!state.avatarCustomization.options.glow;
      state.avatarCustomization.options.badge = !!state.avatarCustomization.options.badge;
      state.avatarCustomization.options.badgeShape = state.avatarCustomization.options.badgeShape || 'circle';
    }

    state.avatarCustomization.style = state.avatarCustomization.style || defaults.avatarCustomization.style;
    state.avatarCustomization.skin = state.avatarCustomization.skin || defaults.avatarCustomization.skin;
    state.avatarCustomization.shirtTop = state.avatarCustomization.shirtTop || defaults.avatarCustomization.shirtTop;
    state.avatarCustomization.shirtBottom = state.avatarCustomization.shirtBottom || state.avatarCustomization.shirtTop || defaults.avatarCustomization.shirtBottom;
    state.avatarCustomization.pantsTop = state.avatarCustomization.pantsTop || defaults.avatarCustomization.pantsTop;
    state.avatarCustomization.pantsBottom = state.avatarCustomization.pantsBottom || state.avatarCustomization.pantsTop || defaults.avatarCustomization.pantsBottom;
    state.avatarCustomization.hat = state.avatarCustomization.hat || defaults.avatarCustomization.hat;
    state.avatarCustomization.eyeStyle = state.avatarCustomization.eyeStyle || defaults.avatarCustomization.eyeStyle;
    if (!state.avatarCustomization.gradient || !Array.isArray(state.avatarCustomization.gradient.stops)) {
      state.avatarCustomization.gradient = { preset: 'flat', stops: [state.avatarCustomization.shirtTop || '#e74c3c', state.avatarCustomization.shirtBottom || '#c0392b'], type: 'linear' };
    }
  }

  state.resources = state.resources || {};
  state.affinity = state.affinity || {};
  state.unlockedBranches = state.unlockedBranches || [];
  state.ownedOutfits = state.ownedOutfits || [];
  state.ownedItems = state.ownedItems || [];
  state.activeEventProgress = state.activeEventProgress || {};
  state.completedTasks = state.completedTasks || [];
  state.tasks = state.tasks || [];

  state.points = Number(state.points || 0);
  state.xp = state.xp || 0;
  state.xpToNext = state.xpToNext || 100;

  // non-destructive level fallback
  state.level = state.level || Math.floor((state.points || 0) / 50) + 1;

  state.theme = state.theme || defaults.theme;

  // keep legacy keys in sync for older pages/scripts
  try {
    localStorage.setItem('points', String(state.points || 0));
    localStorage.setItem('balance', String(state.points || 0));
    if (Array.isArray(state.ownedOutfits)) localStorage.setItem('ownedOutfits', JSON.stringify(state.ownedOutfits));
    if (Array.isArray(state.ownedItems)) localStorage.setItem('ownedItems', JSON.stringify(state.ownedItems));
    if (state.currentOutfit) localStorage.setItem('currentOutfit', state.currentOutfit);
  } catch (e) { /* ignore storage errors */ }

  return state;
}

function saveState(state) {
  try {
    localStorage.setItem('userState', JSON.stringify(state));
    // keep legacy keys in sync
    try {
      localStorage.setItem('points', String(state.points || 0));
      localStorage.setItem('balance', String(state.points || 0));
      if (Array.isArray(state.ownedOutfits)) localStorage.setItem('ownedOutfits', JSON.stringify(state.ownedOutfits));
      if (Array.isArray(state.ownedItems)) localStorage.setItem('ownedItems', JSON.stringify(state.ownedItems));
      if (state.currentOutfit) localStorage.setItem('currentOutfit', state.currentOutfit);
    } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Failed to save userState:', err);
  }
}
