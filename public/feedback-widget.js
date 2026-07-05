/*
 * Donna feedback widget — self-contained, dependency-free.
 * Drop on any site:
 *   <script src="https://YOUR-DONNA-HOST/feedback-widget.js"
 *           data-donna-key="fw_pub_xxx" defer></script>
 * The public key is public by design; it only authorizes creating a
 * low-trust feedback item for one workspace. The ingest endpoint is derived
 * from this script's own origin, and it enforces the key + origin allowlist
 * server-side.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;
  var publicKey = script.getAttribute("data-donna-key");
  if (!publicKey) {
    console.warn("[donna] feedback widget: missing data-donna-key");
    return;
  }
  var label = script.getAttribute("data-donna-label") || "Feedback";
  var endpoint = new URL(script.src).origin + "/api/feedback";

  var ACCENT = "#00d4ff";
  var open = false;

  function el(tag, styles, props) {
    var node = document.createElement(tag);
    if (styles) node.style.cssText = styles;
    if (props) Object.keys(props).forEach(function (k) { node[k] = props[k]; });
    return node;
  }

  var launcher = el(
    "button",
    "position:fixed;bottom:20px;right:20px;z-index:2147483000;padding:10px 16px;" +
      "border:none;border-radius:9999px;background:" + ACCENT + ";color:#0a0c10;" +
      "font:600 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.25)",
    { type: "button", textContent: label, ariaLabel: "Open " + label + " form" }
  );

  var panel = el(
    "div",
    "position:fixed;bottom:72px;right:20px;z-index:2147483000;width:320px;max-width:calc(100vw - 40px);" +
      "background:#0f1218;color:#f0f4ff;border:1px solid #1e2a3a;border-radius:12px;padding:16px;" +
      "font:14px system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,0.5);display:none"
  );

  var title = el("div", "font-weight:600;margin-bottom:8px", { textContent: label });
  var textarea = el(
    "textarea",
    "width:100%;box-sizing:border-box;min-height:88px;resize:vertical;padding:8px;border-radius:8px;" +
      "border:1px solid #2a3a52;background:#151a24;color:#f0f4ff;font:14px system-ui,sans-serif",
    { placeholder: "What's on your mind?", maxLength: 5000 }
  );
  var email = el(
    "input",
    "width:100%;box-sizing:border-box;margin-top:8px;padding:8px;border-radius:8px;" +
      "border:1px solid #2a3a52;background:#151a24;color:#f0f4ff;font:14px system-ui,sans-serif",
    { type: "email", placeholder: "Your email (optional)", maxLength: 320 }
  );
  var status = el("div", "min-height:16px;margin-top:8px;font-size:12px;color:#8896b0");
  var send = el(
    "button",
    "margin-top:8px;width:100%;padding:9px;border:none;border-radius:8px;background:" + ACCENT + ";" +
      "color:#0a0c10;font:600 14px system-ui,sans-serif;cursor:pointer",
    { type: "button", textContent: "Send" }
  );

  panel.appendChild(title);
  panel.appendChild(textarea);
  panel.appendChild(email);
  panel.appendChild(send);
  panel.appendChild(status);

  function toggle() {
    open = !open;
    panel.style.display = open ? "block" : "none";
    if (open) textarea.focus();
  }

  launcher.addEventListener("click", toggle);

  send.addEventListener("click", function () {
    var message = textarea.value.trim();
    if (!message) {
      status.textContent = "Please enter a message.";
      return;
    }
    send.disabled = true;
    status.style.color = "#8896b0";
    status.textContent = "Sending…";

    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        publicKey: publicKey,
        message: message,
        email: email.value.trim() || undefined,
        pageUrl: location.href,
      }),
    })
      .then(function (res) {
        if (res.ok) {
          status.style.color = "#00ff9c";
          status.textContent = "Thanks — we got it.";
          textarea.value = "";
          email.value = "";
          setTimeout(function () { if (open) toggle(); status.textContent = ""; }, 1500);
        } else {
          status.style.color = "#ff3860";
          status.textContent = "Could not send. Try again later.";
        }
      })
      .catch(function () {
        status.style.color = "#ff3860";
        status.textContent = "Could not send. Try again later.";
      })
      .finally(function () {
        send.disabled = false;
      });
  });

  function mount() {
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
