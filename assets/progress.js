// Adds the shared progress bar above the question map on the MSK quiz pages.
// It wraps the page's own renderTrack(), so every redraw updates the bar.
(function () {
  const track = document.getElementById("track");
  if (!track || typeof renderTrack !== "function") return;
  const bar = document.createElement("div");
  bar.className = "xbar";
  bar.innerHTML = '<div class="track-bg"><i></i></div><span></span>';
  track.parentNode.insertBefore(bar, track);
  const fill = bar.querySelector("i"), label = bar.querySelector("span");
  const update = () => {
    const n = deck.length, done = deck.filter(d => d.status).length;
    fill.style.setProperty("--p", n ? done / n : 0);
    label.textContent = done + " / " + n;
  };
  const original = renderTrack;
  renderTrack = function () { original(); update(); };
  update();
})();
