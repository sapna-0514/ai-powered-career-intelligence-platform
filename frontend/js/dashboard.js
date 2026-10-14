// Guard: no token means go to login
if (!getToken()) window.location.href = "login.html";

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

function renderPaths(paths) {
  const box = document.getElementById("paths");
  box.innerHTML = "";
  paths.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "mt-3";

    const head = document.createElement("div");
    head.className = "d-flex justify-content-between";
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${p.name}`;
    const pct = document.createElement("span");
    pct.textContent = `${p.match}% match`;
    head.append(title, pct);

    const progress = document.createElement("div");
    progress.className = "progress";
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = p.match + "%";
    progress.appendChild(bar);

    row.append(head, progress);
    box.appendChild(row);
  });
}

async function loadDashboard() {
  try {
    const d = await apiFetch("/dashboard");
    if (!d) return;

    if (!d.has_profile) {
      document.getElementById("profileBanner").classList.remove("d-none");
    }

    document.getElementById("welcome").textContent =
      "Welcome back, " + d.user.name.split(" ")[0];
    document.getElementById("avatar").textContent =
      d.user.name.charAt(0).toUpperCase();

    document.getElementById("score").textContent = d.score + "%";
    document.getElementById("ring").style.setProperty("--p", d.score);

    document.getElementById("skills").textContent = d.skills;
    document.getElementById("skillsChange").textContent = d.skills_change;
    document.getElementById("certs").textContent = d.certs;
    document.getElementById("certsChange").textContent = d.certs_change;

    renderPaths(d.paths);

    document.getElementById("driveCompany").textContent = d.drive.company;
    document.getElementById("driveRole").textContent = d.drive.role;
  } catch (err) {
    const box = document.getElementById("error");
    box.textContent = "Could not load dashboard: " + err.message;
    box.classList.remove("d-none");
  }
}

loadDashboard();