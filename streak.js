/* ===== Daily streak tracker w/ animation (shared across level picker + all levels) ===== */
(function () {
  const KEY = 'hsk_streak_v1';

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function readRaw() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function writeRaw(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function badges() { return document.querySelectorAll('.streak-badge'); }
  function setMode(mode) {
    badges().forEach(b => { b.classList.remove('gray', 'lit', 'igniting', 'extinguishing'); b.classList.add(mode); });
  }
  function setCountInstant(n) {
    document.querySelectorAll('.streak-count').forEach(el => { el.textContent = n; });
  }
  function pulseOnce() {
    badges().forEach(b => { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); });
  }
  function tweenCount(from, to, duration) {
    from = from || 0;
    if (from === to) { setCountInstant(to); return; }
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      setCountInstant(Math.round(from + (to - from) * p));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function playContinue(oldCount, newCount) {
    setMode('lit');
    setCountInstant(oldCount || 0);
    pulseOnce();
    tweenCount(oldCount, newCount, 600);
  }
  function playBreak(oldCount) {
    setMode('lit');
    setCountInstant(oldCount || 1);
    setTimeout(() => {
      setMode('extinguishing');
      setTimeout(() => {
        setMode('gray');
        setCountInstant(1);
        setTimeout(() => {
          setMode('igniting');
          pulseOnce();
          setTimeout(() => setMode('lit'), 650);
        }, 450);
      }, 550);
    }, 300);
  }
  function playFirstVisit() {
    setMode('gray');
    setCountInstant(1);
    setTimeout(() => {
      setMode('igniting');
      pulseOnce();
      setTimeout(() => setMode('lit'), 650);
    }, 350);
  }
  function showStatic(count, mode) {
    setMode(mode);
    setCountInstant(count);
  }

  function resolveAndRender() {
    const old = readRaw();
    const today = todayStr();
    let data, event;
    if (!old || !old.lastDate) {
      data = { count: 1, lastDate: today };
      event = 'first';
    } else if (old.lastDate === today) {
      data = old;
      event = 'same';
    } else if (addDays(old.lastDate, 1) === today) {
      data = { count: old.count + 1, lastDate: today };
      event = 'continue';
    } else {
      data = { count: 1, lastDate: today };
      event = 'reset';
    }
    writeRaw(data);

    if (event === 'same') showStatic(data.count, 'lit');
    else if (event === 'first') playFirstVisit();
    else if (event === 'continue') playContinue(old.count, data.count);
    else if (event === 'reset') playBreak(old && old.count);
  }

  /* ===== Debug helpers (temporary) =====
     Simulate day boundaries so the animation can be tested without waiting for real time to pass. */
  window.debugStreakContinue = function () {
    const old = readRaw();
    writeRaw({ count: (old && old.count) || 0, lastDate: addDays(todayStr(), -1) });
    resolveAndRender();
  };
  window.debugStreakBreak = function () {
    const old = readRaw();
    writeRaw({ count: (old && old.count) || 1, lastDate: addDays(todayStr(), -5) });
    resolveAndRender();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resolveAndRender);
  } else {
    resolveAndRender();
  }
})();
