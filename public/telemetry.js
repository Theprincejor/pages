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

  function inferPage() {
    const root = document.querySelector("[data-page]");
    if (root && root.getAttribute("data-page")) return root.getAttribute("data-page");
    const p = (location && location.pathname) ? location.pathname : "";
    return p ? p.replace(/^\//, "") : (document.title || "demo");
  }

  async function logEvent(payload) {
    try {
      const body = {
        page: payload.page || inferPage(),
        action: payload.action,
        result: payload.result,
        demoUserId: getOrCreateDemoUserId(),
        email: payload.email || ""
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

  window.demoTelemetry = {
    log: logEvent
  };
})();

