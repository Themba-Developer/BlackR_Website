const loginView = document.querySelector("[data-login-view]");
const dashboard = document.querySelector("[data-dashboard]");
const loginStatus = document.querySelector("[data-login-status]");
const retryButton = document.querySelector("[data-access-retry]");
const loginForm = document.querySelector("[data-login-form]");
const recordsBody = document.querySelector("[data-records]");
const recordsMessage = document.querySelector("[data-records-message]");
const dialog = document.querySelector("[data-detail-dialog]");
const state = {user: null, view: "school", school: [], parent: [], selected: null};

async function api(path, options = {}) {
  const response = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      ...(options.body ? {"Content-Type": "application/json"} : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function showLogin(message, {retry = false, form = false, loading = false} = {}) {
  dashboard.hidden = true;
  loginView.hidden = false;
  loginStatus.textContent = message;
  retryButton.hidden = !retry;
  loginForm.hidden = !form;
  document.querySelector(".access-loader").hidden = !loading;
}

function showDashboard() {
  loginView.hidden = true;
  dashboard.hidden = false;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {dateStyle: "medium", timeStyle: "short"}).format(date);
}

function display(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

function make(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function currentRecords() {
  return state[state.view];
}

function applicant(record) {
  return state.view === "school"
    ? {name: record.school_name, secondary: record.emis_number}
    : {
        name: [record.first_name, record.surname].filter(Boolean).join(" "),
        secondary: record.applicant_role?.replaceAll("_", " "),
      };
}

function contact(record) {
  return state.view === "school"
    ? {email: record.principal_email, phone: record.principal_phone}
    : {email: record.email, phone: record.phone};
}

function renderStats() {
  const records = currentRecords();
  document.querySelector("[data-stat-total]").textContent = records.length;
  document.querySelector("[data-stat-new]").textContent = records.filter((item) => item.status === "new").length;
  document.querySelector("[data-stat-reviewing]").textContent = records.filter((item) => item.status === "reviewing").length;
  document.querySelector("[data-stat-approved]").textContent = records.filter((item) => item.status === "approved").length;
  document.querySelector("[data-school-count]").textContent = state.school.length;
  document.querySelector("[data-parent-count]").textContent = state.parent.length;
}

function filteredRecords() {
  const search = document.querySelector("[data-search]").value.trim().toLowerCase();
  const status = document.querySelector("[data-status-filter]").value;
  return currentRecords().filter((record) => {
    const matchesStatus = status === "all" || record.status === status;
    const matchesSearch = !search || [
      record.reference,
      applicant(record).name,
      applicant(record).secondary,
      contact(record).email,
      contact(record).phone,
      record.city,
      record.district,
    ].some((item) => String(item || "").toLowerCase().includes(search));
    return matchesStatus && matchesSearch;
  });
}

function renderRecords() {
  const records = filteredRecords();
  recordsBody.replaceChildren();
  recordsMessage.hidden = records.length > 0;
  recordsMessage.textContent = "No applications match the current filters.";

  records.forEach((record) => {
    const row = document.createElement("tr");
    const person = applicant(record);
    const details = contact(record);
    const location = [record.city, record.province || record.district].filter(Boolean).join(", ") || "—";
    const referenceCell = make("td");
    referenceCell.append(make("strong", "", record.reference));
    const personCell = make("td");
    personCell.append(make("strong", "", person.name), make("small", "", display(person.secondary)));
    const contactCell = make("td");
    contactCell.append(make("span", "", display(details.email)), make("small", "", display(details.phone)));
    const statusCell = make("td");
    statusCell.append(make("span", `status-badge status-${record.status}`, record.status));
    const actionCell = make("td");
    const openButton = make("button", "open-record", "→");
    openButton.type = "button";
    openButton.dataset.openId = record.id;
    openButton.setAttribute("aria-label", `Open ${record.reference}`);
    actionCell.append(openButton);
    row.append(
      referenceCell,
      personCell,
      contactCell,
      make("td", "", location),
      make("td", "", formatDate(record.submitted_at)),
      statusCell,
      actionCell,
    );
    recordsBody.append(row);
  });
}

function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelector("[data-view-title]").textContent =
    view === "school" ? "School applications" : "Parent applications";
  renderStats();
  renderRecords();
}

const schoolFields = [
  ["School", "school_name"], ["EMIS number", "emis_number"], ["Status", "status"],
  ["Street address", "street_address", "wide"], ["City", "city"], ["Province", "province"],
  ["Postal code", "postal_code"], ["District", "district"], ["Circuit", "circuit_name"],
  ["Principal", (record) => [record.principal_title, record.principal_first_name, record.principal_surname].filter(Boolean).join(" ")],
  ["Principal phone", "principal_phone"], ["Principal email", "principal_email"],
  ["SGB contact", (record) => [record.sgb_title, record.sgb_first_name, record.sgb_surname].filter(Boolean).join(" ")],
  ["SGB phone", "sgb_phone"], ["SGB email", "sgb_email"],
  ["Grade range", "grade_range"], ["Total enrolment", "total_enrollment"], ["Academic year", "academic_year"],
  ["Uniform options", "uniform_options"],
  ["Grade breakdown", (record) => (record.grades || []).map((grade) => `Grade ${grade.grade}: ${grade.boys} boys, ${grade.girls} girls`).join("\n"), "full"],
  ["Submitted", (record) => formatDate(record.submitted_at)], ["Consent recorded", (record) => formatDate(record.consented_at)],
];

const parentFields = [
  ["Applicant", (record) => [record.first_name, record.surname].filter(Boolean).join(" ")],
  ["Role", (record) => record.applicant_role?.replaceAll("_", " ")], ["Status", "status"],
  ["ID number", "id_number"], ["Phone", "phone"], ["Email", "email"],
  ["Street address", "street_address", "wide"], ["City", "city"], ["Province", "province"],
  ["Postal code", "postal_code"], ["Submitted", (record) => formatDate(record.submitted_at)],
  ["Consent recorded", (record) => formatDate(record.consented_at)],
];

function detailValue(record, source) {
  return typeof source === "function" ? source(record) : record[source];
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openDetails(id) {
  const record = currentRecords().find((item) => item.id === id);
  if (!record) return;
  state.selected = record;
  document.querySelector("[data-detail-reference]").textContent = record.reference;
  document.querySelector("[data-detail-title]").textContent = applicant(record).name;
  const grid = document.querySelector("[data-detail-grid]");
  grid.replaceChildren();
  (state.view === "school" ? schoolFields : parentFields).forEach(([label, source, width]) => {
    const item = make("div", `detail-item ${width || ""}`.trim());
    item.append(make("span", "", label), make("strong", "", display(detailValue(record, source))));
    grid.append(item);
  });
  const documentList = document.querySelector("[data-document-list]");
  documentList.replaceChildren();
  const documents = Array.isArray(record.documents) ? record.documents : [];
  documents.forEach((document) => {
    const button = make(
      "button",
      "document-button",
      `${document.label}: ${document.name} (${formatBytes(document.size)}) ↓`,
    );
    button.type = "button";
    button.dataset.documentId = document.id;
    documentList.append(button);
  });
  if (!documents.length) {
    documentList.append(make("span", "document-empty", "No supporting documents were attached."));
  }
  document.querySelector("[data-review-status]").value = record.status;
  document.querySelector("[data-admin-notes]").value = record.admin_notes || "";
  document.querySelector("[data-review-status-message]").textContent = "";
  dialog.showModal();
}

async function downloadDocument(documentId, button) {
  if (!state.selected) return;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Preparing secure download…";
  try {
    const response = await fetch(
      `/api/admin/documents/${state.view}/${state.selected.id}/${documentId}`,
    );
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "The document could not be downloaded.");
    }
    const documentMetadata = state.selected.documents.find((item) => item.id === documentId);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = documentMetadata?.name || "document";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    document.querySelector("[data-review-status-message]").textContent =
      error.message || "The document could not be downloaded.";
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function saveReview() {
  if (!state.selected) return;
  const button = document.querySelector("[data-save-review]");
  const message = document.querySelector("[data-review-status-message]");
  button.disabled = true;
  message.textContent = "Saving…";
  try {
    const changes = await api(`/submissions/${state.view}/${state.selected.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: document.querySelector("[data-review-status]").value,
        admin_notes: document.querySelector("[data-admin-notes]").value.trim() || null,
      }),
    });
    Object.assign(state.selected, changes);
    message.textContent = "Review saved.";
    renderStats();
    renderRecords();
  } catch (error) {
    message.textContent = error.message || "The review could not be saved.";
  } finally {
    button.disabled = false;
  }
}

async function loadData() {
  recordsMessage.hidden = false;
  recordsMessage.textContent = "Loading applications…";
  try {
    const [school, parent] = await Promise.all([
      api("/submissions?type=school"),
      api("/submissions?type=parent"),
    ]);
    state.school = school.records;
    state.parent = parent.records;
    renderStats();
    renderRecords();
  } catch (error) {
    recordsMessage.hidden = false;
    recordsMessage.textContent = error.message || "Applications could not be loaded.";
  }
}

async function bootstrap() {
  showLogin("Verifying secure access…", {loading: true});
  try {
    const profile = await api("/session");
    state.user = profile;
    document.querySelector("[data-user-name]").textContent = profile.display_name || "Administrator";
    document.querySelector("[data-user-email]").textContent = profile.email;
    document.querySelector("[data-user-avatar]").textContent = (profile.display_name || profile.email || "A").charAt(0).toUpperCase();
    showDashboard();
    await loadData();
  } catch (error) {
    if (error.status === 401) {
      showLogin("Sign in with the authorized Black R administrator account.", {form: true});
    } else {
      showLogin(error.message || "Administrator access could not be verified.", {retry: true});
    }
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!loginForm.reportValidity()) return;
  const button = loginForm.querySelector("button[type='submit']");
  button.disabled = true;
  loginStatus.textContent = "Signing in securely…";
  try {
    await api("/login", {
      method: "POST",
      body: JSON.stringify({
        email: loginForm.elements.email.value.trim(),
        password: loginForm.elements.password.value,
      }),
    });
    loginForm.elements.password.value = "";
    await bootstrap();
  } catch (error) {
    loginStatus.textContent = error.message || "Sign-in failed. Please try again.";
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
document.querySelector("[data-search]").addEventListener("input", renderRecords);
document.querySelector("[data-status-filter]").addEventListener("change", renderRecords);
document.querySelector("[data-refresh]").addEventListener("click", loadData);
document.querySelector("[data-sign-out]").addEventListener("click", async () => {
  try {
    await api("/logout", {method: "POST"});
  } finally {
    window.location.reload();
  }
});
retryButton.addEventListener("click", bootstrap);
recordsBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-id]");
  if (button) openDetails(button.dataset.openId);
});
document.querySelector("[data-document-list]").addEventListener("click", (event) => {
  const button = event.target.closest("[data-document-id]");
  if (button) downloadDocument(button.dataset.documentId, button);
});
document.querySelector("[data-dialog-close]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelector("[data-save-review]").addEventListener("click", saveReview);

bootstrap();
