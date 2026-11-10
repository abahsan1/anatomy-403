/* Home page hero art: a front-facing skull drawn in code characters that
   dissolves to the left. Draws into every <canvas data-code-skull>.
   Static under prefers-reduced-motion; animation pauses off screen. */
(() => {
  const CODE = "function(){var lec=$(document).querySelector('#lecture');setTimeout(next,400);for(let i=0;i<deck.length;i++){if(card.missed)queue.push(card)}return score/total}const heart={atria:2,ventricles:2};aorta.branch('carotid');blood.type='O+';printText(index,chunk);display:block;contentArray.map(";
  const RAMP = ".:;-=+*$%#&8B@";
  const COLORS = ["#FFFFFF","#B3A3FF","#7C5CFF","#4F8CFF","#16A6F2","#2CD4C2","#FFC23D","#FF8A5C","#FF7EB6"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // Skull silhouette in a unit box; cx shifted right to leave room for the dissolve.
  function mask(ctx, S) {
    const cx = 0.6, P = (x, y) => [x * S, y * S];
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(...P(cx, 0.37), 0.27 * S, 0.29 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(...P(cx - 0.265, 0.42));
    ctx.bezierCurveTo(...P(cx - 0.27, 0.55), ...P(cx - 0.25, 0.6), ...P(cx - 0.2, 0.66));
    ctx.lineTo(...P(cx - 0.14, 0.7));
    ctx.lineTo(...P(cx + 0.14, 0.7));
    ctx.lineTo(...P(cx + 0.2, 0.66));
    ctx.bezierCurveTo(...P(cx + 0.25, 0.6), ...P(cx + 0.27, 0.55), ...P(cx + 0.265, 0.42));
    ctx.closePath(); ctx.fill();
    // mandible
    ctx.beginPath();
    ctx.moveTo(...P(cx - 0.19, 0.69));
    ctx.bezierCurveTo(...P(cx - 0.2, 0.83), ...P(cx - 0.1, 0.9), ...P(cx, 0.9));
    ctx.bezierCurveTo(...P(cx + 0.1, 0.9), ...P(cx + 0.2, 0.83), ...P(cx + 0.19, 0.69));
    ctx.closePath(); ctx.fill();
    // holes
    ctx.globalCompositeOperation = "destination-out";
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(...P(cx + s * 0.112, 0.485), 0.088 * S, 0.078 * S, s * -0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(...P(cx + s * 0.205, 0.735), 0.03 * S, 0.05 * S, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(...P(cx, 0.55));
    ctx.bezierCurveTo(...P(cx - 0.02, 0.58), ...P(cx - 0.05, 0.63), ...P(cx - 0.03, 0.645));
    ctx.lineTo(...P(cx + 0.03, 0.645));
    ctx.bezierCurveTo(...P(cx + 0.05, 0.63), ...P(cx + 0.02, 0.58), ...P(cx, 0.55));
    ctx.fill();
    ctx.lineWidth = 0.009 * S; ctx.strokeStyle = "#000";
    ctx.beginPath(); ctx.moveTo(...P(cx - 0.15, 0.745)); ctx.lineTo(...P(cx + 0.15, 0.745)); ctx.stroke();
    for (let i = -4; i <= 4; i++) {
      const x = cx + i * 0.032;
      ctx.beginPath(); ctx.moveTo(...P(x, 0.68)); ctx.lineTo(...P(x, 0.8)); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function build(S) {
    const m = document.createElement("canvas"); m.width = m.height = S;
    const mc = m.getContext("2d"); mask(mc, S);
    const b = document.createElement("canvas"); b.width = b.height = S;
    const bc = b.getContext("2d"); bc.filter = "blur(" + Math.round(S * 0.018) + "px)"; bc.drawImage(m, 0, 0);
    const md = mc.getImageData(0, 0, S, S).data, bd = bc.getImageData(0, 0, S, S).data;
    const step = 0.0125, out = []; let k = 0;
    for (let y = 0.05; y < 0.95; y += step * 1.25) {
      for (let x = 0.25; x < 0.92; x += step) {
        const px = Math.floor(x * S), py = Math.floor(y * S), i = (py * S + px) * 4;
        if (md[i + 3] < 128) continue;
        // shade: depth from the blurred mask, lit from the upper right
        const depth = bd[i + 3] / 255;
        const light = 0.55 + 0.6 * (x - 0.33) - 0.25 * (y - 0.5);
        let v = Math.max(0.05, Math.min(1, depth * light + (Math.random() - 0.5) * 0.18));
        const g = { x, y, v, ch: CODE[k++ % CODE.length], col: pick(v), a: 0.35 + 0.65 * v, sz: 0.85 + 0.5 * v, dx: 0, vx: 0 };
        // the left side dissolves: more cells drift off the further left they sit
        const pull = Math.max(0, (0.52 - x) / 0.27);
        if (Math.random() < pull * 0.55) { g.dx = -Math.pow(Math.random(), 1.6) * 0.3; g.vx = -(0.0004 + Math.random() * 0.0012); g.a *= 0.75; g.sz *= 0.8; }
        out.push(g);
      }
    }
    // stray particles to the left
    for (let n = 0; n < 260; n++) {
      const y = 0.18 + Math.random() * 0.7, x = 0.02 + Math.pow(Math.random(), 0.7) * 0.45;
      out.push({ x, y, v: 0.2, ch: CODE[k++ % CODE.length], col: COLORS[1 + (n % 8)], a: 0.15 + Math.random() * 0.45 * (x / 0.47), sz: 0.55 + Math.random() * 0.4, dx: 0, vx: -(0.0003 + Math.random() * 0.0008), stray: 1 });
    }
    return out;
  }
  function pick(v) {
    if (v > 0.8) return Math.random() < 0.5 ? "#FFFFFF" : COLORS[6 + ((Math.random() * 3) | 0)];
    return COLORS[1 + ((Math.random() * 8) | 0)];
  }

  function mount(cv) {
    const ctx = cv.getContext("2d"); let glyphs = [], W = 0, live = false, last = 0;
    function size() {
      const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      W = r.width; if (!W) return;
      cv.width = Math.round(W * d); cv.height = Math.round(r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      if (!glyphs.length) glyphs = build(600);
      draw();
    }
    function draw() {
      const H = cv.height / (cv.width / W); ctx.clearRect(0, 0, W, H);
      const base = W * 0.0165; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (const g of glyphs) {
        const x = (g.x + g.dx) * W; if (x < -10) continue;
        ctx.globalAlpha = g.a * (g.dx < 0 && !g.stray ? Math.max(0, 1 + g.dx * 2.2) : 1);
        ctx.fillStyle = g.col;
        ctx.font = "600 " + (base * g.sz).toFixed(1) + "px ui-monospace,'SF Mono',Menlo,Consolas,monospace";
        ctx.fillText(g.v > 0.88 && !g.stray ? RAMP[RAMP.length - 1 - ((Math.random() * 3) | 0)] : g.ch, x, g.y * H);
      }
      ctx.globalAlpha = 1;
    }
    function tick(t) {
      if (!live) return;
      requestAnimationFrame(tick);
      if (t - last < 80) return; last = t;
      for (const g of glyphs) {
        if (g.vx) { g.dx += g.vx; if (g.x + g.dx < 0) g.dx = g.stray ? 0.45 - g.x + Math.random() * 0.05 : 0; }
        if (Math.random() < 0.02) g.ch = CODE[(Math.random() * CODE.length) | 0];
      }
      draw();
    }
    new ResizeObserver(size).observe(cv);
    new IntersectionObserver(([e]) => {
      const go = e.isIntersecting && !reduce.matches && !document.hidden;
      if (go && !live) { live = true; requestAnimationFrame(tick); } else if (!go) live = false;
    }).observe(cv);
  }
  const start = () => document.querySelectorAll("canvas[data-code-skull]").forEach(mount);
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", start) : start();
})();
