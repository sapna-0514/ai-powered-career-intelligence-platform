if (!getToken()) window.location.href = "login.html";

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

const box = document.getElementById("message");

function showError(text) {
  box.textContent = text;
  box.className = "alert alert-warning";
}

function render(careers) {
  const list = document.getElementById("careers");
  list.innerHTML = "";
  careers.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "mt-3";

    const head = document.createElement("div");
    head.className = "d-flex justify-content-between";
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${c.name}`;
    const pct = document.createElement("span");
    pct.textContent = `${c.confidence}%`;
    head.append(title, pct);

    const progress = document.createElement("div");
    progress.className = "progress";
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = Math.min(100, c.confidence) + "%";
    progress.appendChild(bar);

    row.append(head, progress);
    list.appendChild(row);
  });
}

(async function load() {
  try {
    const data = await apiFetch("/predict");
    if (data) render(data.careers);
  } catch (err) {
    showError(err.message);
  }
})();