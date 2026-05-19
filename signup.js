import { auth, createUserWithEmailAndPassword } from "./firebase-init.js";
import { db } from "./firebase-init.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const emailInput = document.getElementById("signupEmail");
const passwordInput = document.getElementById("signupPassword");
const confirmInput = document.getElementById("signupConfirm");
const message = document.getElementById("signupMessage");

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirm = confirmInput.value.trim();

  if (!email || !password) {
    message.textContent = "Please enter email and password";
    message.style.color = "red";
    return;
  }

  if (password !== confirm) {
    message.textContent = "Passwords do not match";
    message.style.color = "red";
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create Firestore profile
    await setDoc(doc(db, "users", user.uid), {
      points: 0,
      level: 1,
      currentOutfit: "Default",
      ownedOutfits: [],
      ownedItems: []
    });

    message.textContent = "Account created successfully!";
    message.style.color = "green";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);

  } catch (error) {
    message.textContent = error.message;
    message.style.color = "red";
  }
});
