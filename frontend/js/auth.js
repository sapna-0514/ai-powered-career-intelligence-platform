const messageBox = document.getElementById("message");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "alert py-2 alert-" + type;
}

if (getToken() && location.pathname.endsWith("login.html")) {
  window.location.href = "dashboard.html";
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        }),
      });
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "dashboard.html";
    } catch (err) {
      showMessage(err.message, "danger");
      btn.disabled = false;
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    try {
      const data = await apiFetch("/signup", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value,
        }),
      });
      showMessage(data.message, "success");
      setTimeout(() => (window.location.href = "login.html"), 1200);
    } catch (err) {
      showMessage(err.message, "danger");
      btn.disabled = false;
    }
  });
}