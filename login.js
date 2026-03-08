// Future Self — Login Page Logic

(function () {
  var tabSignup = document.getElementById("tab-signup");
  var tabLogin = document.getElementById("tab-login");
  var formSignup = document.getElementById("form-signup");
  var formLogin = document.getElementById("form-login");

  // Tab switching
  tabSignup.addEventListener("click", function () {
    tabSignup.classList.add("fs-active");
    tabLogin.classList.remove("fs-active");
    formSignup.classList.add("fs-active");
    formLogin.classList.remove("fs-active");
  });

  tabLogin.addEventListener("click", function () {
    tabLogin.classList.add("fs-active");
    tabSignup.classList.remove("fs-active");
    formLogin.classList.add("fs-active");
    formSignup.classList.remove("fs-active");
  });

  // Sign Up
  document.getElementById("btn-signup").addEventListener("click", async function () {
    var btn = this;
    var email = document.getElementById("signup-email").value.trim();
    var password = document.getElementById("signup-password").value;
    var errorEl = document.getElementById("signup-error");
    var successEl = document.getElementById("signup-success");

    errorEl.classList.remove("fs-visible");
    successEl.classList.remove("fs-visible");

    if (!email || !password) {
      showError(errorEl, "Please enter both email and password.");
      return;
    }
    if (password.length < 6) {
      showError(errorEl, "Password must be at least 6 characters.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
      var data = await SupabaseAuth.signUp(email, password);

      if (data.access_token) {
        // Signed up and logged in immediately
        window.location.href = chrome.runtime.getURL("options.html");
      } else {
        // Email confirmation required
        successEl.textContent = "Check your email to confirm your account, then log in.";
        successEl.classList.add("fs-visible");
        btn.textContent = "Start Free Trial — 24 Hours Free";
        btn.disabled = false;
      }
    } catch (e) {
      showError(errorEl, e.message);
      btn.textContent = "Start Free Trial — 24 Hours Free";
      btn.disabled = false;
    }
  });

  // Log In
  document.getElementById("btn-login").addEventListener("click", async function () {
    var btn = this;
    var email = document.getElementById("login-email").value.trim();
    var password = document.getElementById("login-password").value;
    var errorEl = document.getElementById("login-error");

    errorEl.classList.remove("fs-visible");

    if (!email || !password) {
      showError(errorEl, "Please enter both email and password.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Logging in...";

    try {
      await SupabaseAuth.signIn(email, password);
      var status = await SupabaseAuth.checkAuthStatus();

      if (status.isPaid || status.isTrialActive) {
        window.location.href = chrome.runtime.getURL("options.html");
      } else {
        // Trial expired, not paid — show upgrade
        window.location.href = chrome.runtime.getURL("upgrade.html");
      }
    } catch (e) {
      showError(errorEl, e.message);
      btn.textContent = "Log In";
      btn.disabled = false;
    }
  });

  // Enter key support
  document.getElementById("signup-password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-signup").click();
  });
  document.getElementById("login-password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-login").click();
  });

  // Forgot Password
  document.getElementById("forgot-toggle").addEventListener("click", function () {
    var section = document.getElementById("forgot-section");
    section.classList.toggle("fs-visible");
    if (section.classList.contains("fs-visible")) {
      document.getElementById("forgot-email").focus();
    }
  });

  document.getElementById("btn-forgot").addEventListener("click", async function () {
    var btn = this;
    var email = document.getElementById("forgot-email").value.trim();
    var errorEl = document.getElementById("forgot-error");
    var successEl = document.getElementById("forgot-success");

    errorEl.classList.remove("fs-visible");
    successEl.classList.remove("fs-visible");

    if (!email) {
      showError(errorEl, "Please enter your email address.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      await SupabaseAuth.resetPassword(email);
      successEl.textContent = "Check your email for a reset link.";
      successEl.classList.add("fs-visible");
    } catch (e) {
      showError(errorEl, e.message);
    }

    btn.textContent = "Send Reset Link";
    btn.disabled = false;
  });

  document.getElementById("forgot-email").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btn-forgot").click();
  });

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.add("fs-visible");
  }
})();
