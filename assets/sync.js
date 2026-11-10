// Accounts and progress sync.
// Sign-in is Supabase Auth (Google, GitHub, email link); progress is saved through /api/progress,
// which checks the sign-in and stores it under the account. Signed out, progress stays in this browser.
// The pages keep saving to browser storage as before. This script watches the keys they save
// (flags:*, neuro2-*, cardio-*, msk-*), sends changes to the server, and on load pulls anything newer.
// Load it in <head>, before the pages' own scripts.
(function () {
  const SUPABASE_URL = "https://ksfbvtkbcnqiqvsazesd.supabase.co";
  const SUPABASE_KEY = "sb_publishable_bWHSSPtt2UrFc4g5YQDwlA_CQF9Qw-d"; // publishable: safe in the browser
  const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js";
  const TRACKED = ["flags:", "neuro2-", "cardio-", "msk-"];
  const AT_KEY = "a403-sync-at", USER_KEY = "a403-sync-user", RELOAD_KEY = "a403-sync-reloaded";
  const tracked = k => TRACKED.some(p => k.startsWith(p));

  let LS;
  try { LS = window.localStorage; LS.getItem(AT_KEY); } catch (e) { return; }
  const set = Storage.prototype.setItem;

  // ---------- the Supabase client, loaded once on demand ----------
  let clientP = null;
  function client() {
    return clientP || (clientP = new Promise((resolve, reject) => {
      const make = () => resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY,
        { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
      if (window.supabase && window.supabase.createClient) return make();
      const s = document.createElement("script");
      s.src = LIB; s.async = true; s.onload = make;
      s.onerror = () => { clientP = null; reject(new Error("The sign-in service didn't load.")); };
      document.head.appendChild(s);
    }));
  }

  let status = "connecting", user = null, token = null, known = false; // known: the sign-in check has answered
  const setStatus = s => { status = s; window.dispatchEvent(new CustomEvent("a403-sync", { detail: s })); };

  // ---------- push changes, but only after the first pull ----------
  const pending = new Set();
  let pulled = false, timer = null;
  // each exam page's own prefix; "<prefix>last" records when that exam was last studied (for the home page)
  const EXAMS = ["msk-", "neuro2-", "cardio-v2-"];
  Storage.prototype.setItem = function (k, v) {
    set.call(this, k, v);
    if (this !== LS || !tracked(k)) return;
    pending.add(k);
    const ex = EXAMS.find(p => k.startsWith(p));
    if (ex && k !== ex + "last" && k !== ex + "fcsrc") { set.call(LS, ex + "last", String(Date.now())); pending.add(ex + "last"); }
    if (pulled && user) schedule();
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(push, 1200); };
  function push(keepalive) {
    if (!pending.size || !token) return;
    const data = {};
    pending.forEach(k => { const v = LS.getItem(k); if (v != null) data[k] = v; });
    pending.clear();
    const at = Date.now();
    set.call(LS, AT_KEY, String(at));
    fetch("/api/progress", { method: "PUT", keepalive: !!keepalive,
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ data, at }) })
      .then(r => { if (!r.ok) throw 0; setStatus("saved"); })
      .catch(() => { Object.keys(data).forEach(k => pending.add(k)); setStatus("offline"); });
  }
  const flush = () => { if (pulled && user && pending.size) { clearTimeout(timer); push(true); } };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  // ---------- pull anything newer for this account ----------
  function pull() {
    // a different account than last time on this browser: the account's saved progress wins
    if (LS.getItem(USER_KEY) !== user.id) { set.call(LS, USER_KEY, user.id); set.call(LS, AT_KEY, "0"); }
    return fetch("/api/progress", { cache: "no-store", headers: { authorization: "Bearer " + token } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(remote => {
        const localAt = Number(LS.getItem(AT_KEY) || 0);
        if (remote.at > localAt) {
          let changed = false;
          for (const [k, v] of Object.entries(remote.data || {})) {
            if (tracked(k) && LS.getItem(k) !== v) { set.call(LS, k, v); changed = true; }
            pending.delete(k);
          }
          set.call(LS, AT_KEY, String(remote.at));
          // reload once so the page reads the pulled progress
          if (changed && !document.documentElement.hasAttribute("data-no-reload") &&
              sessionStorage.getItem(RELOAD_KEY) !== String(remote.at)) {
            sessionStorage.setItem(RELOAD_KEY, String(remote.at));
            location.reload();
            return;
          }
        } else if (localAt > remote.at || remote.at === 0) {
          // first sync for this account, or this browser has newer progress: send all of it
          for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (tracked(k)) pending.add(k); }
        }
        pulled = true;
        setStatus("saved");
        if (pending.size) push();
      })
      .catch(() => { pulled = true; setStatus("offline"); });
  }

  const meta = u => u.user_metadata || {};
  const profile = u => u && {
    id: u.id, email: u.email || "",
    name: meta(u).full_name || meta(u).name || meta(u).user_name || "",
    avatar: meta(u).avatar_url || meta(u).picture || "",
    provider: (u.app_metadata && u.app_metadata.provider) || "email",
  };
  const announce = () => { known = true; window.dispatchEvent(new CustomEvent("a403-auth", { detail: profile(user) })); };

  client().then(sb => {
    sb.auth.onAuthStateChange((event, session) => {
      const was = user && user.id;
      token = session ? session.access_token : null;
      user = session ? session.user : null;
      if (user && was !== user.id) { pulled = false; setStatus("connecting"); pull(); }
      if (!user && status !== "signed-out") { pulled = true; setStatus("signed-out"); }
      announce();
    });
  }).catch(() => { pulled = true; setStatus("offline"); announce(); });

  window.a403Sync = {
    status: () => status,
    user: () => profile(user),
    // true once sign-in is known; a page that loads after the "a403-auth" event reads user() instead
    ready: () => known,
    client,
    // signing out also clears this browser's copy, so the next person here starts fresh
    signOut() {
      return client().then(sb => sb.auth.signOut()).catch(() => {}).then(() => {
        const ks = [];
        for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (tracked(k)) ks.push(k); }
        ks.forEach(k => LS.removeItem(k));
        LS.removeItem(AT_KEY); LS.removeItem(USER_KEY);
      });
    },
  };
})();
