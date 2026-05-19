import { auth, signInWithEmailAndPassword } from "./firebase-init.js";

const emailInput = document.getElementById("signinEmail");
const passwordInput = document.getElementById("signinPassword");
const message = document.getElementById("signinMessage");

document.getElementById("signinBtn").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    message.textContent = "Please enter email and password";
    message.style.color = "red";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);

    message.textContent = "Signed in successfully!";
    message.style.color = "green";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);

  } catch (error) {
    message.textContent = error.message;
    message.style.color = "red";
  }
});
