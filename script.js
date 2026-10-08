/* ═════════════════════════════════════════════════════════════════
   DOSSIER · interactions
   - Live PT clock, "REV" footer date
   - Quiet custom cursor (over interactive things, over text)
   - Subtle reveal-on-scroll
   - Terminal modal w/ personal commands:
       help · about · projects · stack · contact · resume
       now · letterboxd · mcdavid · variance97
       open <section> · whoami · ls · cat · clear · echo
       dd · bat       (easter eggs)
       sudo · rm      (gags)
   ═════════════════════════════════════════════════════════════════ */

(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const isCoarse    = matchMedia('(pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. live PT clock ─────────────────────────────────── */
  const clockEl = $('#clock');
  const tickClock = () => {
    if (!clockEl) return;
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    clockEl.textContent = `${fmt.format(new Date())} PT`;
  };
  tickClock();
  setInterval(tickClock, 1000);

  /* ── 2. footer dates ──────────────────────────────────── */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // document.lastModified is the page's own publish time (GitHub Pages sends Last-Modified),
  // so these show when the site actually changed rather than today's date.
  const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  const published = new Date(document.lastModified);
  const lastEdit = $('#last-edit');
  const nowUpdated = $('#now-updated');
  if (!Number.isNaN(+published)) {
    if (lastEdit)   lastEdit.textContent   = fmtDate(published);
    if (nowUpdated) nowUpdated.textContent = fmtDate(published);
  }

  /* ── 3. reveal on scroll (subtle) ─────────────────────── */
  const revealTargets = $$('section > .section-bar, section > .card, .log__row, .stack__group, .note, .dossier__name, .dossier__sheet, .dossier__transition, .contact__email, .contact__line, .work__lede, .now__lede');
  revealTargets.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-in'));
  }

  /* ── 5. sports — daily-fresh seasonal status ──────────────
     The page reads the date on every load and decides each
     league's status:
       · in-season  → "go <team>"  (regular / playoffs)
       · offseason  → "awaiting the return"
     Season windows below are league-typical; tweak if dates
     drift in a given year.
     ────────────────────────────────────────────────────── */
  const SPORTS_CONFIG = {
    NBA: {
      team: 'Los Angeles Lakers',  inSeason: 'LAKESHOW!',
      regular:  [10, 22, 4, 12],   // Oct 22 → Apr 12
      playoffs: [4, 13, 6, 22],    // Apr 13 → Jun 22
    },
    MLB: {
      team: 'Los Angeles Dodgers', inSeason: 'living in blue heaven',
      regular:  [3, 27, 9, 28],    // Mar 27 → Sep 28
      playoffs: [10, 1, 11, 5],    // Oct 1  → Nov 5
    },
    NFL: {
      team: 'Los Angeles Rams',    inSeason: 'RAMS HOUSE!',
      regular:  [9, 4, 1, 6],      // Sep 4  → Jan 6 (wraps year)
      playoffs: [1, 10, 2, 9],     // Jan 10 → Feb 9
    },
    NHL: {
      team: 'Los Angeles Kings',   inSeason: 'go kings go!',
      regular:  [10, 7, 4, 18],    // Oct 7  → Apr 18
      playoffs: [4, 19, 6, 22],    // Apr 19 → Jun 22
    },
  };

  // [startMonth, startDay, endMonth, endDay] — handles year-wrap
  const inWindow = (d, [sm, sd, em, ed]) => {
    const t = (d.getMonth() + 1) * 100 + d.getDate();
    const s = sm * 100 + sd, e = em * 100 + ed;
    return s <= e ? (t >= s && t <= e) : (t >= s || t <= e);
  };

  const sportStatus = (cfg, d) => {
    if (inWindow(d, cfg.playoffs)) return { active: true,  meta: 'playoffs',       action: cfg.inSeason };
    if (inWindow(d, cfg.regular))  return { active: true,  meta: 'regular season', action: cfg.inSeason };
    return { active: false, meta: 'offseason', action: 'awaiting the return' };
  };

  $$('.team[data-sport]').forEach((row) => {
    const cfg = SPORTS_CONFIG[row.dataset.sport];
    if (!cfg) return;
    const s = sportStatus(cfg, new Date());
    row.classList.toggle('is-inactive', !s.active);
    const actEl = row.querySelector('[data-sport-action]');
    if (actEl) actEl.textContent = s.action;
  });

  /* ── 6. terminal ──────────────────────────────────────── */
  const terminal  = $('#terminal');
  const termBody  = $('#terminal-body');
  const termForm  = $('#terminal-form');
  const termInput = $('#terminal-cmd');
  const termClose = $('#terminal-close');

  const openTerm  = () => { if (terminal) { terminal.hidden = false; setTimeout(() => termInput?.focus(), 30); } };
  const closeTerm = () => { if (terminal) terminal.hidden = true; };

  termClose?.addEventListener('click', closeTerm);
  terminal?.addEventListener('click', (e) => { if (e.target === terminal) closeTerm(); });

  addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA';
    if (e.key === '`' && !inField) {
      e.preventDefault();
      terminal?.hidden ? openTerm() : closeTerm();
    }
    if (e.key === 'Escape') closeTerm();
  });

  const print = (html, opts = {}) => {
    const line = document.createElement('div');
    line.className = 'terminal__line' + (opts.user ? ' user' : '');
    line.innerHTML = `<span class="terminal__prompt">${opts.user ? '>' : '$'}</span><span>${html}</span>`;
    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
  };

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));

  // ── personal command set ──
  const COMMANDS = {
    help: () => [
      'available commands:',
      '  <em>about</em>       — who I am',
      '  <em>projects</em>    — list selected work',
      '  <em>stack</em>       — what I build with',
      '  <em>now</em>         — what I\'m currently consuming',
      '  <em>letterboxd</em>  — recent watches',
      '  <em>mcdavid</em>     — variance97 mini-readout',
      '  <em>variance97</em>  — same as above',
      '  <em>contact</em>     — how to reach me',
      '  <em>resume</em>      — open resume (PDF)',
      '  <em>open &lt;section&gt;</em> — scroll to a section',
      '  <em>whoami</em>      — visitor info',
      '  <em>ls</em> · <em>cat</em> · <em>echo</em> · <em>clear</em>',
    ].join('<br/>'),

    about: () => [
      'kylan huynh · junior · uc san diego',
      'data science b.s. · class of 2028',
      '',
      'I work on small, careful things — sports analytics,',
      'ml research, and pipelines that respect the data.',
      'basketball data analyst @ ucsd athletics ·',
      'ml research assistant @ ucsd natural reserve system.',
      'currently looking for a summer \'27 internship.',
    ].join('<br/>'),

    projects: () => [
      '  P-01  <em>variance97</em>          — McDavid in high-stakes hockey · live dashboard',
      '  P-02  <em>floodiq</em>             — flood-risk scoring · DataHacks 2026 winner',
      '  P-03  <em>monsteradjustment</em>   — Roki Sasaki, NPB → MLB · pre-registered',
      '  P-04  <em>tilt</em>                — calibrated NHL ratings · live app',
      '  P-05  <em>fixturefeed</em>         — self-updating NFL calendars',
      '  P-06  <em>saystroop</em>           — voice-timed Stroop experiment · DSSS 2nd place',
      '  P-07  <em>rosterwatch</em>         — DS3 fantasy-football project · mentor',
    ].join('<br/>'),

    stack: () => 'Python · Java · TypeScript · pandas · NumPy · SciPy · scikit-learn · Plotly · Streamlit · Next.js · Supabase · GEE · git',

    now: () => {
      const watchLines = lbEntries.length
        ? lbEntries.slice(0, 3).map((e, i) => {
            const label = i === 0 ? 'watching ' : '         ';
            const yr    = e.year ? ` (${escapeHtml(e.year)})` : '';
            const rt    = e.rating ? `     ${escapeHtml(e.rating)}` : '';
            return `  ${label}  <em>${escapeHtml(e.title)}</em>${yr}${rt}`;
          })
        : ['  watching   <em>(letterboxd diary unavailable)</em>'];
      return [
        'currently:',
        ...watchLines,
        '  reading    <em>The Death and Life of Great American Cities</em> — Jacobs',
        '  mentoring  <em>rosterwatch</em> · DS3',
        '  grading    <em>monsteradjustment</em> predictions',
        '',
        'sports — see §05 (auto-updates with the calendar).',
      ].join('<br/>');
    },

    letterboxd: () => [
      'top 4 of all time —',
      '  ★★★★★  La La Land',
      '  ★★★★★  Rush Hour 2',
      '  ★★★★★  Batman: Under the Red Hood',
      '  ★★★★★  12 Angry Men',
      '  → letterboxd.com/kyyllannn',
    ].join('<br/>'),

    mcdavid: () => [
      '<span class="ascii">connor mcdavid · #97 · edmonton oilers</span>',
      '────────────────────────────────────',
      '  reg season ppg (5y avg)   <em>1.52</em>',
      '  playoff ppg (5y avg)      <em>1.31</em>',
      '  reg → playoff drop        <em>-13.8%</em>',
      '  cup finals record         <em>0–2</em>',
      '  4N / olympic gold         <em>1 / 0</em>',
      '────────────────────────────────────',
      'see project P-01 · variance97.',
    ].join('<br/>'),

    contact: () => 'email <em>huynh.kylan7@gmail.com</em> · or scroll to §06.',

    resume: () => {
      const href = $('.contact__links a[href*="drive.google.com"]')?.href;
      if (href) window.open(href, '_blank', 'noopener');
      return href ? 'opening resume (PDF) in a new tab…' : 'resume: see §06.';
    },

    whoami: () => `guest@dossier · session ${Math.random().toString(16).slice(2, 8)}`,

    ls: () => '01-dossier  02-work  03-log  04-stack  05-now  06-contact  README.md',

    '007': () => [
      '<span class="ascii">MI6 // EYES ONLY</span>',
      'agent file: kylan huynh · clearance granted.',
      '"sometimes the old ways are the best."',
    ].join('<br/>'),

    cat: (arg) => arg === 'README.md'
      ? 'dossier · a portfolio by kylan huynh · 2026.<br/>quiet by design. data leaks through.'
      : `cat: ${escapeHtml(arg || '')}: no such file`,

    echo: (arg) => escapeHtml(arg || ''),

    clear: () => { termBody.innerHTML = ''; return ''; },

    open: (arg) => {
      const id = (arg || '').toLowerCase();
      const map = {
        dossier: 'dossier', '01': 'dossier', home: 'dossier',
        work: 'work', projects: 'work', '02': 'work',
        log: 'log', timeline: 'log', '03': 'log',
        stack: 'stack', skills: 'stack', '04': 'stack',
        now: 'now', '05': 'now',
        contact: 'contact', '06': 'contact',
      };
      if (!id || !map[id]) return 'usage: open &lt;dossier|now|work|log|stack|contact&gt;';
      document.getElementById(map[id])?.scrollIntoView({ behavior: 'smooth' });
      closeTerm();
      return `→ scrolling to §${map[id]}`;
    },

    /* ── easter eggs ── (canon lines, swap freely) ── */
    dd: () => {
      const lines = [
        '"God\'s plan is like a beautiful tapestry."',
        '"I\'m not seeking penance for what I\'ve done, Father. I\'m asking forgiveness for what I\'m about to do."',
        '"You don\'t get to destroy who I am."',
        '"It beat you. I beat you."',
        '"Not even God can stop that now."',
        '"I would rather die as Daredevil than live as Matt Murdock."',
        '"I\'m a really good lawyer."',
        '"Take your shot."',
        '"I refuse to believe a tragedy had to destroy everything."',
        '"I\'m not playing pattycake with these fanboys. I\'m chopping \'em up."',
        '"I have shown him that a man without hope is a man without fear."',
        '"One batch, two batch, penny and dime."',
        '"Guilt can be a good thing. It\'s the soul\'s call to action."',
        '"When someone in need tries to push you away, you have to find the strength to hold on tighter."',
        '"No, I don\'t want to hear your excuses."',
      ];
      return [
        '<span class="ascii">[matt murdock]</span>',
        lines[Math.floor(Math.random() * lines.length)],
        '— daredevil',
      ].join('<br/>');
    },

    bat: () => {
      const lines = [
        '"Schway."',
        '"Let\'s dance, bozo."',
        '"I AM Batman."',
        '"One night always makes the difference."',
        '"I\'ve got it covered. Always."',
        '"Oh, I don\'t need a degree to figure you out."',
        '"Welcome to my world."',
        '"Apathy."',
        '"Greed."',
        '"Corruption."',
        '"Power."',
        '"Hope."',
        '"Courage."',
        '"Honor."',
        '"Justice."',
      ];
      return [
        '<span class="ascii">[terry mcginnis]</span>',
        lines[Math.floor(Math.random() * lines.length)],
        '— batman beyond',
      ].join('<br/>');
    },

    variance97: function () { return this.mcdavid(); },

    sudo: () => 'you\'re not in the sudoers file. this incident has been reported.',
    rm:   (arg) => arg && arg.includes('-rf') ? 'nice try. dossier stays.' : 'rm: missing operand',
  };

  /* ── 7. letterboxd diary → "on the couch" card ───────────
     Reads letterboxd.json, which a daily GitHub Action builds
     from the public RSS feed (scripts/letterboxd.mjs). Same
     origin, so no CORS proxy to break.
     ────────────────────────────────────────────────────── */
  const lbCard = $('#now-letterboxd');
  let lbEntries = [];
  if (lbCard) {
    const listEl = lbCard.querySelector('[data-lb-list]');
    const MAX_ITEMS = 5;
    const fmtWatched = (iso) => {
      const d = new Date(`${iso}T12:00:00`);
      return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
    };

    const renderList = (entries) => {
      if (!listEl) return;
      if (!entries.length) {
        listEl.innerHTML = '<li class="note__diary-row note__diary-row--placeholder"><span class="note__diary-title">no recent watches</span></li>';
        return;
      }
      listEl.innerHTML = entries.slice(0, MAX_ITEMS).map((e) => {
        const title   = `<em>${escapeHtml(e.title)}</em>`;
        const linked  = /^https:\/\/letterboxd\.com\//.test(e.url || '')
          ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title;
        const yearStr = e.year ? ` <span class="muted">(${escapeHtml(e.year)})</span>` : '';
        const when    = e.watched ? `<span class="note__diary-date">${fmtWatched(e.watched)}</span>` : '';
        const rating  = `<span class="note__diary-rating"${e.rating ? '' : ' aria-hidden="true"'}>${escapeHtml(e.rating || '')}</span>`;
        return `<li class="note__diary-row">${when}<span class="note__diary-title">${linked}${yearStr}</span>${rating}</li>`;
      }).join('');
    };

    fetch('letterboxd.json', { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { lbEntries = data.entries || []; renderList(lbEntries); })
      .catch((err) => {
        console.debug('[letterboxd] diary unavailable:', err.message);
        if (listEl) listEl.innerHTML = '<li class="note__diary-row note__diary-row--placeholder"><span class="note__diary-title">diary unavailable right now</span></li>';
      });
  }

  termForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = termInput.value.trim();
    if (!raw) return;
    print(escapeHtml(raw), { user: true });
    const [cmd, ...rest] = raw.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    if (!fn) {
      print(`command not found: <em>${escapeHtml(cmd)}</em> — try <em>help</em>.`);
    } else {
      const result = fn.call(COMMANDS, rest.join(' '));
      if (result) print(result);
    }
    termInput.value = '';
  });

})();
