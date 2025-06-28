// src/utils/ensureAuth.js
export function ensureAuth() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if (!token || !user) {
    // Clear everything
    localStorage.clear();
    // Broadcast logout (so redux slices reset)
    window.dispatchEvent(new CustomEvent("auth:logout"));
    // Redirect to login (or homepage)
    window.location.href = "/admin/login";
  }
}
