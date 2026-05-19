/* rewards.js — XP, levels, rewards, branches */

function awardForTask(task) {
  const state = loadState();

  state.points = (state.points || 0) + (task.points || 0);

  if (task.rewardType) {
    const chance = typeof task.rewardChance === 'number' ? task.rewardChance : 1;
    if (task.rewardType === 'shard' && Math.random() >= chance) {
      task.rewardType = null;
      task.rewardAmount = 0;
    }
  }

  if (task.rewardType) {
    state.resources = state.resources || {};
    state.resources[task.rewardType] = (state.resources[task.rewardType] || 0) + (task.rewardAmount || 1);
  }

  if (task.branch) {
    state.affinity = state.affinity || {};
    state.affinity[task.branch] = (state.affinity[task.branch] || 0) + (task.affinityGain || 1);
    checkBranchUnlock(task.branch, state);
  }

  saveState(state);

  if (typeof updateRewardsUI === 'function') updateRewardsUI(state);
  if (typeof updateAvatarBranch === 'function') updateAvatarBranch(state);
}

function addXP(amount) {
  if (!amount || amount <= 0) return;
  const state = loadState();
  state.xp = (state.xp || 0) + amount;

  const previousLevel = state.level || 1;
  const targetLevel = Math.floor((state.points || 0) / 50) + 1;

  if (targetLevel > previousLevel) {
    for (let nextLevel = previousLevel + 1; nextLevel <= targetLevel; nextLevel++) {
      handleLevelUnlocks(nextLevel, state);
      const msg = `🎉 Level Up! You reached Level ${nextLevel}`;
      if (typeof showToast === 'function') {
        showToast(msg);
      } else {
        alert(msg);
      }
    }
    state.level = targetLevel;
    triggerAvatarReaction('levelup');
  }

  saveState(state);

  if (typeof updateLevelUI === 'function') updateLevelUI(state);
  if (typeof updateRewardsUI === 'function') updateRewardsUI(state);

  return targetLevel > previousLevel;
}

function updateLevelUI(state) {
  if (!state) state = loadState();
  const currentPoints = state.points || 0;
  const level = Math.floor(currentPoints / 50) + 1;
  const xpBar = document.getElementById('xpBar');
  const lvlEl = document.getElementById('level');

  if (lvlEl) lvlEl.textContent = level;
  if (xpBar) {
    const pct = Math.min(100, Math.floor((currentPoints % 50) / 50 * 100));
    xpBar.style.width = pct + '%';
  }
  if (typeof updateAvatarUnlockState === 'function') {
    updateAvatarUnlockState(state);
  }
}
function checkBranchUnlock(branch, state) {
  state.unlockedBranches = state.unlockedBranches || [];
  if (!state.unlockedBranches.includes(branch) && (state.affinity[branch] || 0) >= 5) {
    state.unlockedBranches.push(branch);
    showToast(`New branch unlocked: ${branch}`);
  }
}

function handleLevelUnlocks(level, state) {
  state.ownedOutfits = state.ownedOutfits || [];
  if (level === 3 && !state.ownedOutfits.includes('knight')) {
    state.ownedOutfits.push('knight');
    showToast('You unlocked the Knight outfit!');
  }
}
