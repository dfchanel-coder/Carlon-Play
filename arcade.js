(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Navigation stays usable even if the optional observers are unavailable.
  const navLinks = $$('.nav-links a[href^="#"], .mobile-nav a[href^="#"]');
  const navTargets = [...new Set(navLinks.map(link => $(link.getAttribute('href'))).filter(Boolean))];
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.setAttribute('aria-current', 'location');
          } else {
            link.removeAttribute('aria-current');
          }
        });
      }
    }, { rootMargin: '-22% 0px -62% 0px' });
    navTargets.forEach(target => navObserver.observe(target));
  }

  $$('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
      const menu = $('.mobile-menu');
      if (menu) menu.open = false;
    });
  });

  const topButton = $('#topButton');
  window.addEventListener('scroll', () => {
    topButton?.classList.toggle('show', window.scrollY > 500);
  }, { passive: true });
  topButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Rockstar's current official release date (also shown in the GTA VI section).
  const releaseAt = new Date('2026-11-19T00:00:00-03:00').getTime();
  const countdownNodes = {
    days: $('#days'), hours: $('#hours'), minutes: $('#minutes'), seconds: $('#seconds')
  };
  const updateCountdown = () => {
    const remaining = Math.max(0, releaseAt - Date.now());
    const values = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor(remaining % 86400000 / 3600000),
      minutes: Math.floor(remaining % 3600000 / 60000),
      seconds: Math.floor(remaining % 60000 / 1000)
    };
    for (const [unit, node] of Object.entries(countdownNodes)) {
      if (node) node.textContent = String(values[unit]).padStart(unit === 'days' ? 3 : 2, '0');
    }
  };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Keep the client's current support flow and destinations exactly as configured.
  const modal = $('#supportModal');
  const modalDialog = $('.modal', modal);
  const modalClose = $('#modalClose');
  const modalTitle = $('#modalTitle');
  const modalText = $('#modalText');
  const supportLink = $('#supportLink');
  const supportData = {
    cafecito: { title: 'PREX', text: 'Cuenta 1438724.', url: '#' },
    paypal: { title: 'PIX', text: 'carlonchote18@gmail.com', url: '#' },
    mercadopago: { title: 'MERCADO PAGO', text: 'Futurmente...', url: '#' }
  };
  let modalOpener = null;

  const closeModal = () => {
    if (!modal?.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalOpener?.focus();
    modalOpener = null;
  };

  $$('.support-btn').forEach(button => {
    button.addEventListener('click', () => {
      const data = supportData[button.dataset.support];
      if (!data || !modal) return;
      modalOpener = button;
      modalTitle.textContent = data.title;
      modalText.textContent = data.text;
      supportLink.href = data.url;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      modalClose.focus();
    });
  });

  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (!modal?.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', modalDialog)
      .filter(element => element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Original procedural chiptune + effects. Nothing plays until the user opts in.
  class ArcadeAudio {
    constructor() {
      this.context = null;
      this.enabled = false;
      this.master = null;
      this.musicBus = null;
      this.effectsBus = null;
      this.musicTimer = 0;
      this.suspendTimer = 0;
      this.stateVersion = 0;
      this.musicStep = 0;
      this.nextNoteAt = 0;
      this.stepSeconds = 60 / 98 / 2;
      this.melody = [74, null, 77, 79, 81, null, 79, null, 77, null, 74, 77, 81, null, 77, null,
        72, null, 77, 81, 84, null, 81, null, 79, null, 77, 74, 72, null, 74, null];
      this.chords = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]];
      this.bassNotes = [38, 34, 29, 36];
    }

    createContext() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      try {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.effectsBus = this.context.createGain();
        this.master.gain.value = .84;
        this.musicBus.gain.value = .8;
        this.effectsBus.gain.value = .72;
        this.musicBus.connect(this.master);
        this.effectsBus.connect(this.master);
        this.master.connect(this.context.destination);
        return true;
      } catch {
        this.context = null;
        return false;
      }
    }

    async toggle() {
      if (!this.context && !this.createContext()) {
        audioButton.textContent = '♪ AUDIO NO DISPONIBLE';
        audioButton.disabled = true;
        return;
      }
      if (!this.enabled) {
        try { await this.context.resume(); } catch { return; }
        this.enabled = true;
        audioButton.textContent = '♪ MÚSICA: ACTIVADA';
        audioButton.setAttribute('aria-pressed', 'true');
        this.setGameState(game.state);
      } else {
        this.enabled = false;
        this.stateVersion++;
        if (this.suspendTimer) window.clearTimeout(this.suspendTimer);
        this.suspendTimer = 0;
        this.stopMusic();
        this.fadeBus(this.musicBus, .0001, .025);
        this.fadeBus(this.effectsBus, .0001, .02);
        this.fadeBus(this.master, .0001, .025);
        audioButton.textContent = '♪ MÚSICA: DESACTIVADA';
        audioButton.setAttribute('aria-pressed', 'false');
        this.suspendSoon(this.stateVersion, 100);
      }
    }

    setGameState(state) {
      if (!this.enabled) return;
      const canPlay = (state === 'READY' || state === 'PLAY') && game.visible && game.pageVisible;
      const version = ++this.stateVersion;
      if (this.suspendTimer) window.clearTimeout(this.suspendTimer);
      this.suspendTimer = 0;

      if (!canPlay) {
        this.stopMusic();
        this.fadeBus(this.musicBus, .0001, .025);
        if (state === 'OVER' && game.visible && game.pageVisible) {
          // Let the short crash cue finish; silence the soundtrack immediately.
          this.suspendSoon(version, 320);
        } else {
          this.fadeBus(this.effectsBus, .0001, .025);
          this.fadeBus(this.master, .0001, .025);
          this.suspendSoon(version, 100);
        }
        return;
      }

      this.context.resume().then(() => {
        if (version !== this.stateVersion || !this.enabled || !game.visible || !game.pageVisible || game.state === 'PAUSED') return;
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.musicBus.gain.cancelScheduledValues(now);
        this.effectsBus.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(.0001, now);
        this.master.gain.linearRampToValueAtTime(.84, now + .09);
        this.musicBus.gain.setValueAtTime(.0001, now);
        this.musicBus.gain.linearRampToValueAtTime(.8, now + .1);
        this.effectsBus.gain.setValueAtTime(.0001, now);
        this.effectsBus.gain.linearRampToValueAtTime(.72, now + .04);
        this.startMusic();
      }).catch(() => {});
    }

    fadeBus(bus, target, timeConstant) {
      if (!this.context || !bus) return;
      const now = this.context.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(Math.max(.0001, target), now, timeConstant);
    }

    suspendSoon(version, delay) {
      if (this.suspendTimer) window.clearTimeout(this.suspendTimer);
      this.suspendTimer = window.setTimeout(() => {
        this.suspendTimer = 0;
        if (version === this.stateVersion && this.context?.state === 'running') {
          this.context.suspend().catch(() => {});
        }
      }, delay);
    }

    startMusic() {
      if (!this.enabled || !this.context || this.context.state !== 'running' || this.musicTimer) return;
      this.musicStep = 0;
      this.nextNoteAt = this.context.currentTime + .06;
      this.scheduleMusic();
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 40);
    }

    stopMusic() {
      if (this.musicTimer) window.clearInterval(this.musicTimer);
      this.musicTimer = 0;
      this.musicStep = 0;
    }

    midiFrequency(note) {
      return 440 * 2 ** ((note - 69) / 12);
    }

    voice(frequency, startAt, duration, shape, volume, bus = this.musicBus) {
      if (!this.context || !bus) return;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      envelope.gain.setValueAtTime(.0001, startAt);
      envelope.gain.linearRampToValueAtTime(volume, startAt + .012);
      envelope.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
      oscillator.connect(envelope);
      envelope.connect(bus);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + .025);
    }

    scheduleMusic() {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const horizon = this.context.currentTime + .14;
      while (this.nextNoteAt < horizon) {
        const step = this.musicStep % 32;
        const bar = Math.floor(step / 8);
        const beat = step % 8;
        const at = this.nextNoteAt;

        if (beat === 0) {
          for (const note of this.chords[bar]) {
            this.voice(this.midiFrequency(note + 12), at, this.stepSeconds * 5.6, 'triangle', .02);
          }
          this.voice(this.midiFrequency(this.bassNotes[bar]), at, this.stepSeconds * 1.55, 'triangle', .05);
        } else if (beat === 4) {
          this.voice(this.midiFrequency(this.bassNotes[bar] + 7), at, this.stepSeconds * 1.1, 'triangle', .032);
        }

        const melodyNote = this.melody[step];
        if (melodyNote) {
          this.voice(this.midiFrequency(melodyNote), at, this.stepSeconds * .78, 'square', .034);
          this.voice(this.midiFrequency(melodyNote + 12), at, this.stepSeconds * .34, 'triangle', .008);
        }

        this.musicStep++;
        this.nextNoteAt += this.stepSeconds;
      }
    }

    tone(frequency, duration = .1, type = 'square', volume = .035) {
      if (!this.enabled || !this.context || this.context.state !== 'running') return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, this.context.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.context.currentTime + .008);
      gain.gain.exponentialRampToValueAtTime(.0001, this.context.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(this.effectsBus);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration);
    }
    jump() { this.tone(330, .11, 'square', .03); }
    point() { this.tone(640, .08, 'square', .025); }
    crash() { this.tone(120, .22, 'sawtooth', .04); }
  }

  const canvas = $('#arcadeCanvas');
  const stage = $('.game-stage');
  const startButton = $('#startGameBtn');
  const pauseButton = $('#pauseGameBtn');
  const restartButton = $('#restartGameBtn');
  const jumpButton = $('#jumpBtn');
  const audioButton = $('#audioToggleBtn');
  const gameOverlay = $('#gameOverlay');
  const overlayTitle = $('#overlayTitle');
  const overlayText = $('#overlayText');
  const overlayAction = $('#overlayAction');
  const scoreNode = $('#scoreDisplay');
  const bestNode = $('#bestDisplay');
  const timeOfDayNode = $('#timeOfDay');
  const difficultyNode = $('#difficultyFill');
  const announceNode = $('#gameAnnouncement');
  if (!canvas || !stage) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const audio = new ArcadeAudio();
  const W = 480;
  const H = 180;
  const GROUND = 132;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CYCLE_MS = REDUCED_MOTION ? 300000 : 90000;
  canvas.width = W * 2;
  canvas.height = H * 2;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const mix = (a, b, amount) => a.map((value, i) => Math.round(value + (b[i] - value) * amount));
  const rgb = color => `rgb(${color[0]} ${color[1]} ${color[2]})`;
  const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
  const skyStops = [
    { at: 0, top: [39, 49, 82], horizon: [222, 129, 124], far: [62, 75, 102], near: [34, 47, 62], ground: [35, 42, 48], road: [28, 33, 42] },
    { at: .25, top: [69, 159, 192], horizon: [255, 207, 139], far: [69, 112, 127], near: [40, 79, 84], ground: [40, 78, 77], road: [39, 46, 54] },
    { at: .5, top: [87, 64, 110], horizon: [255, 139, 121], far: [81, 61, 103], near: [47, 42, 71], ground: [41, 39, 51], road: [30, 32, 43] },
    { at: .75, top: [12, 20, 47], horizon: [69, 47, 91], far: [23, 31, 63], near: [17, 28, 43], ground: [20, 30, 37], road: [18, 24, 33] },
    { at: 1, top: [39, 49, 82], horizon: [222, 129, 124], far: [62, 75, 102], near: [34, 47, 62], ground: [35, 42, 48], road: [28, 33, 42] }
  ];

  const buildings = Array.from({ length: 15 }, (_, index) => ({
    x: index * 38 - 5,
    width: 22 + Math.floor(Math.random() * 13),
    height: 20 + Math.floor(Math.random() * 34),
    style: index % 4,
    neon: index % 4 === 0 ? [255, 115, 137] : [99, 220, 224],
    windows: Array.from({ length: 12 }, () => Math.random() > .36)
  }));
  const stars = Array.from({ length: 36 }, () => ({
    x: Math.floor(Math.random() * W),
    y: 8 + Math.floor(Math.random() * 66),
    size: Math.random() > .78 ? 2 : 1,
    phase: Math.random() * Math.PI * 2
  }));
  const clouds = [
    { x: 48, y: 31, speed: .12, width: 37 }, { x: 223, y: 47, speed: .08, width: 28 }, { x: 390, y: 25, speed: .1, width: 34 }
  ];
  const spriteColors = {
    H: '#272536', G: '#b9c9c7', P: '#eef0dc', S: '#e4aa8b', T: '#a96560',
    C: '#68dce0', N: '#18202b', E: '#f4e9c8', R: '#ee708d', B: '#3cbbd0',
    L: '#c8ff48', M: '#aa496c', J: '#273047', V: '#46536e', W: '#f4eddf', Y: '#e9c96e'
  };
  const runnerHead = [
    '.......HHHH.......', '......HGGGGH......', '.....HGGPPGGH.....',
    '....CHHHHHHHHHC...', '....CSSSSSSSSC....', '...CCSSNSSSNSSC...',
    '....CSSSSSSSSC....', '.....CTTTTTC......', '......SSSSSS......'
  ];
  const runnerTorso = [
    '.....HHRRRRHH.....', '....HHRRRRRRHH....', '...HHRRLLBBRRHH...',
    '...HRRBLCCLBRRH...', '..HHRRBLCCLBBRRH..', '..HRRBBCCCCBBRRH..',
    '...HRRBBBBBBRRH...', '....HBBLLBBBH.....', '.....HBBBBH.......',
    '.....HHMMHH.......', '....HHMMMMHH......'
  ];
  const runnerLegs = [
    ['....JJ....JJ....', '....JJ....VV....', '...JJ......VV...', '..JJ........VV..', '..WW........WW..'],
    ['.....JJ..JJ.....', '....JJ....JJ.....', '...VV......JJ....', '..VV........JJ..', '..WW........WW..'],
    ['....JJ....JJ....', '...JJ......JJ...', '..VV........VV..', '..JJ........JJ..', '.WW..........WW.'],
    ['.....JJ..JJ.....', '.....VV..VV......', '....JJ....JJ.....', '...JJ......VV...', '..WW........WW..']
  ];
  const runParticles = [];

  const game = {
    state: 'READY',
    sceneFrames: 0,
    worldTime: 0,
    score: 0,
    best: 0,
    speed: 3.15,
    spawnTimer: 82,
    obstacles: [],
    player: { x: 73, y: GROUND - 30, width: 18, height: 30, velocityY: 0, grounded: true },
    frame: 0,
    raf: 0,
    rafIsTimeout: false,
    visible: false,
    pageVisible: !document.hidden,
    autoPaused: false,
    lastPeriod: ''
  };

  try {
    game.best = Math.max(0, Number(localStorage.getItem('carlon_play_arcade_best')) || 0);
  } catch { game.best = 0; }

  const formatScore = number => String(Math.floor(number)).padStart(5, '0');
  const updateHud = () => {
    scoreNode.textContent = formatScore(game.score);
    bestNode.textContent = formatScore(game.best);
    const level = Math.min(10, Math.floor(game.score / 500) + 1);
    difficultyNode.style.width = `${level * 10}%`;
    difficultyNode.parentElement.setAttribute('aria-label', `Dificultad: nivel ${level} de 10`);
    difficultyNode.parentElement.setAttribute('aria-valuenow', String(level));
  };
  const announce = message => { announceNode.textContent = message; };

  function cycleInfo() {
    const phase = (game.worldTime % CYCLE_MS) / CYCLE_MS;
    let segment = 0;
    while (segment < skyStops.length - 2 && phase > skyStops[segment + 1].at) segment++;
    const from = skyStops[segment];
    const to = skyStops[segment + 1];
    const amount = (phase - from.at) / (to.at - from.at);
    const palette = {};
    for (const key of ['top', 'horizon', 'far', 'near', 'ground', 'road']) palette[key] = mix(from[key], to[key], amount);
    const names = ['AMANECER', 'DÍA', 'ATARDECER', 'NOCHE'];
    const periodIndex = Math.floor(phase * 4) % 4;
    const daylight = Math.max(0, Math.sin(phase * Math.PI * 2));
    const night = clamp((-Math.sin(phase * Math.PI * 2) + .25) / 1.25, 0, 1);
    return { phase, palette, name: names[periodIndex], daylight, night };
  }

  function drawSky(cycle) {
    const p = cycle.palette;
    ctx.fillStyle = rgb(p.top);
    ctx.fillRect(0, 0, W, 112);
    for (let y = 0; y < 112; y += 4) {
      const amount = y / 112;
      ctx.fillStyle = rgb(mix(p.top, p.horizon, amount));
      ctx.fillRect(0, y, W, 4);
    }

    for (const star of stars) {
      const twinkle = REDUCED_MOTION ? .72 : .62 + Math.sin(game.worldTime * .002 + star.phase) * .12;
      ctx.fillStyle = rgba([238, 234, 255], clamp(cycle.night * twinkle, 0, .82));
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    const sunX = 38 + cycle.phase * (W - 76);
    const sunHeight = Math.sin(cycle.phase * Math.PI * 2 - .15);
    if (sunHeight > -.08) {
      const sunY = 87 - Math.max(0, sunHeight) * 59;
      const sunColor = cycle.phase > .42 && cycle.phase < .59 ? [255, 151, 128] : [255, 216, 145];
      ctx.fillStyle = rgba(sunColor, .16);
      ctx.fillRect(sunX - 16, sunY - 16, 32, 32);
      ctx.fillStyle = rgb(sunColor);
      ctx.fillRect(sunX - 7, sunY - 7, 14, 14);
      ctx.fillRect(sunX - 5, sunY - 9, 10, 18);
    } else {
      const moonX = 42 + ((cycle.phase - .5) / .5) * (W - 84);
      ctx.fillStyle = rgba([219, 233, 255], cycle.night * .95);
      ctx.fillRect(moonX - 5, 28, 10, 10);
      ctx.fillStyle = rgba(p.top, cycle.night * .9);
      ctx.fillRect(moonX - 1, 25, 9, 9);
    }

    for (const cloud of clouds) {
      const x = ((cloud.x + game.sceneFrames * cloud.speed) % (W + 50)) - 25;
      ctx.fillStyle = rgba([238, 190, 180], .12 + cycle.daylight * .13);
      ctx.fillRect(x, cloud.y, cloud.width, 3);
      ctx.fillRect(x + 6, cloud.y - 3, cloud.width - 12, 3);
    }
  }

  function drawPalm(x, baseY, night) {
    x = Math.round(x);
    const trunkTop = baseY - 32;
    ctx.fillStyle = '#302b36';
    ctx.fillRect(x, trunkTop + 8, 4, 25);
    ctx.fillRect(x - 2, trunkTop + 20, 3, 3);
    ctx.fillStyle = '#806052';
    ctx.fillRect(x + 1, trunkTop + 10, 2, 19);
    ctx.fillRect(x - 1, trunkTop + 22, 3, 2);

    const frond = night > .58 ? '#245149' : '#23684f';
    const highlight = night > .58 ? '#367060' : '#43875d';
    ctx.fillStyle = frond;
    ctx.fillRect(x - 2, trunkTop + 3, 7, 5);
    // Five broad, stepped fronds make a readable palm silhouette at 2× pixel scale.
    ctx.fillRect(x - 12, trunkTop - 3, 12, 3);
    ctx.fillRect(x - 17, trunkTop, 8, 3);
    ctx.fillRect(x + 3, trunkTop - 4, 12, 3);
    ctx.fillRect(x + 9, trunkTop - 1, 9, 3);
    ctx.fillRect(x - 8, trunkTop - 10, 4, 10);
    ctx.fillRect(x + 2, trunkTop - 11, 4, 11);
    ctx.fillRect(x - 7, trunkTop - 8, 5, 3);
    ctx.fillRect(x + 3, trunkTop - 9, 5, 3);
    ctx.fillStyle = highlight;
    ctx.fillRect(x - 15, trunkTop - 4, 6, 1);
    ctx.fillRect(x + 8, trunkTop - 5, 6, 1);
    ctx.fillRect(x - 6, trunkTop - 7, 2, 3);
    ctx.fillRect(x + 3, trunkTop - 8, 2, 3);
  }

  function drawStreetLamp(x, cycle) {
    x = Math.round(x);
    ctx.fillStyle = '#222b35';
    ctx.fillRect(x, 105, 2, 22);
    ctx.fillRect(x - 5, 104, 7, 2);
    ctx.fillStyle = rgba([255, 200, 143], .16 + cycle.night * .72);
    ctx.fillRect(x - 5, 106, 11, 5);
    ctx.fillStyle = rgba([255, 219, 161], .2 + cycle.night * .8);
    ctx.fillRect(x - 2, 105, 5, 2);
    ctx.fillStyle = '#28313a';
    ctx.fillRect(x - 3, 126, 8, 2);
  }

  function drawCity(cycle) {
    const p = cycle.palette;
    ctx.fillStyle = rgb(p.far);
    ctx.fillRect(0, 93, W, 24);
    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i];
      const scroll = game.sceneFrames * (game.speed * .1 + .35);
      const x = ((building.x - scroll) % (W + 45) + W + 45) % (W + 45) - 20;
      const top = 113 - building.height;
      const face = i % 3 === 0 ? mix(p.far, [97, 68, 116], cycle.night * .32) : p.far;
      ctx.fillStyle = rgb(face);
      ctx.fillRect(x, top, building.width, building.height);
      ctx.fillStyle = rgba([4, 12, 24], .3);
      ctx.fillRect(x + building.width - 4, top, 4, building.height);
      ctx.fillStyle = rgba([207, 224, 227], .12);
      ctx.fillRect(x + 2, top + 3, 1, Math.max(3, building.height - 5));

      // Art-deco roof steps and restrained neon signage keep the skyline legible.
      if (building.height > 31) {
        ctx.fillStyle = rgb(mix(face, [10, 17, 29], .45));
        ctx.fillRect(x + 3, top - 3, building.width - 6, 3);
        if (building.style === 1) ctx.fillRect(x + Math.floor(building.width / 2), top - 8, 2, 5);
      }
      if (building.style === 0) {
        ctx.fillStyle = rgba(building.neon, .18 + cycle.night * .62);
        ctx.fillRect(x + 3, top + 5, building.width - 9, 5);
        ctx.fillStyle = rgba(building.neon, .55 + cycle.night * .4);
        ctx.fillRect(x + 4, top + 6, Math.max(3, building.width - 12), 1);
        ctx.fillRect(x + 4, top + 8, Math.max(3, building.width - 14), 1);
      }

      ctx.fillStyle = rgba([255, 203, 135], cycle.night * .88 + .1);
      building.windows.forEach((lit, index) => {
        if (!lit) return;
        const wx = x + 4 + (index % 3) * 7;
        const wy = top + 13 + Math.floor(index / 3) * 7;
        if (wx < x + building.width - 5 && wy < 112) {
          ctx.fillRect(wx, wy, 3, 3);
          ctx.fillStyle = rgba([255, 234, 186], cycle.night * .38 + .08);
          ctx.fillRect(wx, wy, 1, 2);
          ctx.fillStyle = rgba([255, 203, 135], cycle.night * .88 + .1);
        }
      });
    }

    const palmShift = (game.sceneFrames * (game.speed * .16 + .5)) % 210;
    drawPalm(42 - palmShift, 125, cycle.night);
    drawPalm(250 - palmShift, 125, cycle.night);
    drawPalm(460 - palmShift, 125, cycle.night);
    const lampShift = (game.sceneFrames * (game.speed * .24 + .4)) % 240;
    drawStreetLamp(175 - lampShift, cycle);
    drawStreetLamp(415 - lampShift, cycle);

    // Coastal strip and sunset reflections.
    ctx.fillStyle = rgb(mix(p.near, p.horizon, .2));
    ctx.fillRect(0, 114, W, 11);
    ctx.fillStyle = rgba([255, 174, 136], .15 + cycle.night * .12);
    for (let i = 0; i < 12; i++) {
      const reflectionX = ((i * 47 - game.sceneFrames * .7) % W + W) % W;
      ctx.fillRect(reflectionX, 116 + (i % 3) * 2, 14 + (i % 4) * 3, 1);
    }
  }

  function drawRoad(cycle) {
    const p = cycle.palette;
    ctx.fillStyle = rgb(p.ground);
    ctx.fillRect(0, 125, W, 9);
    ctx.fillStyle = rgba([255, 226, 185], .72);
    ctx.fillRect(0, 125, W, 2);
    ctx.fillStyle = rgba([255, 115, 137], cycle.night * .46);
    ctx.fillRect(0, 127, W, 1);
    ctx.fillStyle = rgb(p.road);
    ctx.fillRect(0, 134, W, H - 134);
    ctx.fillStyle = rgba([255, 255, 255], .13);
    ctx.fillRect(0, 135, W, 1);
    ctx.fillStyle = rgba([200, 255, 72], .82);
    const dashOffset = (game.sceneFrames * game.speed * .15) % 64;
    for (let x = -64; x < W + 64; x += 64) {
      ctx.fillRect(x - dashOffset, 157, 28, 2);
      ctx.fillRect(x - dashOffset, 158, 24, 1);
    }
    ctx.fillStyle = rgba([255, 255, 255], .07);
    for (let i = 0; i < 13; i++) {
      const x = ((i * 53 - game.sceneFrames * game.speed * .3) % W + W) % W;
      ctx.fillRect(x, 169 + (i % 3) * 3, 8 + (i % 5) * 3, 1);
    }
  }

  function drawPixelRows(rows, x, y, maxWidth = 18) {
    let activeColor = '';
    rows.forEach((row, rowIndex) => {
      const offsetX = Math.floor((maxWidth - row.length) / 2);
      for (let column = 0; column < row.length; column++) {
        const color = spriteColors[row[column]];
        if (!color) continue;
        if (color !== activeColor) {
          ctx.fillStyle = color;
          activeColor = color;
        }
        ctx.fillRect(x + offsetX + column, y + rowIndex, 1, 1);
      }
    });
  }

  function drawParticles() {
    for (const particle of runParticles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function burst(x, y, colors, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = .7 + (i % 3) * .25;
      runParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - .35,
        life: 20 + (i % 4) * 3,
        maxLife: 20 + (i % 4) * 3,
        size: i % 3 === 0 ? 2 : 1,
        color: colors[i % colors.length]
      });
    }
  }

  function updateParticles(dt) {
    for (const particle of runParticles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += .035 * dt;
      particle.life -= dt;
    }
    for (let i = runParticles.length - 1; i >= 0; i--) {
      if (runParticles[i].life <= 0) runParticles.splice(i, 1);
    }
  }

  function drawPlayer() {
    const player = game.player;
    const idleLift = game.state === 'READY' && !REDUCED_MOTION ? Math.round(Math.sin(game.worldTime * .003) * 1.2) : 0;
    const x = Math.round(player.x);
    const y = Math.round(player.y + idleLift);
    const legFrame = player.grounded ? Math.floor(game.frame / 4) % runnerLegs.length : 2;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(x - 3, GROUND + 1, 24, 3);
    // Original, multi-part sprite: silver hair, headphones, glasses and split-color jacket.
    drawPixelRows(runnerLegs[legFrame], x, y + 20);
    drawPixelRows(runnerTorso, x, y + 9);
    drawPixelRows(runnerHead, x, y);
    ctx.fillStyle = Math.floor(game.frame / 9) % 2 === 0 ? '#fff0bd' : '#9ef5e3';
    ctx.fillRect(x + 15, y + 12, 1, 1);
  }

  function drawPoliceCar(obstacle) {
    const x = Math.round(obstacle.x);
    const y = GROUND - 21;
    const flash = REDUCED_MOTION || Math.floor(game.frame / 7) % 2 === 0;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(x - 3, GROUND + 1, 59, 3);
    // Original compact patrol cruiser, detailed for the game's 2× pixel grid.
    ctx.fillStyle = '#111b28';
    ctx.fillRect(x + 2, y + 9, 51, 10);
    ctx.fillRect(x + 6, y + 6, 42, 12);
    ctx.fillRect(x + 13, y + 2, 27, 9);
    ctx.fillStyle = '#dce7e5';
    ctx.fillRect(x + 15, y + 4, 10, 5);
    ctx.fillRect(x + 27, y + 4, 10, 5);
    ctx.fillStyle = '#354c63';
    ctx.fillRect(x + 16, y + 5, 8, 3);
    ctx.fillRect(x + 28, y + 5, 8, 3);
    ctx.fillStyle = '#f1eee3';
    ctx.fillRect(x + 4, y + 10, 47, 6);
    ctx.fillStyle = '#27354a';
    ctx.fillRect(x + 4, y + 15, 47, 3);
    ctx.fillStyle = '#c8ff48';
    ctx.fillRect(x + 5, y + 11, 8, 2);
    ctx.fillStyle = '#152232';
    ctx.fillRect(x + 17, y + 11, 3, 3);
    ctx.fillRect(x + 23, y + 11, 3, 3);
    ctx.fillStyle = '#080c13';
    ctx.fillRect(x + 8, y + 16, 11, 5);
    ctx.fillRect(x + 38, y + 16, 11, 5);
    ctx.fillStyle = '#8eafbb';
    ctx.fillRect(x + 11, y + 17, 5, 2);
    ctx.fillRect(x + 41, y + 17, 5, 2);
    ctx.fillStyle = flash ? '#ff7389' : '#63dce0';
    ctx.fillRect(x + 23, y, 7, 3);
    ctx.fillStyle = flash ? '#63dce0' : '#ff7389';
    ctx.fillRect(x + 30, y, 7, 3);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillRect(x + 50, y + 11, 2, 3);
  }

  function drawScene() {
    const cycle = cycleInfo();
    ctx.fillStyle = rgb(cycle.palette.top);
    ctx.fillRect(0, 0, W, H);
    drawSky(cycle);
    drawCity(cycle);
    drawRoad(cycle);
    game.obstacles.forEach(drawPoliceCar);
    drawParticles();
    drawPlayer();
    if (timeOfDayNode && cycle.name !== game.lastPeriod) {
      timeOfDayNode.textContent = cycle.name;
      if (game.lastPeriod && game.state === 'PLAY') announce(`Cambió el ciclo: ${cycle.name.toLowerCase()}.`);
      game.lastPeriod = cycle.name;
    }
  }

  function setState(state) {
    game.state = state;
    audio.setGameState(state);
    pauseButton.textContent = state === 'PAUSED' ? '▶ REANUDAR' : 'Ⅱ PAUSAR';
    pauseButton.setAttribute('aria-pressed', String(state === 'PAUSED'));
    pauseButton.disabled = state === 'READY' || state === 'OVER';
    startButton.disabled = state === 'PLAY' || state === 'PAUSED';
    gameOverlay.hidden = state === 'PLAY';

    const copy = {
      READY: ['Una noche, una carrera.', 'Saltá las patrullas. Cada tramo acelera un poco más.'],
      PAUSED: ['Pausa en la ciudad.', 'La partida queda guardada aquí. Volvé cuando quieras.'],
      OVER: ['Fin de la carrera.', `Puntuación: ${formatScore(game.score)} · Récord: ${formatScore(game.best)}`]
    }[state];
    if (copy) {
      overlayTitle.textContent = copy[0];
      overlayText.textContent = copy[1];
      overlayAction.textContent = state === 'OVER' ? '↻ JUGAR OTRA VEZ' : state === 'PAUSED' ? '▶ SEGUIR JUGANDO' : '▶ INICIAR PARTIDA';
      announce(copy[0]);
    }
    if (state === 'PLAY') announce('Partida en curso. Enfocá el juego y presioná espacio o flecha arriba para saltar.');
  }

  function resetRun() {
    game.sceneFrames = 0;
    game.score = 0;
    game.speed = 3.15;
    game.spawnTimer = 82;
    game.obstacles = [];
    runParticles.length = 0;
    game.player.y = GROUND - game.player.height;
    game.player.velocityY = 0;
    game.player.grounded = true;
    game.frame = 0;
    updateHud();
  }

  function beginRun() {
    if (game.state === 'READY') stopLoop();
    if (game.state === 'OVER') resetRun();
    game.autoPaused = false;
    setState('PLAY');
    canvas.focus({ preventScroll: true });
    ensureLoop();
  }

  function jumpOrStart() {
    if (game.state === 'READY' || game.state === 'OVER') {
      beginRun();
      return;
    }
    if (game.state !== 'PLAY' || !game.player.grounded) return;
    game.player.velocityY = -8.1;
    game.player.grounded = false;
    burst(game.player.x + 9, GROUND - 1, ['#c8ff48', '#f4eddf', '#63dce0'], 5);
    audio.jump();
  }

  function spawnObstacle() {
    const last = game.obstacles[game.obstacles.length - 1];
    if (last && last.x > W - 170) return;
    game.obstacles.push({ x: W + 10, width: 54, passed: false });
  }

  function collides(obstacle) {
    const p = game.player;
    const car = { left: obstacle.x + 3, right: obstacle.x + 51, top: GROUND - 21, bottom: GROUND };
    const runner = { left: p.x + 2, right: p.x + p.width - 1, top: p.y + 3, bottom: p.y + p.height };
    return runner.left < car.right && runner.right > car.left && runner.top < car.bottom && runner.bottom > car.top;
  }

  function finishRun() {
    audio.crash();
    if (game.score > game.best) {
      game.best = game.score;
      try { localStorage.setItem('carlon_play_arcade_best', String(game.best)); } catch { /* Score still works without storage. */ }
    }
    updateHud();
    burst(game.player.x + 9, GROUND - 8, ['#ff7389', '#f4eddf', '#c8ff48'], 12);
    setState('OVER');
  }

  function updateGame(delta) {
    const dt = clamp(delta / 16.667, 0, 2);
    game.sceneFrames += dt;
    game.worldTime += delta;
    game.frame += dt;
    updateParticles(dt);
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      spawnObstacle();
      const level = Math.min(10, Math.floor(game.score / 500) + 1);
      const interval = Math.max(49, 94 - (level - 1) * 5);
      game.spawnTimer = interval + Math.random() * 17;
    }

    const level = Math.min(10, Math.floor(game.score / 500) + 1);
    game.speed = Math.min(6.8, 3.15 + (level - 1) * .4);
    game.player.velocityY += .43 * dt;
    game.player.y += game.player.velocityY * dt;
    if (game.player.y >= GROUND - game.player.height) {
      game.player.y = GROUND - game.player.height;
      game.player.velocityY = 0;
      game.player.grounded = true;
    }

    for (const obstacle of game.obstacles) {
      obstacle.x -= game.speed * dt;
      if (collides(obstacle)) {
        finishRun();
        return;
      }
      if (!obstacle.passed && obstacle.x + obstacle.width < game.player.x) {
        obstacle.passed = true;
        game.score += 100;
        const level = Math.min(10, Math.floor(game.score / 500) + 1);
        game.speed = Math.min(6.8, 3.15 + (level - 1) * .4);
        updateHud();
        burst(game.player.x + 13, game.player.y + 10, ['#c8ff48', '#63dce0', '#f5f1e8'], 7);
        audio.point();
      }
    }
    game.obstacles = game.obstacles.filter(obstacle => obstacle.x > -60);
  }

  function loop(timestamp) {
    game.raf = 0;
    game.rafIsTimeout = false;
    if (!game.visible || !game.pageVisible) return;
    const elapsed = game.lastTimestamp ? Math.max(0, timestamp - game.lastTimestamp) : 16.667;
    const delta = game.state === 'READY' ? elapsed : Math.min(40, elapsed);
    game.lastTimestamp = timestamp;
    if (game.state === 'PLAY') {
      updateGame(delta);
      drawScene();
    } else if (game.state === 'READY') {
      game.worldTime += delta;
      drawScene();
    }
    if (game.state === 'PLAY' || game.state === 'READY') {
      scheduleLoop();
    }
  }

  function scheduleLoop() {
    if (game.raf || !game.visible || !game.pageVisible) return;
    if (game.state === 'READY') {
      game.rafIsTimeout = true;
      const idleRate = REDUCED_MOTION ? 250 : 100;
      game.raf = window.setTimeout(() => loop(performance.now()), idleRate);
    } else if (game.state === 'PLAY') {
      game.rafIsTimeout = false;
      game.raf = requestAnimationFrame(loop);
    }
  }

  function ensureLoop() {
    if (!game.raf && game.visible && game.pageVisible && (game.state === 'PLAY' || game.state === 'READY')) {
      game.lastTimestamp = 0;
      scheduleLoop();
    }
  }

  function stopLoop() {
    if (game.raf) {
      if (game.rafIsTimeout) window.clearTimeout(game.raf);
      else cancelAnimationFrame(game.raf);
    }
    game.raf = 0;
    game.rafIsTimeout = false;
    game.lastTimestamp = 0;
  }

  startButton.addEventListener('click', beginRun);
  overlayAction.addEventListener('click', () => {
    if (game.state === 'PAUSED') beginRun();
    else beginRun();
  });
  pauseButton.addEventListener('click', () => {
    if (game.state === 'PLAY') {
      game.autoPaused = false;
      setState('PAUSED');
    } else if (game.state === 'PAUSED') {
      game.autoPaused = false;
      setState('PLAY');
      canvas.focus({ preventScroll: true });
      ensureLoop();
    }
  });
  restartButton.addEventListener('click', () => {
    resetRun();
    setState('READY');
    ensureLoop();
    startButton.focus();
  });
  jumpButton.addEventListener('click', jumpOrStart);
  audioButton.addEventListener('click', () => audio.toggle());
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    jumpOrStart();
  });
  canvas.addEventListener('keydown', event => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      jumpOrStart();
    } else if (event.code === 'Escape' && game.state === 'PLAY') {
      event.preventDefault();
      game.autoPaused = false;
      setState('PAUSED');
      overlayAction.focus();
    }
  });
  updateHud();
  setState('READY');
  drawScene();

  const onVisibilityChange = () => {
    game.pageVisible = !document.hidden;
    if (!game.pageVisible && game.state === 'PLAY') {
      game.autoPaused = true;
      setState('PAUSED');
    } else if (game.pageVisible && game.autoPaused) {
      game.autoPaused = false;
      announce('Partida pausada al ocultar la página. Presioná reanudar para seguir.');
    }
    audio.setGameState(game.state);
    if (game.pageVisible) ensureLoop();
    else stopLoop();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  if ('IntersectionObserver' in window) {
    const gameObserver = new IntersectionObserver(entries => {
      const isVisible = entries.some(entry => entry.intersectionRatio >= .05);
      game.visible = isVisible;
      if (!isVisible && game.state === 'PLAY') {
        game.autoPaused = true;
        setState('PAUSED');
      } else if (isVisible && game.autoPaused && game.pageVisible) {
        game.autoPaused = false;
        announce('Partida pausada al salir de la sección. Presioná reanudar para seguir.');
      }
      audio.setGameState(game.state);
      if (isVisible) ensureLoop();
      else stopLoop();
    }, { threshold: .05 });
    gameObserver.observe(stage);
  } else {
    game.visible = true;
    audio.setGameState(game.state);
    ensureLoop();
  }
})();
