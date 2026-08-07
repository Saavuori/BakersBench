/* Baker's Bench — oven timer
 *
 * Counts down against a wall-clock deadline rather than by decrementing a
 * counter, so a throttled background tab cannot make it drift. Whatever the
 * browser does with our interval, `endsAt − now` is still the truth.
 *
 * The alarm is synthesised with the Web Audio API — no audio file to ship, and
 * it works with no network. The AudioContext is only created on a real click,
 * which is what browser autoplay policy requires anyway.
 */

const Timer = (() => {

  const el = id => document.getElementById(id);

  const S = {
    total: 0,        // seconds the current run started from
    remaining: 0,    // seconds left
    endsAt: null,    // ms timestamp while running
    running: false,
    label: '',
    ringing: false
  };

  let tickHandle = null;
  let audio = null;
  let alarmTimers = [];
  let titleFlip = null;
  const baseTitle = document.title;

  /* ── Alarm ─────────────────────────────────────────────────────────── */

  function ensureAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audio) audio = new Ctx();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  /* Two-tone chime, not a buzzer — this goes off in a kitchen, not a factory. */
  function chime(at) {
    const ctx = audio;
    if (!ctx) return;
    [[880, 0], [1174.7, 0.17]].forEach(([hz, off]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const t = at + off;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  function startAlarm() {
    S.ringing = true;
    const ctx = ensureAudio();
    if (ctx) for (let i = 0; i < 6; i++) chime(ctx.currentTime + i * 0.85);
    // Repeat the burst so it is still audible if you walked off.
    alarmTimers.push(setInterval(() => {
      const c = ensureAudio();
      if (c) for (let i = 0; i < 6; i++) chime(c.currentTime + i * 0.85);
    }, 6000));

    let on = false;
    titleFlip = setInterval(() => {
      on = !on;
      document.title = on ? '⏰ Timer done — Baker\'s Bench' : baseTitle;
    }, 800);

    el('timerCard').classList.add('is-ringing');
    el('timerDone').hidden = false;
    el('timerDoneLabel').textContent = S.label || 'Timer';
    paint();   // the header strip and fullscreen need to know it is ringing
  }

  function stopAlarm() {
    S.ringing = false;
    alarmTimers.forEach(clearInterval);
    alarmTimers = [];
    if (titleFlip) { clearInterval(titleFlip); titleFlip = null; }
    document.title = baseTitle;
    el('timerCard').classList.remove('is-ringing');
    el('timerDone').hidden = true;
    paint();
  }

  /* ── Clock ─────────────────────────────────────────────────────────── */

  const parts = s => {
    s = Math.max(0, Math.ceil(s));
    const m = Math.floor(s / 60);
    if (m >= 60) {
      return [String(Math.floor(m / 60)), String(m % 60).padStart(2, '0'), String(s % 60).padStart(2, '0')];
    }
    return [String(m).padStart(2, '0'), String(s % 60).padStart(2, '0')];
  };

  const fmt = s => parts(s).join(':');
  /* Separators are their own elements so they can blink — a ticking colon is the
     cheapest, most universally understood "this is running" signal there is. */
  const fmtHTML = s => parts(s).join('<i>:</i>');

  function tick() {
    if (!S.running) return;
    S.remaining = (S.endsAt - Date.now()) / 1000;
    if (S.remaining <= 0) {
      S.remaining = 0;
      S.running = false;
      clearInterval(tickHandle);
      tickHandle = null;
      paint();
      startAlarm();
      return;
    }
    paint();
  }

  let lastTitleSec = -1;

  /* While it runs, the countdown goes in the tab title too — that is the only
     indication you can see from another tab, or with the page scrolled away. */
  function updateTitle() {
    if (S.ringing) return;                 // the alarm owns the title
    if (!S.running) {
      if (document.title !== baseTitle) document.title = baseTitle;
      lastTitleSec = -1;
      return;
    }
    const sec = Math.ceil(S.remaining);
    if (sec === lastTitleSec) return;
    lastTitleSec = sec;
    document.title = `${fmt(S.remaining)} ${S.label ? '· ' + S.label + ' ' : ''}— Baker's Bench`;
  }

  function paint() {
    el('timerClock').innerHTML = fmtHTML(S.remaining);
    el('timerLabel').textContent = S.label || (S.total ? 'Ready' : 'Pick a stage');
    el('timerToggle').textContent = S.running ? 'Pause' : 'Start';
    el('timerToggle').disabled = S.remaining <= 0 && !S.running;
    el('timerCard').classList.toggle('is-running', S.running);
    el('timerCard').classList.toggle('is-paused', !S.running && S.remaining > 0 && S.remaining < S.total);

    const note = el('timerNote');
    if (S.running) {
      note.innerHTML = '<span class="live-dot"></span>Running';
      note.dataset.state = 'running';
    } else if (S.remaining > 0 && S.remaining < S.total) {
      note.textContent = 'Paused';
      note.dataset.state = 'paused';
    } else {
      note.textContent = 'Counts down even in a background tab';
      note.dataset.state = 'idle';
    }
    updateTitle();

    const frac = S.total > 0 ? Math.max(0, Math.min(1, S.remaining / S.total)) : 0;
    const r = 58, c = 2 * Math.PI * r;
    el('timerRing').innerHTML =
      `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
       <circle class="ring-live" cx="66" cy="66" r="${r}" fill="none" stroke="var(--ember)"
               stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}"
               stroke-dashoffset="${c * (1 - frac)}"
               transform="rotate(-90 66 66)"/>`;

    [...document.querySelectorAll('#timerPresets button')].forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.label === S.label));
    });

    paintMini(frac);
    paintFull(frac);
  }

  /* The header pill. Present only while a timer is actually in progress —
     armed-but-untouched would just be clutter in a sticky bar. */
  function paintMini(frac) {
    /* "In progress" means running, paused part-way, or ringing. A finished timer
       whose alarm you have already dismissed is done — the strip goes away. */
    const inProgress = S.ringing || S.running || (S.remaining > 0 && S.remaining < S.total);
    const mini = el('miniTimer');
    mini.hidden = !inProgress;
    if (!inProgress) return;

    mini.dataset.state = S.ringing ? 'ringing' : S.running ? 'running' : 'paused';
    el('miniClock').innerHTML = fmtHTML(S.remaining);
    el('miniLabel').textContent = S.ringing ? "Time's up" : (S.label || 'Timer');
    /* While it is ringing, the only thing anyone wants from this bar is silence. */
    el('miniStop').hidden = !S.ringing;
    el('miniToggle').hidden = S.ringing;
    el('miniToggle').textContent = S.running ? 'Pause' : 'Resume';
    el('miniToggle').setAttribute('aria-label', S.running ? 'Pause the timer' : 'Resume the timer');

    el('miniBar').style.width = `${frac * 100}%`;

    const r = 14, c = 2 * Math.PI * r;
    el('miniRing').innerHTML =
      `<circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/>
       <circle cx="17" cy="17" r="${r}" fill="none" stroke="currentColor" stroke-width="4"
               stroke-linecap="round" stroke-dasharray="${c}"
               stroke-dashoffset="${c * (1 - frac)}" transform="rotate(-90 17 17)"/>`;
  }

  function paintFull(frac) {
    if (el('timerFull').hidden) return;
    el('tfClock').innerHTML = fmtHTML(S.remaining);
    el('tfLabel').textContent = S.label || 'Timer';
    el('tfBar').style.width = `${frac * 100}%`;
    el('tfToggle').textContent = S.ringing ? 'Stop the alarm' : S.running ? 'Pause' : 'Start';
    el('tfToggle').disabled = !S.ringing && S.remaining <= 0 && !S.running;
    el('tfDone').hidden = !S.ringing;
    el('timerFull').dataset.state = S.ringing ? 'ringing' : S.running ? 'running' : 'paused';
  }

  /* ── Fullscreen ────────────────────────────────────────────────────── */

  function enterFull() {
    const node = el('timerFull');
    node.hidden = false;
    document.documentElement.classList.add('has-fullscreen-timer');
    el('tfRecipe').textContent = document.getElementById('recipeName')?.textContent || '';
    // Native fullscreen if it's allowed; the overlay covers the viewport either way.
    if (node.requestFullscreen) node.requestFullscreen().catch(() => {});
    paint();
  }

  function exitFull() {
    const node = el('timerFull');
    if (node.hidden) return;
    node.hidden = true;
    document.documentElement.classList.remove('has-fullscreen-timer');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  /* ── Public ────────────────────────────────────────────────────────── */

  function set(seconds, label) {
    stopAlarm();
    S.total = Math.max(1, Math.round(seconds));
    S.remaining = S.total;
    S.label = label || '';
    S.running = false;
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    paint();
  }

  function nudge(deltaSeconds) {
    stopAlarm();
    const next = Math.max(0, S.remaining + deltaSeconds);
    S.remaining = next;
    S.total = Math.max(S.total, next);
    if (!S.total) S.total = next;
    if (S.running) S.endsAt = Date.now() + next * 1000;
    if (!S.label) S.label = 'Timer';
    paint();
  }

  function toggle() {
    stopAlarm();
    if (S.running) {
      S.remaining = (S.endsAt - Date.now()) / 1000;
      S.running = false;
      clearInterval(tickHandle);
      tickHandle = null;
    } else {
      if (S.remaining <= 0) return;
      ensureAudio();              // unlock audio on this gesture, before it's needed
      S.endsAt = Date.now() + S.remaining * 1000;
      S.running = true;
      tickHandle = setInterval(tick, 250);
    }
    paint();
  }

  function reset() {
    stopAlarm();
    S.running = false;
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    S.remaining = S.total;
    paint();
  }

  /* Rebuild the one-tap presets for whichever bread is showing. Never touches a
     running countdown — you can browse recipes while the oven is going. */
  function setStages(stages) {
    el('timerPresets').innerHTML = (stages || []).map(s =>
      `<button type="button" data-sec="${Math.round(s.min * 60)}" data-label="${s.label}"
               aria-pressed="false">
         <b>${s.label}</b><small>${s.min < 1 ? `${Math.round(s.min * 60)} s` : `${s.min} min`}</small>
       </button>`).join('');
    paint();
  }

  function init() {
    el('timerPresets').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) set(+b.dataset.sec, b.dataset.label);
    });
    el('timerNudge').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) nudge(+b.dataset.add);
    });
    el('timerToggle').addEventListener('click', toggle);
    el('timerReset').addEventListener('click', reset);
    el('timerStop').addEventListener('click', stopAlarm);

    /* Mini timer in the sticky header */
    el('miniFace').addEventListener('click', () => {
      if (S.ringing) { stopAlarm(); return; }
      el('timerCard').scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    el('miniToggle').addEventListener('click', toggle);
    el('miniStop').addEventListener('click', stopAlarm);
    el('miniFull').addEventListener('click', enterFull);

    /* Fullscreen */
    el('timerFullBtn').addEventListener('click', enterFull);
    el('tfToggle').addEventListener('click', () => S.ringing ? stopAlarm() : toggle());
    el('tfReset').addEventListener('click', reset);
    el('tfExit').addEventListener('click', exitFull);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') exitFull();
    });
    // Leaving native fullscreen (Esc, F11, gesture) should close the overlay too.
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) exitFull();
    });

    paint();
  }

  return { init, setStages, set, enterFull, exitFull, isRunning: () => S.running };
})();
