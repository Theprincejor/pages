(function () {
  function getOrCreateDemoUserId() {
    const key = "demoUserId";
    let v = localStorage.getItem(key);
    if (!v) {
      v = "demo_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
      localStorage.setItem(key, v);
    }
    return v;
  }

  async function logEvent(payload) {
    try {
      const body = {
        page: payload.page,
        action: payload.action,
        result: payload.result,
        demoUserId: getOrCreateDemoUserId(),
        email: payload.email
      };
      await fetch("/api/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (_e) {
      // best effort
    }
  }

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function wireFlow() {
    const root = document.querySelector("[data-demo-flow]");
    if (!root) return;

    const page = root.getAttribute("data-page") || "demo";
    const stepIdentifier = root.querySelector("[data-step='identifier']");
    const stepPassword = root.querySelector("[data-step='password']");
    const stepMfa = root.querySelector("[data-step='mfa']");
    const stepSuccess = root.querySelector("[data-step='success']");

    const identifierInput = root.querySelector("input[name='identifier']");
    const passwordInput = root.querySelector("input[name='password']");
    const codeInput = root.querySelector("input[name='code']");

    const errIdentifier = root.querySelector("[data-error='identifier']");
    const errPassword = root.querySelector("[data-error='password']");
    const errMfa = root.querySelector("[data-error='mfa']");

    const btnNext = root.querySelector("[data-action='next']");
    const btnBack = root.querySelector("[data-action='back']");
    const btnSignIn = root.querySelector("[data-action='signin']");
    const btnVerify = root.querySelector("[data-action='verify']");
    const btnRestart = root.querySelector("[data-action='restart']");

    function clearErrors() {
      if (errIdentifier) errIdentifier.textContent = "";
      if (errPassword) errPassword.textContent = "";
      if (errMfa) errMfa.textContent = "";
    }

    function go(which) {
      [stepIdentifier, stepPassword, stepMfa, stepSuccess].forEach((el) => el && hide(el));
      if (which === "identifier" && stepIdentifier) show(stepIdentifier);
      if (which === "password" && stepPassword) show(stepPassword);
      if (which === "mfa" && stepMfa) show(stepMfa);
      if (which === "success" && stepSuccess) show(stepSuccess);
      clearErrors();
      logEvent({ page, action: "step", result: which });
    }

    btnNext?.addEventListener("click", () => {
      clearErrors();
      const v = (identifierInput?.value || "").trim();
      if (!v) {
        if (errIdentifier) errIdentifier.textContent = "Enter a demo identifier to continue.";
        return;
      }
      // Only send/store identifier if it looks like an email (and only after success).
      go("password");
      passwordInput?.focus();
    });

    btnBack?.addEventListener("click", () => go("identifier"));

    btnSignIn?.addEventListener("click", () => {
      clearErrors();
      const v = (passwordInput?.value || "").trim();
      if (!v) {
        if (errPassword) errPassword.textContent = "Enter any demo password to continue.";
        return;
      }
      // Demo: always require a code step to mimic a full flow without real auth.
      go("mfa");
      codeInput?.focus();
    });

    btnVerify?.addEventListener("click", () => {
      clearErrors();
      const v = (codeInput?.value || "").trim();
      if (!/^\d{6}$/.test(v)) {
        if (errMfa) errMfa.textContent = "Enter the 6-digit demo code (any 6 digits).";
        return;
      }
      go("success");
      const identifier = (identifierInput?.value || "").trim();
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) ? identifier : "";
      logEvent({ page, action: "login", result: "success", email });
    });

    btnRestart?.addEventListener("click", () => {
      if (identifierInput) identifierInput.value = "";
      if (passwordInput) passwordInput.value = "";
      if (codeInput) codeInput.value = "";
      go("identifier");
    });

    go("identifier");
  }

  document.addEventListener("DOMContentLoaded", wireFlow);
})();
