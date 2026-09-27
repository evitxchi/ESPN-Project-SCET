/* Core: helpers, icons, persistent state, derived selectors. */
(function () {
  const D = window.DESK_DATA;
  const H = D.H;
  const Desk = (window.Desk = { D });

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lcfirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  function fmtDur(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  }
  function fmtMins(sec) {
    const m = Math.round(sec / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  }
  function fmtTime(ms) { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function dayDiff(ms) {
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(ms); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 864e5);
  }
  function fmtDay(ms) {
    const d = dayDiff(ms);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d === -1) return 'Yesterday';
    return new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  function fmtWhen(ms) { return `${fmtDay(ms)} ${fmtTime(ms)}`; }
  function fmtAgo(ms) {
    const s = Math.round((Date.now() - ms) / 1000);
    if (s < 60) return `${Math.max(s, 0)}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  }
  function fmtIn(ms) {
    const s = Math.round((ms - Date.now()) / 1000);
    const a = Math.abs(s);
    const txt = a < 3600 ? `${Math.max(1, Math.round(a / 60))}m` : a < 172800 ? `${Math.round(a / 3600)}h` : `${Math.round(a / 86400)}d`;
    return s < 0 ? `${txt} ago` : `in ${txt}`;
  }

  // ---------- Icons ----------
  const P = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
    live: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    film: '<rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
    bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    note: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    back10: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/>',
    pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    left: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    queue: '<line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="11" y2="18"/><polygon points="16 15 21 18 16 21 16 15" fill="currentColor"/>',
  };
  const ic = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  // ---------- Taxonomy helpers ----------
  const SPORT_STYLE = {
    football: ['#2f5a24', '#0e1f0a', 'FB'], basketball: ['#b4521a', '#3a1404', 'BB'], baseball: ['#1c4a8f', '#0a1a36', 'BSB'],
    hockey: ['#2b6a8e', '#0b2433', 'HK'], soccer: ['#17784a', '#062a18', 'SC'], tennis: ['#6f8a14', '#1e2905', 'TN'],
    motor: ['#8a1c1c', '#230606', 'MS'], mma: ['#5a2f82', '#1b0c2a', 'MMA'], golf: ['#2f7a45', '#0b2412', 'GF'],
    boxing: ['#8a2a2a', '#240808', 'BX'],
  };
  const sportById = (id) => D.SPORTS.find((s) => s.id === id) || { id, name: id, leagues: [] };
  const sportStyle = (id) => SPORT_STYLE[id] || ['#4a4f57', '#16181b', (sportById(id).name || '?').slice(0, 2).toUpperCase()];
  const glyph = (id) => { const s = sportStyle(id); return `<span class="sport-glyph" style="background:${s[0]}">${s[2]}</span>`; };

  const ROLE_LABEL = {
    PLAY_BY_PLAY: 'Play-by-play', COLOR_COMMENTATOR: 'Color commentator', STUDIO_HOST: 'Studio host', ANALYST: 'Analyst', REPORTER: 'Reporter',
    PLAYER: 'Player', COACH: 'Coach', EXECUTIVE: 'Executive', OFFICIAL: 'Official', GUEST: 'Guest', UNKNOWN: 'Unknown',
  };
  const roleClass = (r) => (D.BROADCAST_ROLES.includes(r) ? 'r-b' : D.INTERVIEWEE_ROLES.includes(r) ? 'r-i' : 'r-o');
  const LEAGUE_SHORT = { 'Professional Fighters League': 'PFL', 'NCAA Football': 'NCAAF', 'Premier Lacrosse League': 'PLL', 'National Lacrosse League': 'NLL', 'World Surf League': 'WSL' };
  const leagueShort = (l) => LEAGUE_SHORT[l] || l;
  const typeLabel = (t) => t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // ---------- State ----------
  const STORE_KEY = 'espn-video-desk:v1';

  function seed() {
    const now = Date.now();
    const videos = D.VIDEOS.map((v) => Object.assign(clone(v), { publishedAt: now + v.publishedH * H }));
    const transcripts = clone(D.TRANSCRIPTS);
    const pos = {};
    const assignments = D.ASSIGNMENTS.map((a) => {
      const v = videos.find((x) => x.id === a.videoId);
      const dueAt = now + a.dueH * H;
      if (a.progress > 0 && a.progress < 1) pos[a.videoId] = Math.round(a.progress * v.duration);
      return Object.assign(clone(a), {
        assignedAt: now + a.assignedH * H, dueAt,
        reminders: defaultReminders(dueAt, now),
      });
    });
    const liveStartPos = 4380;
    return {
      version: 1, seededAt: now, videos, transcripts, assignments, pos,
      live: clone(D.LIVE_EVENTS), livePos: liveStartPos, liveUpdatedAt: now,
      notes: [
        { id: 'n1', videoId: 'v1', t: 890, type: 'TIMESTAMP_NOTE', text: 'Analyst flags right-tackle isolation — revisit with second-half clip.', createdAt: now - 20 * H, tags: ['protection'] },
        { id: 'n2', videoId: 'v3', t: 1122, type: 'INSIGHT', text: 'Weak-side guard not crashing = the Game 1 problem repeating. Compare with Game 3.', createdAt: now - 30 * H, tags: ['rebounding'] },
        { id: 'n3', videoId: 'v5', t: 125, type: 'FOLLOW_UP', text: 'Verify the six-drops stat before using in copy.', createdAt: now - 10 * H, tags: ['fact-check'] },
      ],
      clips: [
        { id: 'c1', videoId: 'v3', start: 2661, end: 2700, title: 'Switch to switching on P&R', tags: ['tactics'], note: '', createdAt: now - 28 * H },
      ],
      saved: ['v3', 'v7'],
      queue: ['v10', 'v4'],
      history: [
        { videoId: 'v1', at: now - 4 * H }, { videoId: 'v3', at: now - 22 * H }, { videoId: 'v5', at: now - 9 * H },
        { videoId: 'v6', at: now - 12 * H }, { videoId: 'v12', at: now - 3 * H },
      ],
      summaries: {
        v6: { EXEC: { generatedAt: now - 11 * H, model: 'desk-rag-demo-1', template: 'exec@1.3', reviewed: false } },
        v7: { EXEC: { generatedAt: now - 40 * H, model: 'desk-rag-demo-1', template: 'exec@1.3', reviewed: true } },
      },
      notifs: [
        { id: uid('nt'), cat: 'Live Event', text: 'Assigned game is LIVE: Liberty at Aces, Game 3', at: now - 0.6 * H, read: false, link: '#/video/vlive' },
        { id: uid('nt'), cat: 'Overdue', text: 'WNBA Semifinals Game 2 replay is overdue (70% remaining)', at: now - 2 * H, read: false, link: '#/video/v3' },
        { id: uid('nt'), cat: 'Transcript Ready', text: 'Transcript ready: SportsCenter: Weekend Injury Report', at: now - 5.5 * H, read: true, link: '#/video/v12' },
        { id: uid('nt'), cat: 'Assignments', text: 'New assignment from Marco Diaz: Dodgers at Padres — Condensed Game', at: now - 18 * H, read: true, link: '#/video/v6' },
        { id: uid('nt'), cat: 'Summary Ready', text: 'Summary ready for review: Dodgers at Padres', at: now - 11 * H, read: true, link: '#/video/v6' },
      ],
      lastRefresh: now - 42 * 60e3,
      briefAt: now - 42 * 60e3,
      changes: [
        { k: 'videos', n: 9, label: 'new videos' }, { k: 'interviews', n: 3, label: 'new interviews' },
        { k: 'assign', n: 2, label: 'assignment changes' }, { k: 'live', n: 3, label: 'new live events' }, { k: 'replays', n: 2, label: 'completed-event replays' },
      ],
      poolIdx: 0,
      chat: [],
      settings: {
        favSports: ['basketball', 'football', 'baseball'],
        followedTeams: ['New York Liberty', 'Buffalo Bills', 'San Diego Padres'],
        followedAthletes: ['Tasha Greene'],
        sidebarSports: ['football', 'basketball', 'baseball', 'hockey', 'soccer', 'golf', 'tennis', 'mma', 'motor'],
        speed: 1, captions: true, summaryMode: 'EXEC', answerLength: 'standard',
        defaultAsgView: 'list', compactSidebar: false,
        channels: { 'in-app': true, email: true, slack: false, push: false, calendar: false },
        mutes: {}, historyVisible: true,
        liveFilter: 'all', liveNetwork: 'all', hideScores: false, compactLive: false,
      },
    };
  }

  function defaultReminders(dueAt, now) {
    // PRD §13.1 defaults: 24h, 3h, at due, overdue +2h
    return [
      { id: uid('rm'), at: dueAt - 24 * H, label: '24 hours before due' },
      { id: uid('rm'), at: dueAt - 3 * H, label: '3 hours before due' },
      { id: uid('rm'), at: dueAt, label: 'At due time' },
      { id: uid('rm'), at: dueAt + 2 * H, label: 'Overdue +2 hours' },
    ].map((r) => Object.assign(r, { sent: r.at <= now }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && s.version === 1 ? s : null;
    } catch (e) { return null; }
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(Desk.S)); } catch (e) { /* storage unavailable */ } }, 250);
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    Desk.S = seed();
    save();
  }

  Desk.S = load() || seed();

  // ---------- Selectors ----------
  const video = (id) => Desk.S.videos.find((v) => v.id === id);
  const transcript = (id) => Desk.S.transcripts[id] || [];
  const speaker = (v, spkId) => (v.speakers || []).find((s) => s.id === spkId) || { id: spkId, name: 'Unknown speaker', role: 'UNKNOWN', conf: 0.4 };
  const asgForVideo = (vid) => Desk.S.assignments.find((a) => a.videoId === vid);
  const DONE = ['COMPLETE', 'SKIPPED'];
  const isDone = (a) => DONE.includes(a.status);
  const isOverdue = (a) => !isDone(a) && a.dueAt < Date.now();
  const isDueToday = (a) => !isDone(a) && dayDiff(a.dueAt) === 0;
  const watchPos = (vid) => {
    const v = video(vid);
    if (v && v.live) return Desk.S.pos[vid] != null ? Desk.S.pos[vid] : Desk.S.livePos;
    return Desk.S.pos[vid] || 0;
  };
  const videoDuration = (v) => (v.live ? Desk.S.livePos : v.duration);
  function progressOf(vid) {
    const a = asgForVideo(vid);
    const v = video(vid);
    if (!v) return 0;
    const p = watchPos(vid) / videoDuration(v);
    return Math.max(a ? a.progress || 0 : 0, v.live ? 0 : p);
  }
  function remainingSec(a) {
    const v = video(a.videoId);
    return Math.max(0, v.duration * (1 - (a.progress || 0)));
  }
  function sortByDue(list) {
    const rank = (a) => (isDone(a) ? 5 : isOverdue(a) ? 0 : dayDiff(a.dueAt) === 0 ? 1 : dayDiff(a.dueAt) === 1 ? 2 : 3);
    const pr = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return list.slice().sort((a, b) => rank(a) - rank(b) || a.dueAt - b.dueAt || pr[a.priority] - pr[b.priority]);
  }
  function weekStats() {
    const A = Desk.S.assignments;
    return {
      total: A.length,
      done: A.filter(isDone).length,
      inProgress: A.filter((a) => ['IN_PROGRESS', 'WATCHED', 'SUMMARIZED', 'REVIEWED'].includes(a.status) && !isOverdue(a)).length,
      dueToday: A.filter((a) => isDueToday(a) && !isOverdue(a)).length,
      overdue: A.filter(isOverdue).length,
      notStarted: A.filter((a) => ['ASSIGNED', 'QUEUED'].includes(a.status)).length,
    };
  }
  const hasSummary = (vid) => !!(Desk.S.summaries[vid] && Object.keys(Desk.S.summaries[vid]).length);

  Object.assign(Desk, {
    H, esc, clone, uid, clamp, lcfirst, fmtDur, fmtMins, fmtTime, fmtDay, fmtWhen, fmtAgo, fmtIn, dayDiff,
    ic, sportById, sportStyle, glyph, ROLE_LABEL, roleClass, typeLabel, leagueShort,
    save, reset, seed, defaultReminders,
    video, transcript, speaker, asgForVideo, isDone, isOverdue, isDueToday, watchPos, videoDuration, progressOf, remainingSec, sortByDue, weekStats, hasSummary,
  });
})();
