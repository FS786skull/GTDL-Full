const page = window.location.pathname.split("/").pop();

if (!localStorage.getItem("loggedInUser")) {
  if (page !== "signin.html" && page !== "signup.html") {
    window.location.href = "signin.html";
  }
}

// Load users or create empty list
let users = JSON.parse(localStorage.getItem("users")) || [];

// Create account
function createAccount() {
  const username = document.getElementById("newUser").value.trim();
  const password = document.getElementById("newPass").value.trim();

  if (!username || !password) {
    alert("Please fill in all fields.");
    return;
  }

  if (users.some(u => u.username === username)) {
    alert("Username already taken.");
    return;
  }

  users.push({ username, password });
  localStorage.setItem("users", JSON.stringify(users));

  alert("Account created! You can now sign in.");
  window.location.href = "signin.html";
}

// Login
function login() {
  let users = JSON.parse(localStorage.getItem("users")) || [];

  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    alert("Incorrect username or password.");
    return;
  }

  localStorage.setItem("loggedInUser", username);

  alert("Welcome back, " + username + "!");
  window.location.href = "index.html";
}

// Logout
function logout() {
  localStorage.removeItem("loggedInUser");
  alert("You have been logged out.");
  window.location.href = "signin.html";
}
