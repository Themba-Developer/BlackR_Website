(function () {
  const config = window.BLACKR_CONFIG || {};
  const form = document.querySelector("[data-onboarding-form]");
  if (!form) return;

  const type = form.dataset.onboardingForm;
  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector("button[type='submit']");
  let startedAt = Date.now();
  let turnstileToken = "";
  let turnstileWidgetId = null;

  function setStatus(message, kind) {
    status.textContent = message;
    status.className = "form-status";
    if (kind) status.classList.add(`is-${kind}`);
  }

  function isConfigured() {
    return (
      config.apiBase &&
      config.turnstileSiteKey &&
      !config.turnstileSiteKey.includes("REPLACE_WITH_")
    );
  }

  function value(name) {
    return form.elements[name]?.value?.trim() || "";
  }

  function selectedValues(name) {
    return [...form.querySelectorAll(`[name='${name}']:checked`)].map((field) => field.value);
  }

  function schoolPayload() {
    const grades = [...form.querySelectorAll("[data-grade-row]")].map((row) => ({
      grade: row.dataset.grade,
      boys: Number(row.querySelector("[data-boys]").value || 0),
      girls: Number(row.querySelector("[data-girls]").value || 0),
    }));

    return {
      school_name: value("school_name"),
      emis_number: value("emis_number"),
      street_address: value("street_address"),
      city: value("city"),
      province: value("province"),
      postal_code: value("postal_code"),
      district: value("district"),
      circuit_name: value("circuit_name"),
      principal_title: value("principal_title"),
      principal_first_name: value("principal_first_name"),
      principal_surname: value("principal_surname"),
      principal_phone: value("principal_phone"),
      principal_email: value("principal_email"),
      sgb_title: value("sgb_title"),
      sgb_first_name: value("sgb_first_name"),
      sgb_surname: value("sgb_surname"),
      sgb_phone: value("sgb_phone"),
      sgb_email: value("sgb_email"),
      grade_range: value("grade_range"),
      grades,
      total_enrollment: grades.reduce((total, grade) => total + grade.boys + grade.girls, 0),
      academic_year: value("academic_year"),
      uniform_options: selectedValues("uniform_options"),
      consent: form.elements.consent.checked,
    };
  }

  function parentPayload() {
    return {
      first_name: value("first_name"),
      surname: value("surname"),
      street_address: value("street_address"),
      city: value("city"),
      province: value("province"),
      postal_code: value("postal_code"),
      id_number: value("id_number"),
      phone: value("phone"),
      email: value("email"),
      applicant_role: value("applicant_role"),
      consent: form.elements.consent.checked,
    };
  }

  const gradeRanges = {
    "r-7": ["R", "1", "2", "3", "4", "5", "6", "7"],
    "r-9": ["R", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    "8-12": ["8", "9", "10", "11", "12"],
  };

  function renderGrades() {
    const grid = form.querySelector("[data-grade-grid]");
    if (!grid) return;
    const grades = gradeRanges[value("grade_range")] || [];
    grid.replaceChildren();

    grades.forEach((grade) => {
      const row = document.createElement("div");
      row.className = "grade-row";
      row.dataset.gradeRow = "";
      row.dataset.grade = grade;

      const label = document.createElement("label");
      label.textContent = `Grade ${grade}`;

      const boys = document.createElement("input");
      boys.type = "number";
      boys.min = "0";
      boys.max = "10000";
      boys.step = "1";
      boys.inputMode = "numeric";
      boys.placeholder = "0";
      boys.dataset.boys = "";
      boys.setAttribute("aria-label", `Number of boys in Grade ${grade}`);

      const girls = document.createElement("input");
      girls.type = "number";
      girls.min = "0";
      girls.max = "10000";
      girls.step = "1";
      girls.inputMode = "numeric";
      girls.placeholder = "0";
      girls.dataset.girls = "";
      girls.setAttribute("aria-label", `Number of girls in Grade ${grade}`);

      row.append(label, boys, girls);
      grid.append(row);
    });

    updateTotal();
  }

  function updateTotal() {
    const totalField = form.elements.total_enrollment;
    if (!totalField) return;
    totalField.value = [...form.querySelectorAll("[data-boys], [data-girls]")].reduce(
      (sum, input) => sum + Number(input.value || 0),
      0,
    );
  }

  function renderTurnstile() {
    const container = form.querySelector("[data-turnstile]");
    if (!container || !isConfigured()) return;
    if (!window.turnstile) {
      setStatus("The security check could not load. Refresh the page and try again.", "error");
      return;
    }
    window.turnstile.ready(() => {
      turnstileWidgetId = window.turnstile.render(container, {
        sitekey: config.turnstileSiteKey,
        action: "onboarding",
        theme: "dark",
        callback(token) {
          turnstileToken = token;
          if (status.textContent.includes("security check")) setStatus("", "");
        },
        "expired-callback"() {
          turnstileToken = "";
        },
        "error-callback"() {
          turnstileToken = "";
          setStatus("The security check could not be completed. Please try again.", "error");
        },
      });
    });
  }

  function resetTurnstile() {
    turnstileToken = "";
    if (window.turnstile && turnstileWidgetId !== null) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  function selectedFiles() {
    const maximumSize = 8 * 1024 * 1024;
    const files = [];
    form.querySelectorAll("input[type='file']").forEach((input) => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > maximumSize) {
        throw new Error(`${file.name} is larger than the 8 MB upload limit.`);
      }
      files.push({field: input.name, file});
    });
    return files;
  }

  form.elements.grade_range?.addEventListener("change", renderGrades);
  form.querySelector("[data-grade-grid]")?.addEventListener("input", updateTotal);
  renderGrades();
  renderTurnstile();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("", "");

    if (!form.reportValidity()) return;
    if (!isConfigured()) {
      setStatus("The secure form service is being connected. Please try again shortly.", "error");
      return;
    }
    if (!turnstileToken) {
      setStatus("Please complete the security check before submitting.", "error");
      return;
    }

    try {
      const files = selectedFiles();
      submitButton.disabled = true;
      submitButton.textContent = "Submitting securely…";
      const requestBody = new FormData();
      requestBody.set("type", type);
      requestBody.set("payload", JSON.stringify(type === "school" ? schoolPayload() : parentPayload()));
      requestBody.set("website", value("website"));
      requestBody.set("started_at", String(startedAt));
      requestBody.set("turnstile_token", turnstileToken);
      files.forEach(({field, file}) => requestBody.set(field, file, file.name));

      const response = await fetch(`${config.apiBase.replace(/\/$/, "")}/submit`, {
        method: "POST",
        body: requestBody,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your form could not be submitted.");

      form.reset();
      startedAt = Date.now();
      renderGrades();
      setStatus(`Thank you. Your application reference is ${result.reference}. Keep this number for your records.`, "success");
      status.scrollIntoView({behavior: "smooth", block: "center"});
    } catch (error) {
      setStatus(error.message || "An unexpected error occurred. Please try again.", "error");
    } finally {
      resetTurnstile();
      submitButton.disabled = false;
      submitButton.textContent = "Submit application";
    }
  });
})();
