if (!getToken()) window.location.href = "login.html";

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

const box = document.getElementById("message");
function showMessage(text, type) {
  box.textContent = text;
  box.className = "alert py-2 alert-" + type;
}

const fields = ["target_role", "experience_years", "education",
                "field_of_study", "skills", "certifications", "summary"];

function fillForm(p) {
  fields.forEach((id) => {
    let value = p[id];
    if (Array.isArray(value)) value = value.join(", ");
    document.getElementById(id).value = value ?? "";
  });
}

async function loadProfile() {
  try {
    const data = await apiFetch("/profile");
    if (data && data.profile) fillForm(data.profile);
  } catch (err) {
    showMessage(err.message, "danger");
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  const payload = {};
  fields.forEach((id) => (payload[id] = document.getElementById(id).value));
  try {
    const data = await apiFetch("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    fillForm(data.profile);
    showMessage("Profile saved.", "success");
  } catch (err) {
    showMessage(err.message, "danger");
  }
  btn.disabled = false;
});

loadProfile();