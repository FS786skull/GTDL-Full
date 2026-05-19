// shop.js — shared-state aware shop helpers and purchase functions

function readPoints() {
  if (typeof loadState === 'function') {
    const s = loadState();
    return Number(s && Number.isFinite(Number(s.points)) ? Number(s.points) : 0);
  }
  return parseInt(localStorage.getItem('points') || localStorage.getItem('balance') || '0', 10) || 0;
}

function writePoints(n) {
  const value = Number(n) || 0;
  if (typeof loadState === 'function' && typeof saveState === 'function') {
    const s = loadState();
    s.points = value;
    saveState(s);
  }
  localStorage.setItem('points', String(value));
  localStorage.setItem('balance', String(value));
  const shopPoints = document.getElementById('shopPoints');
  if (shopPoints) shopPoints.textContent = String(value);
  const pointsEl = document.getElementById('points');
  if (pointsEl) pointsEl.textContent = String(value);
}

function getOwnedOutfits() {
  if (typeof loadState === 'function') {
    const s = loadState();
    return Array.isArray(s.ownedOutfits) ? s.ownedOutfits.slice() : [];
  }
  try {
    return JSON.parse(localStorage.getItem('ownedOutfits') || '[]');
  } catch (e) {
    return [];
  }
}

function setOwnedOutfits(arr) {
  const list = Array.isArray(arr) ? arr.slice() : [];
  if (typeof loadState === 'function' && typeof saveState === 'function') {
    const s = loadState();
    s.ownedOutfits = list;
    saveState(s);
  }
  localStorage.setItem('ownedOutfits', JSON.stringify(list));
}

function getOwnedItems() {
  if (typeof loadState === 'function') {
    const s = loadState();
    return Array.isArray(s.ownedItems) ? s.ownedItems.slice() : [];
  }
  try {
    return JSON.parse(localStorage.getItem('ownedItems') || '[]');
  } catch (e) {
    return [];
  }
}

function setOwnedItems(arr) {
  const list = Array.isArray(arr) ? arr.slice() : [];
  if (typeof loadState === 'function' && typeof saveState === 'function') {
    const s = loadState();
    s.ownedItems = list;
    saveState(s);
  }
  localStorage.setItem('ownedItems', JSON.stringify(list));
}

function renderShop() {
  const outfitsGrid = document.getElementById('outfitsGrid');
  const itemsGrid = document.getElementById('itemsGrid');
  if (!outfitsGrid || !itemsGrid) return;

  const ownedOutfits = getOwnedOutfits();
  const ownedItems = getOwnedItems();
  const points = readPoints();
  const shopPointsEl = document.getElementById('shopPoints');
  if (shopPointsEl) shopPointsEl.textContent = String(points);

  outfitsGrid.innerHTML = '';
  if (Array.isArray(window.SHOP_OUTFITS)) {
    window.SHOP_OUTFITS.forEach(o => {
      const owned = ownedOutfits.includes(o.id);
      const affordable = points >= o.price;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <h3>${o.label}</h3>
        <div class="shop-price">${o.price} pts</div>
        <div style="height:72px;display:flex;align-items:center;justify-content:center;">
          <div style="width:72px;height:96px;border-radius:8px;background:linear-gradient(180deg,var(--shirt-top,#e74c3c),var(--shirt-bottom,#c0392b));"></div>
        </div>
        <div style="margin-top:10px;">
          <button ${owned ? 'disabled' : ''} data-id="${o.id}" data-price="${o.price}">
            ${owned ? 'Owned' : (affordable ? 'Buy' : 'Not enough pts')}
          </button>
        </div>
      `;
      outfitsGrid.appendChild(card);
    });
  }

  itemsGrid.innerHTML = '';
  if (Array.isArray(window.SHOP_ITEMS)) {
    window.SHOP_ITEMS.forEach(i => {
      const owned = ownedItems.includes(i.id);
      const affordable = points >= i.price;
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <h3>${i.label}</h3>
        <div class="shop-price">${i.price} pts</div>
        <div style="height:72px;display:flex;align-items:center;justify-content:center;">
          <div style="width:48px;height:48px;border-radius:6px;background:#ffd54f;"></div>
        </div>
        <div style="margin-top:10px;">
          <button ${owned ? 'disabled' : ''} data-id="${i.id}" data-price="${i.price}">
            ${owned ? 'Owned' : (affordable ? 'Buy' : 'Not enough pts')}
          </button>
        </div>
      `;
      itemsGrid.appendChild(card);
    });
  }

  outfitsGrid.querySelectorAll('button').forEach(b => {
    b.removeEventListener('click', outfitButtonHandler);
    b.addEventListener('click', outfitButtonHandler);
  });
  itemsGrid.querySelectorAll('button').forEach(b => {
    b.removeEventListener('click', itemButtonHandler);
    b.addEventListener('click', itemButtonHandler);
  });
}

function outfitButtonHandler(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const price = parseInt(btn.dataset.price, 10) || 0;
  buyOutfit(id, price);
}

function itemButtonHandler(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const price = parseInt(btn.dataset.price, 10) || 0;
  buyItem(id, price);
}

function buyOutfit(outfitId, price) {
  const points = readPoints();
  if (points < price) {
    alert('Not enough points.');
    return;
  }

  const owned = getOwnedOutfits();
  if (owned.includes(outfitId)) {
    alert('You already own this outfit.');
    renderShop();
    return;
  }

  const newPoints = points - price;
  writePoints(newPoints);

  owned.push(outfitId);
  setOwnedOutfits(owned);

  if (typeof loadState === 'function' && typeof saveState === 'function') {
    const s = loadState();
    s.ownedOutfits = Array.isArray(s.ownedOutfits) ? s.ownedOutfits : [];
    if (!s.ownedOutfits.includes(outfitId)) s.ownedOutfits.push(outfitId);
    s.currentOutfit = outfitId;
    saveState(s);
  }

  localStorage.setItem('currentOutfit', outfitId);

  if (typeof updateAvatarVisuals === 'function') updateAvatarVisuals();
  if (typeof updateAvatarBridge === 'function') updateAvatarBridge();

  alert(`Purchased ${outfitId} outfit!`);
  renderShop();
}

function buyItem(itemId, price) {
  const points = readPoints();
  if (points < price) {
    alert('Not enough points.');
    return;
  }

  const owned = getOwnedItems();
  if (owned.includes(itemId)) {
    alert('You already own this item.');
    renderShop();
    return;
  }

  const newPoints = points - price;
  writePoints(newPoints);

  owned.push(itemId);
  setOwnedItems(owned);

  if (typeof loadState === 'function' && typeof saveState === 'function') {
    const s = loadState();
    s.ownedItems = Array.isArray(s.ownedItems) ? s.ownedItems : [];
    if (!s.ownedItems.includes(itemId)) s.ownedItems.push(itemId);
    s.avatarCustomization = s.avatarCustomization || {};
    s.avatarCustomization.options = s.avatarCustomization.options || {};
    if (itemId === 'badge') s.avatarCustomization.options.badge = true;
    saveState(s);
  }

  localStorage.setItem('ownedItems', JSON.stringify(getOwnedItems()));

  if (typeof updateAvatarVisuals === 'function') updateAvatarVisuals();
  if (typeof updateAvatarBridge === 'function') updateAvatarBridge();

  alert(`Purchased ${itemId}!`);
  renderShop();
}

document.addEventListener('DOMContentLoaded', () => {
  renderShop();
});
