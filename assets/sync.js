// Syncs study progress across devices through /api/progress.
// Each browser gets a private sync code; entering the same code on another device links them.
// The pages keep saving to browser storage as before. This script watches the keys they save
// (flags:*, neuro2-*, cardio-*), sends changes to the server, and on load pulls anything newer.
// Load it before the page's own scripts so a pull can land before they read storage.
(function () {
  const TRACKED = ["flags:", "neuro2-", "cardio-"];
  const CODE_KEY = "a403-sync-code", AT_KEY = "a403-sync-at", RELOAD_KEY = "a403-sync-reloaded";
  const CODE_RE = /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/;
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tracked = k => TRACKED.some(p => k.startsWith(p));

  let LS;
  try { LS = window.localStorage; LS.getItem(CODE_KEY); } catch (e) { return; }
  const set = Storage.prototype.setItem;
  const newCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let s = "";
    bytes.forEach((b, i) => { s += ALPHABET[b % 32]; if (i % 5 === 4 && i < 19) s += "-"; });
    return s;
  };

  let code = LS.getItem(CODE_KEY);
  if (!code || !CODE_RE.test(code)) { code = newCode(); set.call(LS, CODE_KEY, code); }
  const url = () => "/api/progress?code=" + encodeURIComponent(code);

  let status = "connecting";
  const setStatus = s => { status = s; window.dispatchEvent(new CustomEvent("a403-sync", { detail: s })); };

  // send changes, but only after the first pull, so stale local data never overwrites newer saves
  const pending = new Set();
  let pulled = false, timer = null;
  Storage.prototype.setItem = function (k, v) {
    set.call(this, k, v);
    if (this === LS && tracked(k)) { pending.add(k); if (pulled) schedule(); }
  };
  const schedule = () => { clearTimeout(timer); timer = setTimeout(push, 1200); };
  function push(keepalive) {
    if (!pending.size) return;
    const data = {};
    pending.forEach(k => { const v = LS.getItem(k); if (v != null) data[k] = v; });
    pending.clear();
    const at = Date.now();
    set.call(LS, AT_KEY, String(at));
    fetch(url(), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data, at }), keepalive: !!keepalive })
      .then(r => { if (!r.ok) throw 0; setStatus("saved"); })
      .catch(() => { Object.keys(data).forEach(k => pending.add(k)); setStatus("offline"); });
  }
  const flush = () => { if (pulled && pending.size) { clearTimeout(timer); push(true); } };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

  // pull anything newer from the server
  fetch(url(), { cache: "no-store" })
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
        if (changed && sessionStorage.getItem(RELOAD_KEY) !== String(remote.at)) {
          sessionStorage.setItem(RELOAD_KEY, String(remote.at));
          location.reload();
          return;
        }
      } else if (localAt > remote.at || (remote.at === 0 && localAt === 0)) {
        // first sync, or this device has newer progress: send all of it
        for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (tracked(k)) pending.add(k); }
      }
      pulled = true;
      setStatus("saved");
      if (pending.size) push();
    })
    .catch(() => { pulled = true; setStatus("offline"); });

  window.a403Sync = {
    code: () => code,
    status: () => status,
    // link this browser to a code from another device; that device's progress replaces this one's
    use(input) {
      const c = String(input || "").toUpperCase().replace(/[^A-Z2-9]/g, "").replace(/(.{5})(?=.)/g, "$1-");
      if (!CODE_RE.test(c)) return false;
      if (c === code) return true;
      set.call(LS, CODE_KEY, c);
      set.call(LS, AT_KEY, "0");
      sessionStorage.removeItem(RELOAD_KEY);
      location.reload();
      return true;
    },
  };
})();
