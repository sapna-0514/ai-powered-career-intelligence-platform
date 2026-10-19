function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// One helper for every API call. It adds the token automatically.
async function apiFetch(path, options = {}) {
  const headers = {};
  // For file uploads (FormData) the browser sets the content type itself.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(API_URL + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token) {   // token expired or invalid
    logout();
    return;
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}