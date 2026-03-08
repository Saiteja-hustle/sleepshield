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

  // Google OAuth sign-in (shared handler for both signup and login buttons)
  async function handleGoogleSignIn(errorEl) {
    try {
      var data = await SupabaseAuth.signInWithGoogle();
      var status = await SupabaseAuth.checkAuthStatus();

      if (status.isPaid || status.isTrialActive) {
        window.location.href = chrome.runtime.getURL("options.html");
      } else {
        // New user or expired trial — redirect to options (profile/trial created on first auth)
        window.location.href = chrome.runtime.getURL("options.html");
      }
    } catch (e) {
      showError(errorEl, e.message);
    }
  }

  document.getElementById("btn-google-signup").addEventListener("click", function () {
    var errorEl = document.getElementById("signup-error");
    errorEl.classList.remove("fs-visible");
    this.disabled = true;
    this.textContent = "Connecting to Google...";
    var btn = this;
    handleGoogleSignIn(errorEl).finally(function () {
      btn.disabled = false;
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg> Sign up with Google';
    });
  });

  document.getElementById("btn-google-login").addEventListener("click", function () {
    var errorEl = document.getElementById("login-error");
    errorEl.classList.remove("fs-visible");
    this.disabled = true;
    this.textContent = "Connecting to Google...";
    var btn = this;
    handleGoogleSignIn(errorEl).finally(function () {
      btn.disabled = false;
      btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg> Sign in with Google';
    });
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
