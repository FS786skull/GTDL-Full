/* crafting.js — simple outfit crafting */

function hasResources(state, requires) {
  state.resources = state.resources || {};
  for (const k in requires) {
    if ((state.resources[k] || 0) < requires[k]) return false;
  }
  return true;
}

function spendResources(state, requires) {
  state.resources = state.resources || {};
  for (const k in requires) {
    state.resources[k] = (state.resources[k] || 0) - requires[k];
  }
}

function craftOutfit(recipeId) {
  const recipes = JSON.parse(localStorage.getItem('recipes') || '{}');
  const recipe = recipes[recipeId];
  if (!recipe) {
    showToast('Unknown recipe');
    return;
  }

  const state = loadState();
  if (!hasResources(state, recipe.requires)) {
    showToast('Not enough resources to craft');
    return;
  }

  spendResources(state, recipe.requires);

  // Super rare chance to get a ribbon when crafting explorer outfit
  if (recipeId === 'explorer_set' && Math.random() < 0.01) {
    state.resources = state.resources || {};
    state.resources['ribbon'] = (state.resources['ribbon'] || 0) + 1;
    showToast('Super rare! You also got a ribbon!');
  }

  state.ownedOutfits = state.ownedOutfits || [];
  if (!state.ownedOutfits.includes('explorer')) {
    state.ownedOutfits.push('explorer');
  }

  state.currentOutfit = 'explorer';
  saveState(state);
  updateRewardsUI(state);
  updateAvatarVisuals(state);
  triggerAvatarReaction('craft');
  showToast('Crafted Explorer outfit!');
}
