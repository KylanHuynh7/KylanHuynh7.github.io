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

  const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  const today = new Date();
  const lastEdit = $('#last-edit');
  const nowUpdated = $('#now-updated');
  if (lastEdit)  lastEdit.textContent  = fmtDate(today);
  if (nowUpdated) nowUpdated.textContent = fmtDate(today);

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
      '  <em>resume</em>      — link to resume',
      '  <em>open &lt;section&gt;</em> — scroll to a section',
      '  <em>whoami</em>      — visitor info',
      '  <em>ls</em> · <em>cat</em> · <em>echo</em> · <em>clear</em>',
    ].join('<br/>'),

    about: () => [
      'kylan huynh · sophomore → junior · uc san diego',
      'data science b.s. · class of 2028',
      '',
      'I work on small, careful things — sports analytics,',
      'research tools, and pipelines that respect the data.',
      'currently looking for a summer \'27 internship.',
    ].join('<br/>'),

    projects: () => [
      '  P-01  <em>variance97</em>          — McDavid sports-analytics deep dive',
      '  P-02  <em>monsteradjustment</em>   — Roki Sasaki rookie-arc deep dive',
      '  P-03  <em>saystroop</em>           — Stroop-effect web experiment + Whisper',
    ].join('<br/>'),

    stack: () => 'Python · Pandas · NumPy · scikit-learn · SQL · R · Streamlit · Supabase · GEE · Jupyter · git · zsh',

    now: () => {
      let watchLines = ['  watching   <em>(letterboxd feed unavailable)</em>'];
      try {
        const lbUser = $('#now-letterboxd')?.dataset.letterboxdUser;
        const cached = lbUser && JSON.parse(localStorage.getItem(`lb:${lbUser}:v2`) || 'null');
        const entries = cached?.entries;
        if (Array.isArray(entries) && entries.length) {
          watchLines = entries.slice(0, 3).map((e, i) => {
            const label = i === 0 ? 'watching ' : '          ';
            const yr    = e.year ? ` (${e.year})` : '';
            const rt    = e.rating ? `     ${e.rating}` : '';
            return `  ${label}  <em>${escapeHtml(e.title)}</em>${yr}${rt}`;
          });
        }
      } catch { /* fall through to default */ }
      return [
        'currently:',
        ...watchLines,
        '  reading    <em>Men in Dark Times</em> — Arendt    in progress',
        '  listening  <em>Ca$ino</em> — Baby Keem             on repeat',
        '  building   <em>ghostfork</em>                     in progress',
        '',
        'sports — see §02 (auto-updates with the calendar).',
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

    resume: () => 'resume: drop a link here when you\'re ready.',

    whoami: () => `guest@dossier · session ${Math.random().toString(16).slice(2, 8)}`,

    ls: () => '01-dossier  02-work  03-log  04-stack  05-now  06-contact  README.md',

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
     Pulls recent diary entries from a public Letterboxd RSS
     feed via api.allorigins.win (corsproxy.io gates free
     server-side requests now). Caches in localStorage for 1h.
     ────────────────────────────────────────────────────── */
  const lbCard = $('#now-letterboxd');
  if (lbCard) {
    const user = lbCard.dataset.letterboxdUser;
    const listEl = lbCard.querySelector('[data-lb-list]');
    const MAX_ITEMS = 5;
    const CACHE_KEY = `lb:${user}:v2`;
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    const renderList = (entries) => {
      if (!listEl) return;
      if (!entries.length) {
        listEl.innerHTML = '<li class="note__diary-row note__diary-row--placeholder"><span class="note__diary-title">no recent watches</span></li>';
        return;
      }
      listEl.innerHTML = entries.slice(0, MAX_ITEMS).map((e) => {
        const safeTitle = escapeHtml(e.title);
        const yearStr   = e.year ? ` <span class="muted">(${escapeHtml(e.year)})</span>` : '';
        const rating    = e.rating ? `<span class="note__diary-rating" aria-label="${escapeHtml(e.rating)}">${escapeHtml(e.rating)}</span>` : '<span class="note__diary-rating" aria-hidden="true"></span>';
        return `<li class="note__diary-row"><span class="note__diary-title"><em>${safeTitle}</em>${yearStr}</span>${rating}</li>`;
      }).join('');
    };

    const parseFeed = (xmlText) => {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const items = Array.from(doc.querySelectorAll('item'));
      return items.map((item) => {
        // Letterboxd namespaced fields are most reliable
        const ns = 'https://letterboxd.com';
        const filmTitle = item.getElementsByTagNameNS(ns, 'filmTitle')[0]?.textContent;
        const filmYear  = item.getElementsByTagNameNS(ns, 'filmYear')[0]?.textContent;
        const memberRating = item.getElementsByTagNameNS(ns, 'memberRating')[0]?.textContent;
        const watched = item.getElementsByTagNameNS(ns, 'watchedDate')[0]?.textContent
          || item.querySelector('pubDate')?.textContent || '';

        // Fallback parse from <title> "Movie, YYYY - ★★★★½"
        let title = filmTitle, year = filmYear, rating = '';
        const raw = item.querySelector('title')?.textContent || '';
        const m = raw.match(/^(.*?),\s*(\d{4})\s*-\s*(.+)$/);
        if (!title && m) title = m[1];
        if (!year  && m) year  = m[2];
        if (m) rating = m[3].trim();
        else if (memberRating) {
          const n = parseFloat(memberRating);
          if (!Number.isNaN(n)) {
            const full = Math.floor(n);
            const half = n - full >= 0.5;
            rating = '★'.repeat(full) + (half ? '½' : '');
          }
        }

        return { title: title || raw, year: year || '', rating, watched };
      }).filter(e => e.title);
    };

    const fetchFeed = async () => {
      const feed = `https://letterboxd.com/${user}/rss/`;
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`;
      const res = await fetch(proxied, { headers: { Accept: 'application/rss+xml, text/xml' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const entries = parseFeed(text);
      if (!entries.length) throw new Error('no items in feed');
      return entries;
    };

    (async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.t < CACHE_TTL && Array.isArray(cached.entries)) {
          renderList(cached.entries);
          return;
        }
        const entries = await fetchFeed();
        localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), entries }));
        renderList(entries);
      } catch (err) {
        console.debug('[letterboxd] feed unavailable:', err.message);
        if (listEl) {
          listEl.innerHTML = '<li class="note__diary-row note__diary-row--placeholder"><span class="note__diary-title">diary unavailable — try refresh</span></li>';
        }
      }
    })();
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
