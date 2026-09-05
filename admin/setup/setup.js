const form = document.querySelector("[data-password-form]");
const status = document.querySelector("[data-setup-status]");
const success = document.querySelector("[data-setup-success]");
const parameters = new URLSearchParams(window.location.search);
const token = parameters.get("token") || "";

if (token) {
  window.history.replaceState({}, document.title, window.location.pathname);
} else {
  status.textContent = "This password setup link is incomplete. Please use the full private link you received.";
  form.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const password = form.elements.password.value;
  if (password !== form.elements.confirm_password.value) {
    status.textContent = "The two passwords do not match.";
    return;
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  status.textContent = "Creating your password…";
  try {
    const response = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({token, password}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Your password could not be created.");
    form.reset();
    form.hidden = true;
    status.textContent = "";
    success.hidden = false;
  } catch (error) {
    status.textContent = error.message || "Your password could not be created.";
  } finally {
    button.disabled = false;
  }
});
