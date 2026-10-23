if (!getToken()) window.location.href = "login.html";

document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

const box = document.getElementById("message");
function showMessage(text, type) {
  box.textContent = text;
  box.className = "alert alert-" + type;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function chips(container, items, cls) {
  container.innerHTML = "";
  items.forEach((s) => container.appendChild(el("span", "badge " + cls + " me-1 mb-1", s)));
}

function renderFacts(p) {
  const bits = [];
  bits.push("Education: " + (p.education || "not found"));
  if (p.field_of_study) bits.push("Field: " + p.field_of_study);
  bits.push("Experience stated: " + (p.experience_years ? p.experience_years + " years" : "not found"));
  if (p.roles && p.roles.length) bits.push("Job titles: " + p.roles.join(", "));
  if (p.certifications && p.certifications.length) bits.push("Certifications: " + p.certifications.join("; "));
  document.getElementById("facts").textContent = bits.join("  |  ");

  const skills = document.getElementById("skills");
  if (p.skills.length) chips(skills, p.skills, "text-bg-primary");
  else skills.textContent = "No skills from our skill list were found.";
}

function renderCareers(careers) {
  const list = document.getElementById("careers");
  list.innerHTML = "";
  careers.forEach((c, i) => {
    const row = el("div", "mt-3");
    const head = el("div", "d-flex justify-content-between");
    head.append(el("strong", "", `${i + 1}. ${c.name}`), el("span", "", c.confidence + "%"));
    const progress = el("div", "progress");
    const bar = el("div", "progress-bar");
    bar.style.width = Math.min(100, c.confidence) + "%";
    progress.appendChild(bar);
    row.append(head, progress);
    list.appendChild(row);
  });
}

function renderGap(gap, name) {
  const box = document.getElementById("gap");
  box.innerHTML = "";
  if (!gap.has_data) {
    box.appendChild(el("p", "text-muted mb-0",
      `Not enough skill data for ${name}. Our skill list is mostly technical, so non-technical careers have little to compare.`));
    return;
  }
  box.appendChild(el("p", "mb-2", `Skill alignment with ${name}: ${gap.alignment}%`));
  const have = el("div", "mb-2");
  have.appendChild(el("small", "text-muted d-block", "Skills you already have"));
  if (gap.have.length) chips(have.appendChild(el("div")), gap.have, "text-bg-success");
  else have.appendChild(el("div", "", "None of the typical skills were found."));
  box.appendChild(have);

  const miss = el("div");
  miss.appendChild(el("small", "text-muted d-block", "Skills to add (% of resumes in this career that list them)"));
  if (gap.missing.length) {
    chips(miss.appendChild(el("div")), gap.missing.map((m) => `${m.skill} ${m.share}%`), "text-bg-warning");
  } else {
    miss.appendChild(el("div", "", "Nothing missing from the typical list."));
  }
  box.appendChild(miss);
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const file = document.getElementById("resumeFile").files[0];
  if (!file) {
    showMessage("Choose a PDF or DOCX file first.", "warning");
    return;
  }
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = true;
  btn.textContent = "Analyzing...";
  box.className = "alert d-none";

  const form = new FormData();
  form.append("resume", file);

  try {
    const data = await apiFetch("/resume/analyze", { method: "POST", body: form });
    if (!data) return;

    renderFacts(data.parsed);
    renderCareers(data.careers);

    const select = document.getElementById("gapSelect");
    select.innerHTML = "";
    data.careers.forEach((c) => {
      const opt = el("option", "", c.name);
      opt.value = c.key;
      select.appendChild(opt);
    });
    const show = () => {
      const c = data.careers.find((x) => x.key === select.value);
      renderGap(data.gaps[select.value], c.name);
    };
    select.onchange = show;
    show();

    const tips = document.getElementById("tips");
    tips.innerHTML = "";
    (data.tips.length ? data.tips : ["No obvious issues found."]).forEach((t) =>
      tips.appendChild(el("li", "", t)));

    document.getElementById("results").classList.remove("d-none");
  } catch (err) {
    showMessage(err.message, "danger");
  }
  btn.disabled = false;
  btn.textContent = "Analyze resume";
});