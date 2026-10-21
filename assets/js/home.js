document.addEventListener('click', e => {
  const b = e.target.closest('[data-lane]'); if (!b || !window.JX) return;
  JX.load().then(() => JX.playLane(b.dataset.lane)).catch(err => console.warn(err));
});
