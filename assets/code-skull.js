/* Home page hero art: a skull drawn in thousands of code characters that
   dissolves to the left. Shading comes from the brightness map in
   /assets/skull-map.js (window.A403_SKULL). Draws into every
   <canvas data-code-skull>. Static under prefers-reduced-motion; the
   animation pauses while the canvas is off screen. */
(() => {
  const CODE = "function(){var lec=$(document).querySelector('#lecture');setTimeout(next,400);for(let i=0;i<deck.length;i++){if(card.missed)queue.push(card)}return score/total}const heart={atria:2,ventricles:2};aorta.branch('carotid');blood.type='O+';printText(index,chunk);display:block;contentArray.map(scrollTop);$(window).on('load',init);";
  // Palettes, light to dark: hi = lit bone, mid = mid-tones, lo = shadows, glow = canvas halo.
  // The page uses DEFAULT; add ?skull=<name> to the URL to preview another.
  const PALETTES = {
    neon: { hi: ["#FFFFFF", "#FF7ADB", "#FF3DB8", "#FF5FD2", "#FFC2EE"], mid: ["#E23CFF", "#B44BFF", "#8A5CFF", "#FF2E97", "#6E6BFF"], lo: ["#00C2FF", "#2F7BFF", "#3D5AFE", "#00E5FF", "#4B6BFF"], glow: "rgba(208,75,255,.38)" },
    blood: { hi: ["#FFFFFF", "#FFD9D9", "#FF6B6B", "#FF9A9A"], mid: ["#FF2D3A", "#E0144C", "#FF4D5E", "#D3123A"], lo: ["#B0122E", "#C8102E", "#9E1B3A", "#E0244A"], glow: "rgba(255,40,70,.34)" },
    acid: { hi: ["#FFFFFF", "#EAFFE0", "#C6FF3B", "#8CFF5A"], mid: ["#39FF14", "#00F57A", "#7CFF4F", "#B6FF3B"], lo: ["#00B865", "#00C853", "#14A85C", "#00D68F"], glow: "rgba(57,255,20,.3)" },
  };
  const DEFAULT = "neon";
  const P = PALETTES[new URLSearchParams(location.search).get("skull")] || PALETTES[DEFAULT];
  const HI = P.hi, MID = P.mid, LO = P.lo;
  const SIZES = 7;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const rnd = (a) => a[(Math.random() * a.length) | 0];

  function build() {
    const M = window.A403_SKULL; if (!M) return [];
    const bin = atob(M.d), map = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) map[i] = bin.charCodeAt(i);
    const sh = 0.86, sw = sh * M.w / M.h, left = 0.6 - sw / 2, top = 0.06;
    const at = (u, v) => map[Math.min(M.h - 1, (v * M.h) | 0) * M.w + Math.min(M.w - 1, (u * M.w) | 0)] / 255;
    const step = 0.0068, out = []; let k = 0;
    for (let y = top; y < top + sh; y += step * 1.18) {
      for (let x = left; x < left + sw; x += step) {
        const v0 = at((x - left) / sw, (y - top) / sh);
        if (v0 < 0.1 || Math.random() > 0.35 + v0) continue;
        const v = Math.min(1, v0 * (0.92 + Math.random() * 0.16));
        const g = {
          x: x + (Math.random() - 0.5) * step * 0.6, y, v,
          ch: CODE[k++ % CODE.length],
          col: v > 0.72 ? rnd(HI) : v > 0.38 ? rnd(MID) : rnd(LO),
          a: 0.25 + 0.75 * Math.pow(v, 0.8),
          s: Math.min(SIZES - 1, (v * SIZES + Math.random() * 1.6) | 0),
          dx: 0, vx: 0,
        };
        // the left of the skull dissolves: more cells drift off the further left they sit
        const pull = Math.max(0, (left + sw * 0.42 - x) / (sw * 0.42));
        if (Math.random() < pull * pull * 0.7) {
          g.dx = -Math.pow(Math.random(), 1.4) * 0.32;
          g.vx = -(0.0003 + Math.random() * 0.001);
          g.s = Math.max(0, g.s - 1);
        }
        out.push(g);
      }
    }
    // stray characters already adrift on the left
    for (let n = 0; n < 420; n++) {
      const x = 0.01 + Math.pow(Math.random(), 0.75) * (left + 0.04);
      out.push({ x, y: top + 0.08 + Math.random() * sh * 0.82, v: 0.3, ch: CODE[k++ % CODE.length], col: rnd(MID.concat(LO)),
        a: 0.1 + Math.random() * 0.5 * (x / left), s: (Math.random() * 3) | 0, dx: 0, vx: -(0.0002 + Math.random() * 0.0007), stray: 1 });
    }
    // group by size then colour so the canvas changes font and fill as rarely as possible
    out.sort((p, q) => p.s - q.s || (p.col < q.col ? -1 : p.col > q.col ? 1 : 0));
    return out;
  }

  function mount(cv) {
    cv.style.filter = "drop-shadow(0 0 14px " + P.glow + ")";
    const ctx = cv.getContext("2d"); let glyphs = null, W = 0, H = 0, live = false, last = 0, fonts = [];
    function size() {
      const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; if (!W) return;
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      const base = W * 0.0105;
      fonts = Array.from({ length: SIZES }, (_, i) => (i > 3 ? "700 " : "500 ") + (base * (0.62 + i * 0.16)).toFixed(1) + "px ui-monospace,'SF Mono',Menlo,Consolas,monospace");
      if (!glyphs) glyphs = build();
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let f = -1, c = "";
      for (const g of glyphs) {
        const x = (g.x + g.dx) * W; if (x < -8) continue;
        if (g.s !== f) { f = g.s; ctx.font = fonts[f]; }
        if (g.col !== c) { c = g.col; ctx.fillStyle = c; }
        ctx.globalAlpha = g.stray ? g.a : g.a * Math.max(0, 1 + g.dx * 2.6);
        ctx.fillText(g.ch, x, g.y * H);
      }
      ctx.globalAlpha = 1;
    }
    function tick(t) {
      if (!live) return;
      requestAnimationFrame(tick);
      if (t - last < 70) return; last = t;
      for (const g of glyphs) {
        if (g.vx) { g.dx += g.vx; if (g.x + g.dx < 0) g.dx = g.stray ? Math.random() * 0.04 + 0.28 - g.x : 0; }
        if (Math.random() < 0.015) g.ch = CODE[(Math.random() * CODE.length) | 0];
      }
      draw();
    }
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(([e]) => {
      const go = e.isIntersecting && !reduce.matches;
      if (go && !live) { live = true; requestAnimationFrame(tick); } else if (!go) live = false;
    }).observe(cv);
  }
  const start = () => document.querySelectorAll("canvas[data-code-skull]").forEach(mount);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
