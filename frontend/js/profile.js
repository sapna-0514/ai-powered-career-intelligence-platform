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
// ---- Resume upload ----
function mergeList(current, extra) {
  const items = current.split(",").map((s) => s.trim()).filter(Boolean);
  const seen = new Set(items.map((s) => s.toLowerCase()));
  extra.forEach((s) => {
    if (!seen.has(s.toLowerCase())) {
      seen.add(s.toLowerCase());
      items.push(s);
    }
  });
  return items.join(", ");
}

document.getElementById("parseBtn").addEventListener("click", async () => {
  const file = document.getElementById("resumeFile").files[0];
  if (!file) {
    showMessage("Choose a PDF or DOCX file first.", "warning");
    return;
  }
  const btn = document.getElementById("parseBtn");
  btn.disabled = true;
  btn.textContent = "Reading...";

  const form = new FormData();
  form.append("resume", file);

  try {
    const data = await apiFetch("/resume/parse", { method: "POST", body: form });
    const p = data.parsed;

    const skillsBox = document.getElementById("skills");
    skillsBox.value = mergeList(skillsBox.value, p.skills);
    const certBox = document.getElementById("certifications");
    certBox.value = mergeList(certBox.value, p.certifications);

    if (p.education) document.getElementById("education").value = p.education;
    if (p.field_of_study) document.getElementById("field_of_study").value = p.field_of_study;
    if (p.experience_years) document.getElementById("experience_years").value = p.experience_years;

       const roles = p.roles && p.roles.length ? ` Job titles spotted: ${p.roles.join(", ")}.` : "";
    showMessage(
      `Found ${p.skills.length} skills.${roles} Check the form, then click Save profile.`,
      "info"
    );
  } catch (err) {
    showMessage(err.message, "danger");
  }
  btn.disabled = false;
  btn.textContent = "Read resume";
});