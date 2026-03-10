// Future Self — Supabase REST API Client
// Uses fetch() to call Supabase endpoints directly (no external libraries needed)

var SUPABASE_URL = "https://odcmrhnwxzgyfodoscqw.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY21yaG53eHpneWZvZG9zY3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzA5NTUsImV4cCI6MjA4ODM0Njk1NX0.dbTm2SsVo7iAWfoULhfRgayKBmAO8v7Y2Q-fHzvzSPQ";

var SupabaseAuth = {

  async signUp(email, password) {
    var res = await fetch(SUPABASE_URL + "/auth/v1/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || "Sign up failed");
    }
    if (data.access_token) {
      await SupabaseAuth._storeTokens(data);
    }
    return data;
  },

  async signIn(email, password) {
    var res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || "Sign in failed");
    }
    await SupabaseAuth._storeTokens(data);
    return data;
  },

  async refreshToken(token) {
    var res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ refresh_token: token })
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || "Token refresh failed");
    }
    await SupabaseAuth._storeTokens(data);
    return data;
  },

  async getProfile(accessToken) {
    var res = await fetch(SUPABASE_URL + "/rest/v1/profiles?select=*", {
      method: "GET",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
        "Accept": "application/json"
      }
    });
    var data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch profile");
    }
    return data;
  },

  async resetPassword(email) {
    var res = await fetch(SUPABASE_URL + "/auth/v1/recover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email: email })
    });
    if (!res.ok) {
      var data = await res.json();
      throw new Error(data.error_description || data.msg || data.message || "Password reset failed");
    }
  },

  async signOut() {
    await chrome.storage.local.remove([
      "futureself_access_token",
      "futureself_refresh_token",
      "futureself_token_expires_at",
      "futureself_user_email",
      "futureself_auth_status"
    ]);
  },

  async _storeTokens(data) {
    var toStore = {};
    if (data.access_token) {
      toStore.futureself_access_token = data.access_token;
    }
    if (data.refresh_token) {
      toStore.futureself_refresh_token = data.refresh_token;
    }
    if (data.expires_in) {
      toStore.futureself_token_expires_at = Date.now() + (data.expires_in * 1000);
    }
    if (data.user && data.user.email) {
      toStore.futureself_user_email = data.user.email;
    }
    await chrome.storage.local.set(toStore);
  },

  async getStoredTokens() {
    return await chrome.storage.local.get([
      "futureself_access_token",
      "futureself_refresh_token",
      "futureself_token_expires_at",
      "futureself_user_email"
    ]);
  },

  async getValidAccessToken() {
    var tokens = await SupabaseAuth.getStoredTokens();
    if (!tokens.futureself_access_token) return null;

    // Check if token is expired (with 60s buffer)
    if (tokens.futureself_token_expires_at && Date.now() > tokens.futureself_token_expires_at - 60000) {
      if (!tokens.futureself_refresh_token) return null;
      try {
        var refreshed = await SupabaseAuth.refreshToken(tokens.futureself_refresh_token);
        return refreshed.access_token;
      } catch (e) {
        await SupabaseAuth.signOut();
        return null;
      }
    }

    return tokens.futureself_access_token;
  },

  async checkAuthStatus() {
    var TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;
    var tokens = await SupabaseAuth.getStoredTokens();
    var accessFlags = await chrome.storage.local.get(["futureself_freeForever", "futureself_isPaid"]);
    var hasForeverAccess = accessFlags.futureself_freeForever === true || accessFlags.futureself_isPaid === true;

    if (!tokens.futureself_access_token) {
      return {
        isLoggedIn: false,
        isTrialActive: false,
        isPaid: false,
        trialHoursLeft: 0,
        email: null
      };
    }

    var accessToken = await SupabaseAuth.getValidAccessToken();
    if (!accessToken) {
      return {
        isLoggedIn: false,
        isTrialActive: false,
        isPaid: false,
        trialHoursLeft: 0,
        email: null
      };
    }

    // Try to get profile from Supabase
    try {
      var profiles = await SupabaseAuth.getProfile(accessToken);
      var profile = profiles && profiles.length > 0 ? profiles[0] : null;

      var isPaid = profile ? (profile.is_paid === true) : false;
      var trialStart = profile ? profile.trial_start : null;
      var isTrialActive = false;
      var trialHoursLeft = 0;

      if (trialStart) {
        var trialStartMs = new Date(trialStart).getTime();
        var elapsed = Date.now() - trialStartMs;
        if (elapsed < TRIAL_DURATION_MS) {
          isTrialActive = true;
          trialHoursLeft = Math.max(0, Math.ceil((TRIAL_DURATION_MS - elapsed) / 3600000));
        }
      }

      var status = {
        isLoggedIn: true,
        isTrialActive: isTrialActive,
        isPaid: isPaid || hasForeverAccess,
        trialHoursLeft: trialHoursLeft,
        email: tokens.futureself_user_email || null
      };

      // Cache status locally for offline use
      await chrome.storage.local.set({ futureself_auth_status: status });
      return status;

    } catch (e) {
      // Offline or error — use cached status
      var cached = await chrome.storage.local.get("futureself_auth_status");
      if (cached.futureself_auth_status) {
        cached.futureself_auth_status.isPaid = cached.futureself_auth_status.isPaid || hasForeverAccess;
        return cached.futureself_auth_status;
      }
      return {
        isLoggedIn: true,
        isTrialActive: false,
        isPaid: hasForeverAccess,
        trialHoursLeft: 0,
        email: tokens.futureself_user_email || null
      };
    }
  }
};

// Make available globally for importScripts in service worker
if (typeof self !== "undefined") {
  self.SupabaseAuth = SupabaseAuth;
  self.SUPABASE_URL = SUPABASE_URL;
  self.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
}
