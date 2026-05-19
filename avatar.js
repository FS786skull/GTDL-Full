/* ============================================================
   avatar.js — hopefully it works, if not, FUCKA
   ============================================================ */

window.avatar = {};

/* ---------------------------
   Update Avatar Visuals
----------------------------*/
window.avatar.updateAvatarVisuals = function () {
  if (typeof loadState !== "function") return;
  const s = loadState();

  const svg = document.getElementById("avatarSVG");
  if (!svg) return;

  /* 1. Outfit class */
  const outfits = ["blue", "red", "purple", "ninja", "knight", "explorer"];
  outfits.forEach(o => svg.classList.remove(o));

  const outfit = s.currentOutfit || s.avatarCustomization.style || null;
  if (outfit && outfits.includes(outfit)) {
    svg.classList.add(outfit);
  }
  /* 5. Aura Glow */
  const wrapper = document.querySelector('.avatar-wrapper');
  if (wrapper) {
    if (s.avatarCustomization.options.glow) {
      wrapper.classList.add('glow-on');
    } else {
      wrapper.classList.remove('glow-on');
    }
  }


  /* 2. CSS Variables */
  svg.style.setProperty("--skin", s.avatarCustomization.skin);
  svg.style.setProperty("--hat", s.avatarCustomization.hat);
  svg.style.setProperty("--shirt-top", s.avatarCustomization.shirtTop);
  svg.style.setProperty("--shirt-bottom", s.avatarCustomization.shirtBottom);
  svg.style.setProperty("--pants-top", s.avatarCustomization.pantsTop);
  svg.style.setProperty("--pants-bottom", s.avatarCustomization.pantsBottom);

  /* 3. Badge */
  const badge = svg.querySelector("#badge");
  if (badge) {
    const shape = s.avatarCustomization.options.badgeShape || "circle";
    window.avatar.setBadgeShape(shape);

    badge.style.display = s.avatarCustomization.options.badge
      ? "block"
      : "none";
  }

  /* 4. Eye style */
  const eyes = svg.querySelectorAll(".eye");
  if (eyes) {
    const style = s.avatarCustomization.eyeStyle || "normal";

    eyes.forEach(e => {
      e.classList.remove("eye-normal", "eye-bright", "eye-tech");
      e.classList.add("eye-" + style);
    });
  }
};

/* 
   Badge Shape Rendering
*/
window.avatar.setBadgeShape = function (shape) {
  const svg = document.getElementById("avatarSVG");
  if (!svg) return;

  const badge = svg.querySelector("#badge");
  if (!badge) return;

  while (badge.firstChild) badge.removeChild(badge.firstChild);

  const ns = "http://www.w3.org/2000/svg";

  const fill = "#ffd54f";
  const stroke = "#b8860b";

  if (shape === "circle") {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "90");
    c.setAttribute("cy", "92");
    c.setAttribute("r", "6");
    c.setAttribute("fill", fill);
    c.setAttribute("stroke", stroke);
    badge.appendChild(c);

  } else if (shape === "star") {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M90 82 L93 92 L104 92 L95 98 L98 108 L90 102 L82 108 L85 98 L76 92 L87 92 Z");
    p.setAttribute("fill", fill);
    p.setAttribute("stroke", stroke);
    badge.appendChild(p);

  } else if (shape === "shield") {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", "M90 82 L98 86 L98 96 Q90 104 82 96 L82 86 Z");
    p.setAttribute("fill", fill);
    p.setAttribute("stroke", stroke);
    badge.appendChild(p);

  } else if (shape === "hex") {
    const p = document.createElementNS(ns, "polygon");
    p.setAttribute("points", "86,88 94,88 98,92 94,96 86,96 82,92");
    p.setAttribute("fill", fill);
    p.setAttribute("stroke", stroke);
    badge.appendChild(p);
  }
};

/* ---------------------------
   Toggle Badge Visibility
----------------------------*/
window.avatar.toggleBadge = function (show) {
  const svg = document.getElementById("avatarSVG");
  if (!svg) return;

  const badge = svg.querySelector("#badge");
  if (badge) badge.style.display = show ? "block" : "none";
};

/* ---------------------------
   Expressions
----------------------------*/
window.avatar.setExpression = function (expr) {
  const mouth = document.getElementById("mouth");
  if (!mouth) return;

  if (expr === "happy") {
    mouth.setAttribute("d", "M48 48 Q60 60 72 48");
  } else if (expr === "focused") {
    mouth.setAttribute("d", "M48 52 Q60 48 72 52");
  } else {
    mouth.setAttribute("d", "M48 48 Q60 56 72 48");
  }
};

/* ---------------------------
   Jump Animation
----------------------------*/
window.avatar.playJump = function () {
  const svg = document.getElementById("avatarSVG");
  if (!svg) return;

  svg.classList.add("jump");
  setTimeout(() => svg.classList.remove("jump"), 600);
};

/* ---------------------------
   Initial Render
----------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  window.avatar.updateAvatarVisuals();
});

