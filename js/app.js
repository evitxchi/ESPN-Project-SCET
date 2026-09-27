/* App controller: shell, router, events, live ticker, player, refresh, palette, notifications, reminders. */
(function () {
  const Desk = window.Desk;
  const { D, U, esc, ic, uid, clamp, fmtDur, fmtTime, fmtWhen, fmtAgo, video, transcript, speaker, asgForVideo, isDone, isOverdue, H } = Desk;
  const S = () => Desk.S;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const save = () => Desk.save();

  // ================= Toasts, popovers, modals =================
  function toast(msg, opts) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = `<span>${msg}</span>${opts && opts.undo ? '<button>Undo</button>' : ''}${opts && opts.action ? `<button>${esc(opts.action[0])}</button>` : ''}`;
    const btn = el.querySelector('button');
    if (btn) btn.onclick = () => { (opts.undo || opts.action[1])(); el.remove(); };
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), (opts && opts.ms) || 4200);
  }
  function closePopover() { if (U.popover) { U.popover.remove(); U.popover = null; } }
  function popover(anchor, html) {
    closePopover();
    const el = document.createElement('div');
    el.className = 'popover';
    el.innerHTML = html;
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    let top = r.bottom + 4, left = r.left;
    if (left + el.offsetWidth > innerWidth - 8) left = innerWidth - el.offsetWidth - 8;
    if (top + el.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - el.offsetHeight - 4);
    el.style.top = top + 'px';
    el.style.left = Math.max(8, left) + 'px';
    U.popover = el;
    const f = el.querySelector('button'); if (f) f.focus();
  }
  function closeLayer() { $('#layer').innerHTML = ''; U.pal = null; }
  function modal(html) {
    $('#layer').innerHTML = `<div class="overlay" data-overlay><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = $('#layer input, #layer select, #layer textarea, #layer button'); if (f) f.focus();
  }

  // ================= Shell =================
  function renderSidebar() {
    const st = S().settings;
    const r = route();
    const W = Desk.weekStats();
    const liveN = S().live.filter((e) => e.status === 'LIVE').length;
    const item = (href, icon, label, count, alert) => {
      const active = ('#/' + r.name + (r.arg ? '/' + r.arg : '')) === href || (href === '#/home' && r.name === 'home');
      return `<a class="nav-item ${active ? 'active' : ''}" href="${href}" ${active ? 'aria-current="page"' : ''} title="${esc(label)}">${icon.startsWith('<') ? icon : ic(icon)}<span>${esc(label)}</span>${count != null ? `<span class="count ${alert ? 'alert' : ''}">${count}</span>` : ''}</a>`;
    };
    $('#sidebar').innerHTML = `
      ${item('#/home', 'home', 'Home')}
      ${item('#/assignments', 'clipboard', 'Assignments', W.overdue ? W.overdue + ' overdue' : W.total - W.done, W.overdue > 0)}
      ${item('#/live', 'live', 'Live', liveN)}
      ${item('#/queue', 'queue', 'My Queue', S().queue.length)}
      ${item('#/library', 'film', 'Library')}
      ${item('#/commentary', 'mic', 'What they said')}
      ${item('#/chat', 'chat', 'Chat')}
      <div class="nav-sec"><span>Sports</span></div>
      ${st.sidebarSports.map((id) => item('#/sport/' + id, Desk.glyph(id), Desk.sportById(id).name)).join('')}
      ${item('#/sports', 'grid', 'More…')}
      <div class="nav-sec"><span>Yours</span></div>
      ${item('#/saved', 'bookmark', 'Saved', S().saved.length + S().clips.length)}
      ${item('#/history', 'clock', 'History')}
      ${item('#/notes', 'note', 'Notes', S().notes.length)}
      <div class="nav-sec"></div>
      ${item('#/settings', 'settings', 'Settings')}
      <button class="nav-item" data-act="sidebar-compact" title="Toggle compact sidebar">${ic('panel')}<span>${st.compactSidebar ? 'Expand' : 'Compact'} sidebar</span></button>`;
    $('#app').classList.toggle('sidebar-compact', !!st.compactSidebar);
  }
  function renderTopMeta() {
    const unread = S().notifs.filter((n) => !n.read && !S().settings.mutes[n.cat]).length;
    $('#bell-count').textContent = unread;
    $('#bell-count').hidden = !unread;
    if (!U.refresh || !U.refresh.running) $('#refresh-meta').innerHTML = `Last refresh ${fmtTime(S().lastRefresh)}<br>${fmtAgo(S().lastRefresh)}`;
  }

  // ================= Live banner (PRD §10) =================
  const PERIOD_LEN = { basketball: 600, football: 900, hockey: 1200 };
  function liveStatusText(e) {
    if (e.status === 'PRE_GAME' || e.status === 'HALFTIME') return e.period;
    if (e.status === 'FINAL') return e.replay ? 'Final · Replay' : 'Final';
    if (e.clock != null) return e.clockUp ? `${Math.floor(e.clock / 60)}'` : `${e.period} • ${Math.floor(e.clock / 60)}:${String(e.clock % 60).padStart(2, '0')}`;
    return e.detail ? `${e.period} • ${e.detail}` : e.period;
  }
  Desk.liveStatusText = liveStatusText;
  function liveVisible() {
    const st = S().settings;
    let L = S().live.slice();
    if (st.liveFilter === 'mine') L = L.filter((e) => st.favSports.includes(e.sport));
    if (st.liveFilter === 'assigned') L = L.filter((e) => e.assigned);
    if (st.liveNetwork !== 'all') L = L.filter((e) => e.network === st.liveNetwork);
    const rank = { LIVE: 0, HALFTIME: 1, DELAYED: 1, SUSPENDED: 1, PRE_GAME: 2, FINAL: 3 };
    return L.sort((a, b) => (b.assigned ? 1 : 0) - (a.assigned ? 1 : 0) || rank[a.status] - rank[b.status]);
  }
  // ESPN scoreboard style: "6:48 - 3rd", "Top 7th", "67'", "Halftime", "Final"
  const ORD = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  function bannerStatus(e) {
    if (e.status === 'FINAL') return 'Final';
    if (e.status === 'PRE_GAME') return e.period;
    if (e.status === 'HALFTIME') return e.period === '2nd Int' ? 'End of 2nd' : 'Halftime';
    const n = parseInt(String(e.period).replace(/\D/g, ''), 10);
    if (e.clock != null && e.clockUp) return `${Math.floor(e.clock / 60)}' - 2nd Half`;
    if (e.clock != null) return `${Math.floor(e.clock / 60)}:${String(e.clock % 60).padStart(2, '0')} - ${n ? ORD(n) : e.period}`;
    if (/^(Top|Bot)/.test(e.period)) return `${e.period.slice(0, 3)} ${ORD(n)}`;
    return e.period;
  }
  Desk.bannerStatus = bannerStatus;
  const TEAM_COLOR = { NY: '#6ECEB2', LV: '#A7A8AA', LSU: '#461D7C', MISS: '#14213D', NYY: '#0C2340', BAL: '#DF4601', VIL: '#D8B800', BAR: '#A50044', NYR: '#0038A8', BOS: '#FFB81C', ALA: '#9E1B32', UGA: '#BA0C2F', KIM: '#5b6470', VAR: '#5b6470' };
  const LEAGUE_LINKS = [['NFL', '#/sport/football?league=NFL'], ['NCAAF', '#/sport/football?league=NCAA%20Football'], ['MLB', '#/sport/baseball?league=MLB'], ['NBA', '#/sport/basketball?league=NBA'], ['Soccer', '#/sport/soccer'], ['WNBA', '#/sport/basketball?league=WNBA'], ['NHL', '#/sport/hockey?league=NHL'], ['More Sports', '#/sports']];
  function renderLeagueLinks() {
    const cur = location.hash;
    $('#league-links').innerHTML = LEAGUE_LINKS.map(([l, h]) => `<a href="${h}" class="${cur === h ? 'active' : ''}">${l}</a>`).join('');
  }
  function renderLiveBanner() {
    const st = S().settings;
    const rail = $('.live-rail');
    const sl = rail ? rail.scrollLeft : 0;
    const L = liveVisible();
    const team = (t, other, e) => {
      if (!t) return '';
      const trail = other && t.score != null && other.score != null && t.score < other.score && e.status === 'FINAL';
      const isHome = t === e.home;
      const poss = e.poss && ((e.poss === 'home') === isHome);
      const abbr = t.abbr || t.name;
      return `<div class="sb-team ${trail ? 'trail' : ''}"><span class="sb-logo" style="background:${TEAM_COLOR[t.abbr] || '#5b6470'}">${esc(abbr.slice(0, 3))}</span><span class="sb-abbr">${esc(['tennis', 'mma'].includes(e.sport) ? t.name : abbr)}</span><span>${poss && e.status === 'LIVE' ? '<i class="sb-poss" title="Possession"></i>' : ''}</span><b data-score="${esc(t.abbr)}">${st.hideScores || t.score == null ? '' : t.score}</b></div>`;
    };
    const card = (e) => {
      const live = ['LIVE', 'HALFTIME'].includes(e.status);
      const oneLine = !e.home;
      return `<button class="sb-card ${e.assigned ? 'sb-asg' : ''}" data-act="${e.status === 'PRE_GAME' ? 'live-remind' : 'live-watch'}" data-e="${e.id}" aria-label="${esc(Desk.eventName(e))}, ${esc(bannerStatus(e))}${e.assigned ? ', assigned to you' : ''}">
        <div class="sb-top"><span class="sb-status ${live ? '' : 'muted'}" data-clock="${e.id}">${esc(bannerStatus(e))}</span><span class="sb-net">${esc(e.network)}</span></div>
        <div class="sb-teams">${oneLine ? `<div class="sb-team" style="grid-template-columns:18px 1fr"><span class="sb-logo" style="background:#5a2f82">PFL</span><span>${esc(e.away.name)}</span></div>` : team(e.away, e.home, e) + team(e.home, e.away, e)}</div>
        <div class="sb-sit">${(e.sit || []).slice(0, e.assigned ? 1 : 2).map((x) => `<span>${esc(x)}</span>`).join('')}${e.assigned ? '<span class="sb-tag">● ASSIGNED</span>' : ''}</div>
      </button>`;
    };
    // Group consecutive events by league, like the ESPN scoreboard strip.
    let html = '', lastLeague = null;
    L.forEach((e) => {
      if (e.league !== lastLeague) { html += `<div class="sb-league">${esc(Desk.leagueShort(e.league))}</div>`; lastLeague = e.league; }
      html += card(e);
    });
    const label = { all: 'Top Events', mine: 'My Sports', assigned: 'Assigned' }[st.liveFilter] + (st.liveNetwork !== 'all' ? ' · ' + st.liveNetwork : '');
    $('#live-banner').className = 'live-banner' + (st.compactLive ? ' compact' : '');
    $('#live-banner').innerHTML = `
      <div class="sb-lead"><button class="sb-events" data-act="live-menu" aria-haspopup="true"><span>${esc(label)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
        <span class="sb-updated"><span class="dot-live"></span><span id="live-ago">Updated ${fmtAgo(S().liveUpdatedAt)}</span></span></div>
      <button class="sb-arrow" data-act="live-scroll" data-d="-1" aria-label="Scroll left" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <div class="live-rail" role="list" aria-label="Live events">${html || '<div class="sb-empty">No events match this filter.</div>'}</div>
      <button class="sb-arrow" data-act="live-scroll" data-d="1" aria-label="Scroll right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>`;
    const nr = $('.live-rail');
    if (nr) { nr.scrollLeft = sl; nr.addEventListener('scroll', updateArrows, { passive: true }); updateArrows(); }
  }
  function updateArrows() {
    const r = $('.live-rail'); if (!r) return;
    const [l, rt] = $$('.sb-arrow');
    l.hidden = r.scrollLeft < 4;
    rt.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 4;
  }
  function liveMenu() {
    const st = S().settings;
    const nets = [...new Set(S().live.map((e) => e.network))];
    const ck = (on) => (on ? '<span class="ck">✓</span>' : '');
    return `<div class="ph">Show</div>${[['all', 'Top Events'], ['mine', 'My Sports'], ['assigned', 'Assigned to me']].map(([k, l]) => `<button class="pi pop-check" data-act="live-filter" data-f="${k}">${l}${ck(st.liveFilter === k)}</button>`).join('')}
      <div class="ph">Network</div>${[['all', 'All networks']].concat(nets.map((n) => [n, n])).map(([k, l]) => `<button class="pi pop-check" data-act="live-net" data-n="${esc(k)}">${esc(l)}${ck(st.liveNetwork === k)}</button>`).join('')}
      <div class="ph">Display</div>
      <button class="pi pop-check" data-act="live-hide">Hide scores${ck(st.hideScores)}</button>
      <button class="pi pop-check" data-act="live-compact">Compact mode${ck(st.compactLive)}</button>
      <button class="pi" data-act="go" data-h="#/live">View all live events →</button>`;
  }

  let tickN = 0;
  function liveTick() {
    tickN++;
    const st = S();
    let scoreChanged = false, statusChanged = false;
    st.live.forEach((e) => {
      if (e.status !== 'LIVE') return;
      if (e.clock != null) {
        if (e.clockUp) { e.clock += 1; if (e.clock >= 93 * 60) { e.status = 'FINAL'; e.replay = false; statusChanged = true; } }
        else if (Math.random() < 0.7) {
          e.clock -= 1;
          if (e.clock <= 0) {
            const n = parseInt(String(e.period).replace(/\D/g, ''), 10) || 4;
            if (n >= 4) { e.status = 'FINAL'; e.period = 'Final'; e.clock = null; statusChanged = true; notify('Live Event', `Final: ${Desk.eventName(e)} ${e.away.score}-${e.home.score}`, e.videoId ? '#/video/' + e.videoId : '#/live'); }
            else { e.period = 'Q' + (n + 1); e.clock = PERIOD_LEN[e.sport] || 600; }
          }
        }
      }
      const p = { basketball: 0.09, football: 0.008, baseball: 0.006, soccer: 0.002, tennis: 0.02 }[e.sport] || 0;
      if (e.home && Math.random() < p) {
        const t = Math.random() < 0.5 ? e.home : e.away;
        const add = e.sport === 'basketball' ? (Math.random() < 0.3 ? 3 : 2) : e.sport === 'football' ? (Math.random() < 0.5 ? 3 : 7) : e.sport === 'tennis' ? 0 : 1;
        if (e.sport === 'tennis') { const g = (e.detail || '0–0').split('–').map(Number); g[Math.random() < 0.5 ? 0 : 1]++; e.detail = g.join('–'); }
        else { t.score += add; t.flash = true; scoreChanged = true; }
      }
    });
    st.livePos += 1;
    if (tickN % 15 === 0) st.liveUpdatedAt = Date.now();
    if (scoreChanged || statusChanged) {
      renderLiveBanner();
      st.live.forEach((e) => [e.home, e.away].forEach((t) => { if (t && t.flash) { $$(`.sb-card[data-e="${e.id}"] [data-score="${t.abbr}"]`).forEach((el) => el.classList.add('score-flash')); t.flash = false; } }));
    } else {
      st.live.forEach((e) => { const el = $(`[data-clock="${e.id}"]`); if (el) el.textContent = bannerStatus(e); });
    }
    const ago = $('#live-ago'); if (ago) ago.textContent = 'Updated ' + fmtAgo(st.liveUpdatedAt);
    const ago2 = $('[data-live-ago]'); if (ago2) ago2.textContent = fmtAgo(st.liveUpdatedAt);
    $$('[data-clockbig]').forEach((el) => { const e = st.live.find((x) => x.id === el.dataset.clockbig); if (e) el.textContent = liveStatusText(e); });
    if (route().name === 'live' && (scoreChanged || statusChanged)) rerender();
    if (U.player && video(U.player.videoId).live) livePlayerTick();
    if (tickN % 30 === 0) renderTopMeta();
    if (tickN % 10 === 0) { checkReminders(); save(); }
  }

  // ================= Router =================
  function route() {
    const h = location.hash.slice(1) || '/home';
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    return { name: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : null, params: new URLSearchParams(qs || '') };
  }
  const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
  let lastKey = '';
  function render() {
    const r = route();
    const key = r.name + '/' + (r.arg || '');
    const viewFn = Desk.views[r.name] || Desk.views.home;
    if (r.name !== 'video') stopPlayer();
    else setupPlayer(r.arg, r.params);
    const out = r.name === 'sport' || r.name === 'video' ? viewFn(r.arg, r.params) : viewFn();
    const main = $('#main');
    const keepScroll = key === lastKey ? main.scrollTop : 0;
    main.innerHTML = out.html;
    main.scrollTop = keepScroll;
    $('#main-wrap').classList.toggle('no-rail', !out.rail);
    $('#rail').innerHTML = out.rail ? Desk.rail() : '';
    lastKey = key;
    renderSidebar();
    renderLeagueLinks();
    renderTopMeta();
    $('#app').classList.remove('nav-open');
    if (r.name === 'video') mountPlayer();
    if (r.name === 'chat') { const log = $('#chat-log'); if (log) log.scrollTop = log.scrollHeight; }
    document.title = (r.name === 'video' && video(r.arg) ? Desk.shortTitle(video(r.arg)) + ' · ' : '') + 'ESPN Video Desk';
  }
  const rerender = () => render();

  // ================= Assignment actions (PRD §12, §44) =================
  const asg = (id) => S().assignments.find((a) => a.id === id);
  function setStatus(a, status, quiet) {
    const prev = a.status;
    a.status = status;
    if (status === 'COMPLETE') { a.completedAt = Date.now(); a.progress = Math.max(a.progress || 0, video(a.videoId).live ? 0 : a.progress || 0); }
    save();
    if (!quiet) toast(`${esc(Desk.shortTitle(video(a.videoId)))} → ${Desk.STATUS[status][0]}`, { undo: () => { a.status = prev; save(); rerender(); } });
  }
  function complete(a) {
    if (a.summaryRequired && !Desk.hasSummary(a.videoId)) {
      toast('This assignment requires a summary. Generate and review it first.', { action: ['Open summary', () => go(`#/video/${a.videoId}?tab=summary`)] });
      return;
    }
    setStatus(a, 'COMPLETE');
    rerender();
  }
  function atTime(which, a) {
    const d = new Date();
    if (which === 'tonight') { d.setHours(20, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d.getTime(); }
    if (which === 'tomorrow') { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); }
    if (which === '1h') return Date.now() + H;
    const before = { '30m': 0.5, '1hb': 1, '3h': 3, '1d': 24 }[which];
    if (before) return a.dueAt - before * H;
    return Date.now() + H;
  }
  function addReminder(a, at, label, recurring) {
    a.reminders = a.reminders || [];
    a.reminders.push({ id: uid('rm'), at, label, sent: false, recurring: !!recurring });
    a.reminders.sort((x, y) => x.at - y.at);
    save();
    toast(`Reminder set · ${esc(fmtWhen(at))}`);
  }
  function remindMenu(a) {
    const upcoming = (a.reminders || []).filter((r) => !r.sent);
    return `<div class="ph">Remind me</div>
      ${[['tonight', 'Tonight (8:00 PM)'], ['tomorrow', 'Tomorrow (9:00 AM)'], ['30m', '30 minutes before due'], ['1hb', '1 hour before due'], ['3h', '3 hours before due'], ['1d', '1 day before due'], ['recurring', 'Daily until complete'], ['custom', 'Custom date / time…']].map(([k, l]) => `<button class="pi" data-act="remind-add" data-a="${a.id}" data-w="${k}">${l}</button>`).join('')}
      ${upcoming.length ? `<div class="ph">Scheduled</div>${upcoming.map((r) => `<div class="row" style="padding:3px 10px;font-size:12px"><span style="flex:1">${esc(fmtWhen(r.at))} · ${esc(r.label)}</span><button class="btn sm ghost" data-act="remind-del" data-a="${a.id}" data-r="${r.id}" aria-label="Remove">${ic('x')}</button></div>`).join('')}` : ''}
      <div class="ph">Channels: ${Object.entries(S().settings.channels).filter(([, v]) => v).map(([k]) => k).join(', ')}</div>`;
  }
  function moreMenu(a) {
    const v = video(a.videoId);
    return `<button class="pi" data-act="open" data-v="${v.id}">▶ Watch</button>
      <button class="pi" data-act="note-video" data-v="${v.id}">✎ Add note</button>
      <button class="pi" data-act="asg-gen" data-a="${a.id}">✦ Generate summary</button>
      <button class="pi" data-act="ask-video" data-v="${v.id}">✦ Ask AI about this</button>
      <button class="pi" data-act="asg-due" data-a="${a.id}">📅 Change due date…</button>
      <button class="pi" data-act="asg-remind-pop" data-a="${a.id}">🔔 Reminders…</button>
      <button class="pi" data-act="queue-add" data-v="${v.id}">＋ Add to queue</button>
      <button class="pi" data-act="save-toggle" data-v="${v.id}">${S().saved.includes(v.id) ? '★ Unsave' : '☆ Save'}</button>
      <button class="pi" data-act="share" data-v="${v.id}">🔗 Copy internal link</button>
      <div class="ph">Priority</div><div class="row" style="padding:2px 8px 6px">${['P0', 'P1', 'P2', 'P3'].map((p) => `<button class="btn sm ${a.priority === p ? 'primary' : ''}" data-act="set-prio" data-a="${a.id}" data-p="${p}">${p}</button>`).join('')}</div>
      <div class="ph">Move to</div>${['ASSIGNED', 'IN_PROGRESS', 'WATCHED', 'SUMMARIZED', 'COMPLETE', 'SKIPPED', 'BLOCKED'].filter((s) => s !== a.status).map((s) => `<button class="pi" data-act="set-status" data-a="${a.id}" data-s="${s}">${Desk.STATUS[s][0]}</button>`).join('')}`;
  }

  // ================= Notifications (PRD §69) =================
  function notify(cat, text, link) {
    S().notifs.unshift({ id: uid('nt'), cat, text, at: Date.now(), read: false, link });
    save();
    renderTopMeta();
    if (!S().settings.mutes[cat]) toast(`${ic('bell').replace('<svg', '<svg style="width:14px;height:14px"')} ${esc(text)}`, link ? { action: ['Open', () => go(link)] } : null);
  }
  function renderNotifPanel() {
    const muted = S().settings.mutes;
    const list = S().notifs.filter((n) => !muted[n.cat]).sort((a, b) => b.at - a.at);
    $('#layer').innerHTML = `<div class="notif-panel" role="dialog" aria-label="Notifications"><header><strong>Notifications</strong><div class="row"><button class="link-btn" data-act="notif-read-all">Mark all read</button><button class="btn sm ghost" data-act="layer-close" aria-label="Close">${ic('x')}</button></div></header>
      ${list.length ? list.map((n) => `<div class="notif ${n.read ? '' : 'unread'}" data-act="notif-open" data-id="${n.id}"><div style="flex:1"><div class="tiny muted strong">${esc(n.cat.toUpperCase())} · ${fmtAgo(n.at)}</div><div>${esc(n.text)}</div></div></div>`).join('') : '<div class="card-pad muted small">No notifications.</div>'}
      <div class="card-pad tiny muted">Mute categories in <a href="#/settings" data-act="layer-close">Settings</a>.</div></div>`;
  }
  function checkReminders() {
    const now = Date.now();
    S().assignments.forEach((a) => {
      if (isDone(a)) return;
      (a.reminders || []).forEach((r) => {
        if (r.sent || r.at > now) return;
        r.sent = true;
        const v = video(a.videoId);
        const over = a.dueAt < now;
        notify(over ? 'Overdue' : 'Due Soon', `${over ? 'Overdue' : 'Due ' + fmtWhen(a.dueAt)}: ${Desk.shortTitle(v)} · ${Math.round(Desk.remainingSec(a) / 60)} min left`, '#/video/' + v.id);
        if (r.recurring) a.reminders.push({ id: uid('rm'), at: r.at + 24 * H, label: 'Daily until complete', sent: false, recurring: true });
      });
    });
  }

  // ================= Refresh (PRD §23, §43, §52, §68) =================
  const STEPS = [
    ['Schedules', 'schedules'], ['Live events', 'live'], ['Video catalog', 'videos'], ['Assignments', 'assignments'],
    ['Transcripts', 'transcripts'], ['Recommendations', 'recs'], ['Daily brief', 'brief'],
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const plural = (n, one, many) => (n === 1 ? one : many);
  function setRefreshBtn(state) {
    const btn = $('#refresh-btn');
    btn.disabled = state === 'busy';
    btn.classList.toggle('done', state === 'done');
    const icon = state === 'busy' ? ic('refresh').replace('<svg', '<svg class="spin"') : state === 'done' ? ic('check') : ic('refresh');
    const label = state === 'busy' ? 'Refreshing…' : state === 'done' ? `Updated ${fmtTime(S().lastRefresh)}` : 'Refresh ESPN Now';
    btn.innerHTML = `<span class="tool-ic">${icon}</span><span class="lbl">${label}</span>`;
  }
  async function doRefresh() {
    if (U.refresh && U.refresh.running) return;
    const R = (U.refresh = { running: true, idx: 0, counts: { videos: 0, interviews: 0, assign: 0, live: 0, replays: 0, transcripts: 0 }, added: [] });
    const btn = $('#refresh-btn');
    btn.disabled = true; btn.classList.remove('done');
    setRefreshBtn('busy');
    renderDrawer();
    for (let i = 0; i < STEPS.length; i++) {
      R.idx = i;
      $('#refresh-meta').innerHTML = `Refreshing ${STEPS[i][0].toLowerCase()}…`;
      renderDrawer();
      await sleep(380 + Math.random() * 420);
      applyStep(STEPS[i][1], R);
    }
    R.idx = STEPS.length;
    R.running = false;
    const st = S();
    st.lastRefresh = Date.now();
    st.briefAt = Date.now();
    const c = R.counts;
    st.changes = [
      { k: 'videos', n: c.videos, label: plural(c.videos, 'new video', 'new videos') }, { k: 'interviews', n: c.interviews, label: plural(c.interviews, 'new interview', 'new interviews') },
      { k: 'assign', n: c.assign, label: plural(c.assign, 'assignment change', 'assignment changes') }, { k: 'live', n: c.live, label: plural(c.live, 'new live event', 'new live events') },
      { k: 'replays', n: c.replays, label: plural(c.replays, 'completed-event replay', 'completed-event replays') }, { k: 'transcripts', n: c.transcripts, label: plural(c.transcripts, 'transcript ready', 'transcripts ready') },
    ].map((x) => Object.assign(x, { fresh: true }));
    save();
    renderDrawer();
    btn.disabled = false; btn.classList.add('done');
    setRefreshBtn('done');
    setTimeout(() => setRefreshBtn('idle'), 5000);
    setTimeout(() => { if (U.refresh === R) { U.refresh = null; const d = $('#refresh-drawer'); if (d) d.remove(); } }, 9000);
    renderLiveBanner();
    if (route().name !== 'video') rerender(); else { renderSidebar(); renderTopMeta(); }
  }
  function applyStep(k, R) {
    const st = S();
    const now = Date.now();
    if (k === 'live') {
      st.liveUpdatedAt = now;
      const pre = st.live.find((e) => e.status === 'PRE_GAME');
      if (pre) { pre.status = 'LIVE'; pre.period = 'Round 1'; R.counts.live++; notify('Live Event', `Now live: ${pre.away.name} on ${pre.network}`, '#/live'); }
      const newFinal = st.live.find((e) => e.status === 'HALFTIME');
      if (newFinal) { newFinal.status = 'LIVE'; newFinal.period = 'P3'; newFinal.clock = 1200; }
      renderLiveBanner();
    }
    if (k === 'videos') {
      const pool = D.REFRESH_POOL.slice(st.poolIdx, st.poolIdx + 2);
      st.poolIdx += pool.length;
      pool.forEach((p, i) => {
        const v = Desk.clone(p);
        delete v.transcript; delete v.assign;
        v.publishedAt = now - (8 + i * 11) * 60e3;
        st.videos.push(v);
        if (p.transcript) st.transcripts[v.id] = D.tr(v.id, p.transcript);
        R.counts.videos++; R.added.push(v.id);
        if (['INTERVIEW', 'PRESS_CONFERENCE'].includes(v.type)) R.counts.interviews++;
        if (['FULL_REPLAY', 'CONDENSED_GAME'].includes(v.type)) R.counts.replays++;
        const fav = v.teams.some((t) => st.settings.followedTeams.includes(t));
        if (fav) notify('Followed Team', `New video: ${v.title}`, '#/video/' + v.id);
      });
      const fin = st.live.find((e) => e.status === 'FINAL' && !e.replay);
      if (fin) { fin.replay = true; R.counts.replays++; }
    }
    if (k === 'assignments') {
      R.added.forEach((vid) => {
        const p = D.REFRESH_POOL.find((x) => x.id === vid);
        if (!p || !p.assign || asgForVideo(vid)) return;
        const dueAt = now + p.assign.dueH * H;
        st.assignments.push({ id: uid('a'), videoId: vid, assignedBy: 'Jordan Pike (NFL Desk)', assignedAt: now, dueAt, priority: p.assign.priority, status: 'ASSIGNED', progress: 0, summaryRequired: false, reminders: Desk.defaultReminders(dueAt, now) });
        R.counts.assign++;
        notify('Assignments', `New assignment: ${video(vid).title} · due ${fmtWhen(dueAt)}`, '#/video/' + vid);
      });
    }
    if (k === 'transcripts') {
      Object.entries(D.PENDING_TRANSCRIPTS).forEach(([vid, pt]) => {
        const v = video(vid);
        if (!v || v.transcriptStatus !== 'processing') return;
        v.transcriptStatus = 'ready';
        v.speakers = Desk.clone(pt.speakers);
        st.transcripts[vid] = D.tr(vid, pt.rows);
        R.counts.transcripts++;
        notify('Transcript Ready', `Transcript ready: ${v.title}`, '#/video/' + vid);
      });
    }
  }
  function renderDrawer() {
    const R = U.refresh;
    if (!R) return;
    let d = $('#refresh-drawer');
    if (!d) { d = document.createElement('div'); d.id = 'refresh-drawer'; d.className = 'refresh-drawer'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite'); document.body.appendChild(d); }
    const lines = [];
    if (!R.running) {
      const c = R.counts;
      [[c.videos, 'new video', 'new videos'], [c.live, 'new live event', 'new live events'], [c.assign, 'assignment change', 'assignment changes'], [c.replays, 'completed-event replay', 'completed-event replays'], [c.interviews, 'new interview clip', 'new interview clips'], [c.transcripts, 'transcript ready', 'transcripts ready']].forEach(([n, one, many]) => { if (n) lines.push(`<div>+ ${n} ${plural(n, one, many)}</div>`); });
      if (!lines.length) lines.push('<div class="none">No material changes since last refresh.</div>');
    }
    d.innerHTML = `<h4><span>${R.running ? 'Refreshing ESPN…' : `Refresh complete · ${fmtTime(S().lastRefresh)}`}</span><button class="btn-mini" data-act="drawer-close" aria-label="Close">✕</button></h4>
      ${STEPS.map(([l], i) => `<div class="rstep ${i < R.idx ? 'done' : i === R.idx && R.running ? 'doing' : ''}"><span>${l}</span><span class="st">${i < R.idx ? 'refreshed ✓' : i === R.idx && R.running ? 'refreshing…' : 'queued'}</span></div>`).join('')}
      ${R.running ? '<div class="tiny" style="color:#9aa0a8;margin-top:6px">You can keep working — modules update as they arrive.</div>' : `<div class="receipt">${lines.join('')}</div>`}`;
  }

  // ================= Player (PRD §14, §15) =================
  let playTimer = null;
  function setupPlayer(id, params) {
    const v = video(id);
    if (!v) return;
    const t = params.get('t');
    const tab = params.get('tab');
    if (!U.player || U.player.videoId !== id) {
      stopPlayer();
      U.player = {
        videoId: id, playing: false, pos: t != null ? +t : Desk.watchPos(id), speed: S().settings.speed,
        tab: tab || 'summary', mode: S().settings.summaryMode, follow: true, spkOff: [], tq: '',
        clipIn: null, clipOut: null, genBusy: false, askLog: [], askScope: 'video', lastSeg: null, liveSig: '',
        atLiveEdge: v.live && t == null,
      };
      if (S().settings.historyVisible) { S().history = S().history.filter((h) => h.videoId !== id); S().history.unshift({ videoId: id, at: Date.now() }); save(); }
    } else {
      if (t != null) { U.player.pos = +t; U.player.atLiveEdge = false; }
      if (tab) U.player.tab = tab;
    }
    if (params.get('gen') === '1') { U.player.tab = 'summary'; setTimeout(() => generateSummary(), 50); history.replaceState(null, '', `#/video/${id}?tab=summary`); }
    if (t != null && params.get('play') === '1') setTimeout(() => play(true), 100);
  }
  function stopPlayer() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    if (U.player) persistPos();
    if (U.player && route().name !== 'video') U.player = null;
  }
  function persistPos() {
    const P = U.player; if (!P) return;
    const v = video(P.videoId);
    S().pos[P.videoId] = Math.floor(P.pos);
    const a = asgForVideo(P.videoId);
    if (a && !v.live) a.progress = Math.max(a.progress || 0, Math.min(1, P.pos / v.duration));
    save();
  }
  function mountPlayer() {
    const P = U.player; if (!P) return;
    renderTimeline(); renderChapters(); renderSpeakerChips(); renderTranscript(); renderAIBody(); updatePlayerUI(true);
    const tl = $('#timeline');
    tl.addEventListener('click', (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * Desk.videoDuration(video(P.videoId))); });
    tl.addEventListener('mousemove', (e) => {
      const r = tl.getBoundingClientRect(); const f = clamp((e.clientX - r.left) / r.width, 0, 1);
      let tip = tl.querySelector('.hover-tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'hover-tip'; tl.appendChild(tip); }
      tip.style.left = f * 100 + '%'; tip.textContent = fmtDur(f * Desk.videoDuration(video(P.videoId)));
    });
    tl.addEventListener('mouseleave', () => { const tip = tl.querySelector('.hover-tip'); if (tip) tip.remove(); });
    tl.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { seek(P.pos - 10); e.preventDefault(); } if (e.key === 'ArrowRight') { seek(P.pos + 10); e.preventDefault(); } });
    if (P.playing) startTimer();
  }
  function renderTimeline() {
    const P = U.player; const v = video(P.videoId); const dur = Desk.videoDuration(v) || 1;
    const pct = (t) => clamp((t / dur) * 100, 0, 100) + '%';
    const chaps = (v.chapters || []).map(([t, l]) => `<span class="mk chap" style="left:${pct(D.ts(t))}" title="${esc(l)}"></span>`).join('');
    const quotes = transcript(v.id).filter((s) => s.key && s.t <= dur).map((s) => `<span class="mk quote" style="left:${pct(s.t)}" title="${fmtDur(s.t)} · ${esc(speaker(v, s.spk).name)}: ${esc(s.sum || s.topic || '')}"></span>`).join('');
    const notes = S().notes.filter((n) => n.videoId === v.id).map((n) => `<span class="mk mk-note" style="left:${pct(n.t)}" title="Note ${fmtDur(n.t)}: ${esc(n.text)}"></span>`).join('');
    const clips = S().clips.filter((c) => c.videoId === v.id).map((c) => `<span class="clip-range" style="left:${pct(c.start)};width:${(Math.max(c.end - c.start, 1) / dur) * 100}%" title="Clip: ${esc(c.title)}"></span>`).join('');
    const pending = P.clipIn != null ? `<span class="clip-range" style="left:${pct(P.clipIn)};width:${(Math.max((P.clipOut != null ? P.clipOut : P.pos) - P.clipIn, 1) / dur) * 100}%;border-style:dashed" title="Pending clip"></span>` : '';
    $('#timeline').innerHTML = `<div class="track"></div>${clips}${pending}<div class="fill" id="tl-fill"></div>${chaps}${quotes}${notes}<div class="head" id="tl-head"></div>`;
  }
  function renderChapters() {
    const P = U.player; const v = video(P.videoId);
    $('#chapters').innerHTML = (v.chapters || []).filter(([t]) => D.ts(t) <= Desk.videoDuration(v)).map(([t, l]) => `<button class="chapter" data-act="p-seek" data-t="${D.ts(t)}" data-chap="${D.ts(t)}">${esc(l)} <span class="muted num">${fmtDur(D.ts(t))}</span></button>`).join('');
  }
  function renderSpeakerChips() {
    const P = U.player; const v = video(P.videoId);
    const col = { 'r-b': 'var(--blue)', 'r-i': 'var(--green)', 'r-o': 'var(--amber)' };
    $('#spk-chips').innerHTML = (v.speakers || []).map((s) => `<button class="speaker-chip" data-act="p-spk" data-s="${s.id}" aria-pressed="${!P.spkOff.includes(s.id)}" title="${esc(Desk.ROLE_LABEL[s.role])} · ${Math.round(s.conf * 100)}% attribution confidence"><i style="background:${col[Desk.roleClass(s.role)]}"></i>${esc(s.conf < 0.75 ? s.name + '?' : s.name)}</button>`).join('');
  }
  function visibleSegs(v) {
    const segs = transcript(v.id);
    return v.live ? segs.filter((s) => s.t <= S().livePos) : segs;
  }
  function renderTranscript() {
    const P = U.player; const v = video(P.videoId);
    const el = $('#tlist'); if (!el) return;
    if (v.transcriptStatus === 'processing') {
      el.innerHTML = `<div class="card-pad"><div class="banner-warn">${ic('clock').replace('<svg', '<svg style="width:16px;height:16px"')} Transcript still processing (est. 72%). Video remains playable — try <b>Refresh ESPN Now</b> in a moment.</div></div>`;
      return;
    }
    const words = P.tq.toLowerCase().split(/\s+/).filter(Boolean);
    const segs = visibleSegs(v).filter((s) => !P.spkOff.includes(s.spk) && (!words.length || words.every((w) => s.text.toLowerCase().includes(w))));
    const noteCount = {};
    S().notes.filter((n) => n.videoId === v.id).forEach((n) => { const seg = visibleSegs(v).filter((s) => s.t <= n.t).pop(); if (seg) noteCount[seg.id] = (noteCount[seg.id] || 0) + 1; });
    el.innerHTML = segs.length ? segs.map((s) => {
      const sp = speaker(v, s.spk);
      const partial = v.live && S().livePos - s.t < 25;
      const conf = Math.min(s.conf, sp.conf);
      return `<div class="tline ${partial ? 'partial' : ''}" data-act="p-seek" data-t="${s.t}" data-sid="${s.id}">
        <span class="tt">${fmtDur(s.t)}</span>
        <div><div class="who">${Desk.spkName(v, s.spk)} ${Desk.roleTag(sp.role)}${conf < 0.8 ? `<span class="tiny muted">${Math.round(conf * 100)}% conf.</span>` : ''}${partial ? '<span class="trust live">Partial</span>' : ''}${s.topic ? `<span class="tiny muted">· ${esc(s.topic)}</span>` : ''}${noteCount[s.id] ? `<span class="tiny" style="color:var(--amber)">✎ ${noteCount[s.id]}</span>` : ''}</div>
        <div class="txt">${Desk.highlight(s.text, words)}</div></div></div>`;
    }).join('') + (v.live ? `<div class="tline partial"><span class="tt">LIVE</span><div class="txt muted">Listening… speech-to-text streaming from the authorized feed</div></div>` : '')
      : `<div class="card-pad muted small">${P.tq ? 'No transcript lines match.' : 'No transcript lines for the selected speakers.'}</div>`;
    P.lastSeg = null;
    updatePlayerUI(true);
  }
  function curSeg() {
    const P = U.player; const v = video(P.videoId);
    const segs = visibleSegs(v);
    let cur = null;
    for (const s of segs) { if (s.t <= P.pos + 0.5) cur = s; else break; }
    return cur;
  }
  function updatePlayerUI(forceScroll) {
    const P = U.player; if (!P || !$('#ptime')) return;
    const v = video(P.videoId);
    const dur = Desk.videoDuration(v) || 1;
    if (v.live && P.atLiveEdge) P.pos = dur;
    const f = clamp(P.pos / dur, 0, 1);
    $('#ptime').textContent = v.live ? (P.atLiveEdge ? `LIVE · ${fmtDur(P.pos)}` : `${fmtDur(P.pos)} · ${fmtDur(dur - P.pos)} behind live`) : `${fmtDur(P.pos)} / ${fmtDur(dur)}`;
    const fill = $('#tl-fill'); if (fill) fill.style.width = f * 100 + '%';
    const head = $('#tl-head'); if (head) head.style.left = f * 100 + '%';
    $('#timeline').setAttribute('aria-valuenow', Math.floor(P.pos));
    $('#play-btn').innerHTML = ic(P.playing ? 'pause' : 'play');
    const pb = $('#play-big'); if (pb) pb.style.visibility = P.playing ? 'hidden' : 'visible';
    const gl = $('#golive'); if (gl) gl.classList.toggle('on', !!P.atLiveEdge);
    const lb = $('#live-bug'); if (lb) { const e = S().live.find((x) => x.id === v.liveEventId); if (e) lb.textContent = `${e.away.abbr} ${e.away.score} · ${e.home.abbr} ${e.home.score} · ${liveStatusText(e)}`; }
    const seg = curSeg();
    const cap = $('#caption');
    const showCap = S().settings.captions && seg && P.pos - seg.t < 30 && (P.playing || P.pos > 0);
    cap.hidden = !showCap;
    if (showCap) cap.innerHTML = `<span class="who">${esc(Desk.spkName(v, seg.spk, { plain: true }))}</span>${esc(seg.text)}`;
    if (!seg || seg.id !== P.lastSeg || forceScroll) {
      $$('.tline.active').forEach((el) => el.classList.remove('active'));
      if (seg) {
        const el = $(`.tline[data-sid="${seg.id}"]`);
        if (el) { el.classList.add('active'); if (P.follow && (P.playing || forceScroll)) { const box = $('#tlist'); box.scrollTop = el.offsetTop - box.offsetTop - 60; } }
      }
      P.lastSeg = seg ? seg.id : null;
    }
    let chap = null;
    (v.chapters || []).forEach(([t]) => { if (D.ts(t) <= P.pos) chap = D.ts(t); });
    $$('.chapter').forEach((el) => el.classList.toggle('active', +el.dataset.chap === chap));
  }
  function startTimer() {
    if (playTimer) clearInterval(playTimer);
    let n = 0;
    playTimer = setInterval(() => {
      const P = U.player; if (!P || !P.playing) return;
      const v = video(P.videoId);
      if (!(v.live && P.atLiveEdge)) P.pos += 0.25 * P.speed;
      const dur = Desk.videoDuration(v);
      if (v.live && P.pos >= dur) { P.pos = dur; P.atLiveEdge = true; }
      if (!v.live && P.pos >= dur) { P.pos = dur; pause(); onFinished(v); }
      if (++n % 8 === 0) persistPos();
      updatePlayerUI();
    }, 250);
  }
  function play(force) {
    const P = U.player; if (!P) return;
    const v = video(P.videoId);
    if (v.rights !== 'PLAYABLE') { toast(`Playback ${Desk.typeLabel(v.rights).toLowerCase()} — transcript and summaries remain available.`); return; }
    if (!v.live && P.pos >= v.duration - 1) P.pos = 0;
    P.playing = true;
    const a = asgForVideo(v.id);
    if (a && ['ASSIGNED', 'QUEUED'].includes(a.status)) { a.status = 'IN_PROGRESS'; save(); refreshPlayerHead(); }
    startTimer();
    updatePlayerUI();
  }
  function pause() { const P = U.player; if (!P) return; P.playing = false; persistPos(); updatePlayerUI(); }
  function toggle() { U.player && (U.player.playing ? pause() : play()); }
  function seek(t) {
    const P = U.player; if (!P) return;
    const v = video(P.videoId);
    const dur = Desk.videoDuration(v);
    P.pos = clamp(t, 0, dur);
    P.atLiveEdge = v.live && P.pos >= dur - 1;
    P.lastSeg = null;
    persistPos();
    updatePlayerUI(true);
  }
  // PRD §44: watch progress 100% + summary required → needs summary
  function onFinished(v) {
    const a = asgForVideo(v.id);
    if (a) {
      a.progress = 1;
      if (['ASSIGNED', 'QUEUED', 'IN_PROGRESS'].includes(a.status)) {
        a.status = a.summaryRequired ? 'WATCHED' : 'WATCHED';
        save();
        toast(a.summaryRequired ? 'Watched — this assignment needs a summary.' : 'Watched — mark complete when ready.', { action: a.summaryRequired ? ['Generate summary', () => { U.player.tab = 'summary'; generateSummary(); }] : ['Mark complete', () => complete(a)] });
        refreshPlayerHead();
      }
    }
  }
  function refreshPlayerHead() {
    // Re-render the page while keeping player state and transcript scroll.
    const box = $('#tlist'); const sc = box ? box.scrollTop : 0;
    const wasPlaying = U.player && U.player.playing;
    render();
    const nb = $('#tlist'); if (nb) nb.scrollTop = sc;
    if (wasPlaying) startTimer();
  }
  function livePlayerTick() {
    const P = U.player; const v = video(P.videoId);
    const segs = visibleSegs(v);
    const sig = segs.length + ':' + segs.filter((s) => S().livePos - s.t < 25).length;
    if (sig !== P.liveSig) {
      const isNew = P.liveSig && +sig.split(':')[0] > +P.liveSig.split(':')[0];
      P.liveSig = sig;
      const box = $('#tlist'); const sc = box ? box.scrollTop : 0;
      renderTranscript(); renderTimeline(); renderChapters();
      if (box && !P.follow) $('#tlist').scrollTop = sc;
      if (isNew && P.tab === 'summary') renderAIBody();
    }
    if (P.atLiveEdge || !P.playing) updatePlayerUI();
  }

  // ---- AI side panel ----
  function renderAIBody() {
    const P = U.player; const el = $('#aibody'); if (!P || !el) return;
    const v = video(P.videoId);
    $$('.panel-tabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === P.tab));
    const a = asgForVideo(v.id);
    let html = '';
    if (P.tab === 'summary') {
      if (v.transcriptStatus === 'processing') html = `<div class="banner-warn">AI summary unavailable — the transcript is still processing. The original video and your notes remain accessible.</div>`;
      else {
        const meta = (S().summaries[v.id] || {})[P.mode];
        const modeSel = `<select class="select" data-inp="p-mode" style="flex:1" aria-label="Summary mode">${Desk.MODES.map(([k, l]) => `<option value="${k}" ${P.mode === k ? 'selected' : ''}>${l}${(S().summaries[v.id] || {})[k] ? ' ✓' : ''}</option>`).join('')}</select>`;
        html = `<div class="row" style="margin-bottom:10px">${modeSel}<button class="btn sm ${meta ? '' : 'primary'}" data-act="p-gen" ${P.genBusy ? 'disabled' : ''}>${ic('sparkle')} ${meta ? 'Regenerate' : 'Generate'}</button></div>`;
        if (P.genBusy) html += `<div class="tiny muted">Retrieving ${visibleSegs(v).length} transcript segments · building context…</div><div class="skeleton"></div><div class="skeleton" style="width:85%"></div><div class="skeleton" style="width:92%"></div><div class="skeleton" style="width:60%"></div>`;
        else if (meta) {
          const out = Desk.summarize(v.id, P.mode);
          html += `<div class="row" style="gap:6px;margin-bottom:4px"><span class="trust ai">AI summary</span>${v.live ? '<span class="trust live">Live / unfinalized</span>' : ''}<span class="tiny muted">${esc(Desk.MODES.find((m) => m[0] === P.mode)[1])}</span></div>
            <div class="ai-out">${out.html}</div>
            <div class="ai-meta"><span>Model ${esc(meta.model)}</span><span>Template ${esc(meta.template)}</span><span>Generated ${fmtAgo(meta.generatedAt)}</span><span>${new Set(out.ids).size} source segments</span><span>${meta.reviewed ? '✓ Human-reviewed' : 'Not yet reviewed'}</span></div>
            <div class="row" style="margin-top:10px">${!meta.reviewed ? `<button class="btn sm green" data-act="p-approve">${ic('check')} Review & approve</button>` : ''}<button class="btn sm" data-act="p-copy-sum">Copy</button><button class="btn sm ghost" data-act="p-segsum">Summarize current segment <span class="kbd">S</span></button></div>
            ${v.live ? '<div class="tiny muted" style="margin-top:8px">Live summaries only cover finalized transcript. Avoid conclusions from incomplete commentary.</div>' : ''}`;
        } else {
          html += `<p class="small muted">Generate the <b>${esc(Desk.MODES.find((m) => m[0] === P.mode)[1])}</b> from the timestamped transcript. Every point cites the moment it came from.</p>
            ${a && a.summaryRequired ? `<div class="banner-info">This assignment requires a reviewed summary before it can be completed.</div>` : ''}
            <button class="btn sm ghost" data-act="p-segsum">Summarize current segment <span class="kbd">S</span></button>`;
        }
      }
    } else if (P.tab === 'ask') {
      const topics = [...new Set(visibleSegs(v).map((s) => s.topic).filter((t) => t && !/score|storyline/.test(t)))].slice(0, 3);
      const sugg = topics.map((t) => `What was said about ${t}?`).concat(['Summarize the interview answers', 'Who disagreed?']).slice(0, 4);
      html = `<div class="row" style="margin-bottom:8px"><span class="tiny muted strong">SCOPE</span><div class="seg"><button data-act="p-askscope" data-s="video" aria-pressed="${P.askScope === 'video'}">This video</button><button data-act="p-askscope" data-s="game" aria-pressed="${P.askScope === 'game'}">This game</button></div></div>
        <form class="row" data-form="p-ask" style="margin-bottom:10px"><input class="input" id="p-ask-input" name="q" style="flex:1" placeholder="Ask about this video…  (Q)" autocomplete="off"><button class="btn sm red" type="submit">Ask</button></form>
        ${P.askLog.length ? '' : `<div class="suggest" style="margin-bottom:8px">${sugg.map((q) => `<button data-act="p-ask-sugg" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`}
        <div style="display:flex;flex-direction:column;gap:10px">${P.askLog.slice().reverse().map((m) => {
          if (m.kind === 'segment') { const out = Desk.summarize(v.id, 'TIMELINE', m.range); return `<div class="msg ai"><div class="bubble"><div class="row" style="gap:6px;margin-bottom:4px"><span class="trust ai">Segment summary</span><span class="tiny muted">${fmtDur(m.range[0])}–${fmtDur(m.range[1])}</span></div><div class="ai-out">${out.html}</div></div></div>`; }
          return `<div class="msg user" style="max-width:100%">${esc(m.q)}</div>${Desk.aiMessageHTML({ data: m.data })}`;
        }).join('')}</div>`;
    } else if (P.tab === 'notes') {
      const notes = S().notes.filter((n) => n.videoId === v.id).sort((x, y) => x.t - y.t);
      html = `<form data-form="p-note" class="card" style="padding:10px;margin-bottom:12px;box-shadow:none">
          <div class="row" style="margin-bottom:6px"><span class="tiny muted strong">NEW NOTE AT</span><span class="mono" id="note-at" style="color:var(--blue)">${fmtDur(P.pos)}</span><span class="spacer"></span>
            <select class="select" name="type" style="height:28px;font-size:12px">${Desk.NOTE_TYPES.map((t) => `<option value="${t}">${Desk.typeLabel(t)}</option>`).join('')}</select></div>
          <textarea class="input" id="note-text" name="text" rows="2" style="width:100%;resize:vertical" placeholder="What stood out? (N to focus)"></textarea>
          <div class="row" style="margin-top:6px"><input class="input" name="tags" placeholder="tags, comma separated" style="flex:1;height:28px;font-size:12px"><button class="btn sm primary" type="submit">Add note</button></div></form>
        ${notes.length ? notes.map((n) => Desk.noteHTML(n)).join('') : '<div class="small muted">No notes yet. Press <span class="kbd">N</span> to note the current moment, <span class="kbd">M</span> to bookmark it.</div>'}`;
    } else if (P.tab === 'clips') {
      const clips = S().clips.filter((c) => c.videoId === v.id);
      html = `<div class="card" style="padding:10px;margin-bottom:12px;box-shadow:none">
          <div class="small" style="margin-bottom:8px">Virtual clip — saves start/end timestamps referencing the original asset (no media is cut).</div>
          <div class="row" style="margin-bottom:8px"><button class="btn sm" data-act="p-clip-in">Set in <span class="kbd">I</span></button><span class="mono">${P.clipIn != null ? fmtDur(P.clipIn) : '--:--'}</span><span class="muted">→</span><button class="btn sm" data-act="p-clip-out">Set out <span class="kbd">O</span></button><span class="mono">${P.clipOut != null ? fmtDur(P.clipOut) : '--:--'}</span></div>
          <form data-form="p-clip"><input class="input" name="title" placeholder="Clip title" style="width:100%;margin-bottom:6px" required><div class="row"><input class="input" name="tags" placeholder="tags" style="flex:1"><button class="btn sm primary" type="submit" ${P.clipIn == null || P.clipOut == null ? 'disabled' : ''}>${ic('scissors')} Save clip</button></div><textarea class="input" name="note" rows="2" placeholder="Optional note" style="width:100%;margin-top:6px"></textarea></form></div>
        ${clips.map((c) => `<div class="note" style="background:#f3fbf7"><div class="n-head"><span class="pill">${ic('scissors').replace('<svg', '<svg style="width:11px;height:11px"')} Clip</span><span class="mono">${fmtDur(c.start)}–${fmtDur(c.end)}</span><span class="spacer"></span><button class="btn sm ghost" data-act="clip-del" data-c="${c.id}" aria-label="Delete">${ic('x')}</button></div><div class="strong">${esc(c.title)}</div>${c.note ? `<div class="small">${esc(c.note)}</div>` : ''}<div class="row" style="margin-top:6px"><button class="btn sm" data-act="clip-play" data-c="${c.id}">${ic('play')} Play clip</button><button class="btn sm ghost" data-act="share" data-v="${v.id}" data-t="${c.start}">${ic('link')} Link</button></div></div>`).join('') || '<div class="small muted">No clips for this video.</div>'}`;
    } else {
      const row = (k, val) => `<tr><td class="muted small" style="width:38%;padding:5px 0">${k}</td><td class="small" style="padding:5px 0">${val}</td></tr>`;
      html = `<table style="width:100%;border-collapse:collapse">
          ${row('Sport', esc(Desk.sportById(v.sport).name))}${row('League', esc(v.league))}${row('Type', esc(Desk.typeLabel(v.type)))}${row('Program', esc(v.program))}${row('Network', esc(v.network))}
          ${row('Teams', esc(v.teams.join(', ') || '—'))}${row('Athletes', esc(v.players.join(', ') || '—'))}${row('Tags', (v.tags || []).map((t) => `<span class="pill tag">${esc(t)}</span>`).join(' ') || '—')}
          ${row('Duration', v.live ? 'Live' : fmtDur(v.duration))}${row('Published', esc(fmtWhen(v.publishedAt)))}
          ${row('Playback', `<span class="badge ${v.rights === 'PLAYABLE' ? 'b-green' : 'b-red'}">${esc(Desk.typeLabel(v.rights))}</span>`)}${row('Transcript', esc(Desk.typeLabel(v.transcriptStatus)))}
        </table>
        <h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Speakers</h4>
        ${(v.speakers || []).map((s) => `<div class="row small" style="padding:3px 0">${Desk.spkName(v, s.id)} ${Desk.roleTag(s.role)}<span class="spacer"></span><span class="num muted">${Math.round(s.conf * 100)}%</span></div>`).join('') || '<div class="small muted">Pending diarization.</div>'}
        ${a ? `<h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Assignment</h4><table style="width:100%">${row('Assigned by', esc(a.assignedBy))}${row('Assigned', esc(fmtWhen(a.assignedAt)))}${row('Due', Desk.dueBadge(a) + ` <button class="link-btn" data-act="asg-due" data-a="${a.id}">Change</button>`)}${row('Priority', Desk.prio(a.priority))}${row('Status', Desk.statusBadge(a))}${row('Summary required', a.summaryRequired ? 'Yes' : 'No')}${row('Reminders', (a.reminders || []).filter((r) => !r.sent).length + ` upcoming <button class="link-btn" data-act="asg-remind" data-a="${a.id}">Manage</button>`)}</table>` : ''}
        <h4 style="margin:14px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Audit</h4>
        <div class="tiny muted">Rights scope: internal_or_authorized · Source: authorized video CMS · AI artifacts store model, template version, source segment IDs and human edits.</div>`;
    }
    el.innerHTML = html;
  }
  function generateSummary() {
    const P = U.player; if (!P) return;
    const v = video(P.videoId);
    if (v.transcriptStatus === 'processing') { toast('Summary unavailable until the transcript finishes processing.'); return; }
    P.genBusy = true; P.tab = 'summary'; renderAIBody();
    setTimeout(() => {
      if (!U.player || U.player.videoId !== v.id) return;
      P.genBusy = false;
      S().summaries[v.id] = S().summaries[v.id] || {};
      S().summaries[v.id][P.mode] = { generatedAt: Date.now(), model: Desk.MODEL, template: P.mode.toLowerCase() + '@1.3', reviewed: false };
      const a = asgForVideo(v.id);
      if (a && a.status === 'WATCHED') { a.status = 'SUMMARIZED'; toast('Summary ready — review it to complete the assignment.'); }
      if (a) notify('Summary Ready', `Summary ready: ${Desk.shortTitle(v)}`, `#/video/${v.id}?tab=summary`);
      save();
      refreshPlayerHead();
    }, 900 + Math.random() * 500);
  }
  function approveSummary() {
    const P = U.player; const v = video(P.videoId);
    const meta = S().summaries[v.id][P.mode];
    meta.reviewed = true; meta.reviewedAt = Date.now();
    const a = asgForVideo(v.id);
    if (a && !isDone(a)) {
      if ((a.progress || 0) >= 0.98 || ['WATCHED', 'SUMMARIZED'].includes(a.status)) { a.status = 'COMPLETE'; a.completedAt = Date.now(); toast('Summary reviewed — assignment marked complete ✓'); }
      else { a.status = 'REVIEWED'; toast('Summary reviewed. Finish watching to complete.'); }
    } else toast('Summary approved.');
    save();
    refreshPlayerHead();
  }
  function segmentSummary() {
    const P = U.player; if (!P) return;
    P.askLog.push({ kind: 'segment', range: [Math.max(0, P.pos - 180), P.pos + 30] });
    P.tab = 'ask'; renderAIBody();
  }
  function askVideo(q) {
    const P = U.player; if (!P || !q.trim()) return;
    const tm = q.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (/around|at|near/.test(q) && tm) {
      const t = tm[3] != null ? +tm[1] * 3600 + +tm[2] * 60 + +tm[3] : +tm[1] * 60 + +tm[2];
      P.askLog.push({ kind: 'segment', range: [Math.max(0, t - 120), t + 60] });
    } else {
      const data = Desk.answer(q, { type: P.askScope, value: P.videoId });
      P.askLog.push({ q, data });
    }
    renderAIBody();
  }

  // ================= Command palette (PRD §22) =================
  function palItems(q) {
    const st = S();
    const items = [];
    const ql = q.trim().toLowerCase();
    const stripped = ql.replace(/^(open|play|find|watch|show|jump to|pull up)\s+/, '');
    const words = stripped.split(/\s+/).filter(Boolean);
    const vmatch = (v) => { const hay = [v.title, v.league, v.program, v.type, Desk.sportById(v.sport).name, ...v.teams, ...v.players].join(' ').toLowerCase().replace(/_/g, ' '); return words.every((w) => hay.includes(w) || (w === 'latest') || (w === 'last') || (w === 'night') || (w === "night's")); };
    // Commands
    const cmds = [
      ['Refresh ESPN Now', 'Update assignments, live events and feeds', 'refresh', () => doRefresh(), 'R'],
      ['Show unfinished assignments', 'Assignments · open', 'clipboard', () => { U.asgFilter = 'open'; go('#/assignments'); }],
      ['Show unfinished NFL assignments', 'Assignments · NFL', 'clipboard', () => { U.asgFilter = 'league:NFL'; go('#/assignments'); }],
      ['Show overdue assignments', 'Assignments · overdue', 'alert', () => { U.asgFilter = 'overdue'; go('#/assignments'); }],
      ['Go to Home', '', 'home', () => go('#/home')], ['Go to Live', '', 'live', () => go('#/live')], ['Go to Library', '', 'film', () => go('#/library')],
      ['Go to Chat', '', 'chat', () => go('#/chat')], ['Go to What they said', 'Commentary explorer', 'mic', () => go('#/commentary')], ['Go to Notes', '', 'note', () => go('#/notes')],
      ['Go to Settings', '', 'settings', () => go('#/settings')], ['Keyboard shortcuts', '', 'grid', () => shortcuts(), '?'],
    ];
    cmds.filter(([l, sub]) => !ql || (l + ' ' + sub).toLowerCase().includes(ql) || words.every((w) => l.toLowerCase().includes(w))).slice(0, ql ? 4 : 5)
      .forEach(([l, sub, icon, run, hint]) => items.push({ group: 'Commands', label: l, sub, icon, run, hint }));
    // Videos
    let vids = st.videos.filter((v) => !ql || vmatch(v));
    if (/latest|last/.test(ql)) vids.sort((a, b) => b.publishedAt - a.publishedAt);
    vids.slice(0, ql ? 6 : 4).forEach((v) => items.push({
      group: 'Videos', label: v.title, sub: `${v.league} · ${Desk.typeLabel(v.type)} · ${fmtAgo(v.publishedAt)}`, icon: 'play', vid: v.id,
      run: (mod) => { if (mod === 'shift') { addQueue(v.id); } else if (mod === 'alt') { askAbout(v.id); } else go('#/video/' + v.id); }, hint: '↵ play · ⇧↵ queue · ⌥↵ ask',
    }));
    // Clips
    st.clips.filter((c) => !ql || /clip/.test(ql) || words.every((w) => c.title.toLowerCase().includes(w))).slice(0, 3)
      .forEach((c) => items.push({ group: 'Saved clips', label: c.title, sub: `${Desk.shortTitle(video(c.videoId))} · ${fmtDur(c.start)}–${fmtDur(c.end)}`, icon: 'scissors', run: () => playClip(c.id) }));
    // Transcript moments
    if (ql.length > 3) {
      Desk.retrieve(q, { type: 'all' }, 3).results.forEach((r) => items.push({
        group: 'Transcript moments', label: `${speaker(r.v, r.seg.spk).name}: ${r.seg.sum || r.seg.text}`, sub: `${Desk.shortTitle(r.v)} • ${fmtDur(r.seg.t)}`, icon: 'mic',
        run: () => go(`#/video/${r.v.id}?t=${r.seg.t}`),
      }));
      items.push({ group: 'Ask', label: `Ask AI: “${q.trim()}”`, sub: 'Timestamped answer from transcripts', icon: 'sparkle', run: () => { go('#/chat'); setTimeout(() => chatSend(q.trim()), 60); } });
      items.push({ group: 'Ask', label: `Search library for “${q.trim()}”`, sub: '', icon: 'search', run: () => { U.lib.q = q.trim(); go('#/library'); } });
    }
    return items;
  }
  function openPalette(initial) {
    U.pal = { q: initial || '', sel: 0, items: [] };
    $('#layer').innerHTML = `<div class="overlay" data-overlay><div class="palette" role="dialog" aria-label="Command palette"><input id="pal-input" placeholder="Open Liberty at Aces · Find Greene postgame interview · Show unfinished NFL assignments…" autocomplete="off" aria-label="Command"><div class="pal-list" id="pal-list" role="listbox"></div><div class="pal-foot"><span>↑↓ navigate</span><span>↵ open</span><span>⇧↵ add to queue</span><span>⌥↵ ask AI</span><span>esc close</span></div></div></div>`;
    const inp = $('#pal-input');
    inp.value = U.pal.q;
    inp.focus();
    renderPal();
    inp.addEventListener('input', () => { U.pal.q = inp.value; U.pal.sel = 0; renderPal(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { U.pal.sel = Math.min(U.pal.items.length - 1, U.pal.sel + 1); renderPal(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { U.pal.sel = Math.max(0, U.pal.sel - 1); renderPal(); e.preventDefault(); }
      if (e.key === 'Enter') { e.preventDefault(); runPal(U.pal.sel, e.shiftKey ? 'shift' : e.altKey ? 'alt' : null); }
    });
  }
  function renderPal() {
    const P = U.pal;
    P.items = palItems(P.q);
    let g = '';
    $('#pal-list').innerHTML = P.items.map((it, i) => {
      const head = it.group !== g ? `<div class="pal-group">${esc(it.group)}</div>` : '';
      g = it.group;
      return `${head}<div class="pal-item ${i === P.sel ? 'sel' : ''}" data-act="pal-run" data-i="${i}" role="option" aria-selected="${i === P.sel}">${ic(it.icon).replace('<svg', '<svg style="width:15px;height:15px;flex-shrink:0"')}<div style="min-width:0"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.label)}</div>${it.sub ? `<div class="tiny muted">${esc(it.sub)}</div>` : ''}</div>${i === P.sel && it.hint ? `<span class="hint">${esc(it.hint)}</span>` : ''}</div>`;
    }).join('') || '<div class="card-pad muted small">No results.</div>';
    const sel = $('.pal-item.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function runPal(i, mod) { const it = U.pal && U.pal.items[i]; if (!it) return; closeLayer(); it.run(mod); }

  // ================= Misc actions =================
  function addQueue(vid) {
    if (!S().queue.includes(vid)) { S().queue.push(vid); save(); toast(`Added to queue: ${esc(Desk.shortTitle(video(vid)))}`, { undo: () => { S().queue = S().queue.filter((x) => x !== vid); save(); rerender(); } }); }
    else toast('Already in your queue');
    renderSidebar();
  }
  function askAbout(vid) {
    U.chatScope = { type: 'video', value: vid, sport: 'all', league: 'all', date: 'any' };
    go('#/chat');
  }
  function playClip(cid) {
    const c = S().clips.find((x) => x.id === cid); if (!c) return;
    go(`#/video/${c.videoId}?t=${c.start}&play=1`);
    toast(`Playing clip “${esc(c.title)}” (${fmtDur(c.start)}–${fmtDur(c.end)})`);
    const stopAt = setInterval(() => {
      const P = U.player;
      if (!P || P.videoId !== c.videoId) return clearInterval(stopAt);
      if (P.pos >= c.end) { pause(); clearInterval(stopAt); toast('Clip ended'); }
    }, 250);
  }
  function share(vid, t) {
    const url = `${location.origin}${location.pathname}#/video/${vid}${t != null ? '?t=' + Math.floor(t) : ''}`;
    try { navigator.clipboard.writeText(url); } catch (e) { /* clipboard unavailable */ }
    toast(`Internal link copied${t != null ? ' at ' + fmtDur(t) : ''}`);
  }
  function toggleSave(vid) {
    const st = S();
    if (st.saved.includes(vid)) { st.saved = st.saved.filter((x) => x !== vid); toast('Removed from saved'); }
    else { st.saved.push(vid); toast('Saved'); }
    save();
  }
  function shortcuts() {
    const rows = [['⌘/Ctrl K', 'Command palette'], ['/', 'Focus search'], ['R', 'Refresh ESPN Now'], ['?', 'This help'], ['Space', 'Play / pause'], ['J / L', 'Back / forward 10 seconds'], ['K', 'Pause'], ['← / →', 'Back / forward 5 seconds'], ['M', 'Add bookmark marker'], ['N', 'Add note at current time'], ['S', 'Summarize current segment'], ['Q', 'Ask AI about current segment'], ['I / O', 'Set clip in / out'], ['C', 'Mark assignment complete'], ['Esc', 'Close dialogs']];
    modal(`<h2>Keyboard shortcuts</h2><table style="width:100%;font-size:13px">${rows.map(([k, l]) => `<tr><td style="padding:4px 0;width:130px"><span class="kbd" style="opacity:1">${k}</span></td><td>${l}</td></tr>`).join('')}</table><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="layer-close">Close</button></div>`);
  }

  // ================= Chat =================
  function chatSend(q) {
    if (!q || !q.trim() || U.chatBusy) return;
    const sc = Object.assign({}, U.chatScope);
    S().chat.push({ role: 'user', text: q.trim(), scopeLabel: Desk.scopeLabel(sc) });
    U.chatBusy = true;
    renderChatLog();
    setTimeout(() => {
      const data = Desk.answer(q.trim(), sc);
      S().chat.push({ role: 'ai', data });
      U.chatBusy = false;
      save();
      renderChatLog();
    }, 550 + Math.random() * 400);
  }
  function renderChatLog() {
    const log = $('#chat-log'); if (!log) return;
    log.innerHTML = Desk.chatLogHTML();
    log.scrollTop = log.scrollHeight;
  }

  // ================= Event delegation =================
  document.addEventListener('click', (e) => {
    if (U.popover && !U.popover.contains(e.target) && !e.target.closest('[data-act="asg-snooze"],[data-act="asg-remind"],[data-act="asg-more"],[data-act="live-menu"]')) closePopover();
    if (e.target.matches('[data-overlay]')) { closeLayer(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const d = el.dataset;
    const act = d.act;
    const st = S();
    const inPopover = U.popover && U.popover.contains(el);
    const handlers = {
      go: () => go(d.h),
      back: () => (history.length > 1 ? history.back() : go('#/home')),
      open: () => go('#/video/' + d.v),
      seek: () => {
        if (U.player && U.player.videoId === d.v && route().name === 'video') { seek(+d.t); if (!U.player.playing) play(); }
        else go(`#/video/${d.v}?t=${d.t}`);
      },
      'open-all': () => { const hs = JSON.parse(d.hits); hs.slice(1).forEach((h) => { if (!st.queue.includes(h.v)) st.queue.push(h.v); }); save(); const f = hs[0]; const s = Desk.findSeg(f.v, f.seg); go(`#/video/${f.v}?t=${s ? s.t : 0}`); toast(`Opened first source; ${new Set(hs.slice(1).map((h) => h.v)).size} other videos added to your queue.`); },
      refresh: () => doRefresh(),
      'drawer-close': () => { const dr = $('#refresh-drawer'); if (dr) dr.remove(); if (U.refresh && !U.refresh.running) U.refresh = null; },
      'palette-open': () => openPalette(),
      'pal-run': () => runPal(+d.i),
      'layer-close': () => closeLayer(),
      'notif-toggle': () => { if ($('.notif-panel')) closeLayer(); else renderNotifPanel(); },
      'notif-read-all': () => { st.notifs.forEach((n) => (n.read = true)); save(); renderNotifPanel(); renderTopMeta(); },
      'notif-open': () => { const n = st.notifs.find((x) => x.id === d.id); if (n) { n.read = true; save(); closeLayer(); renderTopMeta(); if (n.link) go(n.link); } },
      'nav-toggle': () => $('#app').classList.toggle('nav-open'),
      'sidebar-compact': () => { st.settings.compactSidebar = !st.settings.compactSidebar; save(); renderSidebar(); },
      // live banner
      'live-menu': () => popover(el, liveMenu()),
      'live-scroll': () => { const r = $('.live-rail'); r.scrollBy({ left: +d.d * r.clientWidth * 0.8 }); },
      'live-net': () => { st.settings.liveNetwork = d.n; save(); renderLiveBanner(); },
      'live-filter': () => { st.settings.liveFilter = d.f; save(); renderLiveBanner(); },
      'live-hide': () => { st.settings.hideScores = !st.settings.hideScores; save(); renderLiveBanner(); if (route().name === 'live') rerender(); },
      'live-compact': () => { st.settings.compactLive = !st.settings.compactLive; save(); renderLiveBanner(); },
      'live-watch': () => {
        const ev = st.live.find((x) => x.id === d.e);
        if (ev && ev.videoId) go('#/video/' + ev.videoId);
        else toast(`Opening the authorized ${esc(ev.network)} stream in a new window (demo) · added to your session history`);
      },
      'live-save': () => { const ev = st.live.find((x) => x.id === d.e); if (ev.videoId) toggleSave(ev.videoId); else toast(`Saved: ${esc(Desk.eventName(ev))} — replay will appear in Saved when available`); },
      'live-remind': () => { const ev = st.live.find((x) => x.id === d.e); toast(`You'll be notified when ${esc(Desk.eventName(ev))} starts`); },
      // assignments
      'asg-view': () => { U.asgView = d.view; rerender(); },
      'asg-filter': () => { U.asgFilter = d.f; rerender(); },
      'asg-jump': () => { U.asgFilter = d.f; go('#/assignments'); },
      'asg-complete': () => complete(asg(d.a)),
      'asg-gen': () => go(`#/video/${asg(d.a).videoId}?tab=summary&gen=1`),
      'asg-review': () => { const a = asg(d.a); const m = Object.keys(st.summaries[a.videoId] || {})[0]; if (m) st.settings.summaryMode = m; go(`#/video/${a.videoId}?tab=summary`); if (U.player && m) U.player.mode = m; },
      'asg-review-v': () => { go(`#/video/${d.v}?tab=summary`); setTimeout(() => { if (U.player) { U.player.mode = d.m; renderAIBody(); } }, 0); },
      'asg-snooze': () => popover(el, `<div class="ph">Snooze</div>${[['1h', 'For 1 hour'], ['tonight', 'Until tonight (8:00 PM)'], ['tomorrow', 'Until tomorrow (9:00 AM)'], ['due1d', 'Push due date +1 day']].map(([k, l]) => `<button class="pi" data-act="snooze" data-a="${d.a}" data-w="${k}">${l}</button>`).join('')}`),
      snooze: () => {
        const a = asg(d.a);
        if (d.w === 'due1d') { const prev = a.dueAt; a.dueAt += 24 * H; a.reminders = Desk.defaultReminders(a.dueAt, Date.now()); save(); toast(`Due date moved to ${esc(fmtWhen(a.dueAt))}`, { undo: () => { a.dueAt = prev; a.reminders = Desk.defaultReminders(prev, Date.now()); save(); rerender(); } }); }
        else { const at = atTime(d.w, a); (a.reminders || []).forEach((r) => { if (!r.sent && r.at < at) r.sent = true; }); addReminder(a, at, 'Snoozed'); a.snoozedUntil = at; save(); }
        rerender();
      },
      'asg-remind': () => popover(el, remindMenu(asg(d.a))),
      'asg-remind-pop': () => { const a = asg(d.a); closePopover(); setTimeout(() => { const anchor = $(`[data-act="asg-more"][data-a="${a.id}"]`) || el; popover(anchor, remindMenu(a)); }, 0); },
      'remind-add': () => {
        const a = asg(d.a);
        if (d.w === 'custom') {
          const def = new Date(Math.max(Date.now() + H, a.dueAt - 2 * H)); def.setMinutes(def.getMinutes() - def.getTimezoneOffset());
          modal(`<h2>Custom reminder</h2><form data-form="remind-custom" data-a="${a.id}"><div class="form-row"><label>Date & time</label><input class="input" type="datetime-local" name="at" value="${def.toISOString().slice(0, 16)}" required></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="layer-close">Cancel</button><button class="btn primary" type="submit">Set reminder</button></div></form>`);
        } else if (d.w === 'recurring') addReminder(a, atTime('tomorrow', a), 'Daily until complete', true);
        else addReminder(a, atTime(d.w, a), { tonight: 'Tonight', tomorrow: 'Tomorrow morning', '30m': '30 minutes before due', '1hb': '1 hour before due', '3h': '3 hours before due', '1d': '1 day before due' }[d.w]);
        rerender();
      },
      'remind-del': () => { const a = asg(d.a); a.reminders = a.reminders.filter((r) => r.id !== d.r); save(); closePopover(); toast('Reminder removed'); rerender(); },
      'asg-more': () => popover(el, moreMenu(asg(d.a))),
      'asg-due': () => {
        const a = asg(d.a);
        const def = new Date(a.dueAt); def.setMinutes(def.getMinutes() - def.getTimezoneOffset());
        modal(`<h2>Change due date</h2><p class="small muted">${esc(video(a.videoId).title)}</p><form data-form="due" data-a="${a.id}"><div class="form-row"><label>Due</label><input class="input" type="datetime-local" name="due" value="${def.toISOString().slice(0, 16)}" required></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="layer-close">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`);
      },
      'set-prio': () => { asg(d.a).priority = d.p; save(); rerender(); },
      'set-status': () => { setStatus(asg(d.a), d.s); rerender(); },
      'assign-self': () => { const now = Date.now(); const dueAt = now + 48 * H; st.assignments.push({ id: uid('a'), videoId: d.v, assignedBy: 'Self-assigned', assignedAt: now, dueAt, priority: 'P2', status: 'ASSIGNED', progress: 0, summaryRequired: false, reminders: Desk.defaultReminders(dueAt, now) }); save(); toast('Marked as assigned · due in 2 days'); refreshPlayerHead(); },
      'note-video': () => go(`#/video/${d.v}?tab=notes`),
      'ask-video': () => askAbout(d.v),
      'queue-add': () => addQueue(d.v),
      'queue-remove': () => { st.queue = st.queue.filter((x) => x !== d.v); save(); rerender(); },
      'queue-move': () => { const i = st.queue.indexOf(d.v); const j = i + +d.d; if (j < 0 || j >= st.queue.length) return; [st.queue[i], st.queue[j]] = [st.queue[j], st.queue[i]]; save(); rerender(); },
      'save-toggle': () => { toggleSave(d.v); if (route().name === 'video') refreshPlayerHead(); else rerender(); },
      share: () => share(d.v, d.cur && U.player ? U.player.pos : d.t != null ? +d.t : null),
      'clip-play': () => playClip(d.c),
      'clip-del': () => { st.clips = st.clips.filter((c) => c.id !== d.c); save(); renderTimeline(); renderAIBody(); },
      'note-del': () => { const n = st.notes.find((x) => x.id === d.n); st.notes = st.notes.filter((x) => x.id !== d.n); save(); toast('Note deleted', { undo: () => { st.notes.push(n); save(); rerender(); } }); if (route().name === 'video') { renderTimeline(); renderAIBody(); renderTranscript(); } else rerender(); },
      'history-clear': () => { st.history = []; save(); rerender(); },
      'reset-demo': () => { if (confirm('Reset all demo data (assignments, notes, clips, chat)?')) { stopPlayer(); U.player = null; Desk.reset(); renderLiveBanner(); go('#/home'); toast('Demo data reset'); } },
      shortcuts: () => shortcuts(),
      // library / sport
      'lib-quick': () => { U.lib.q = d.q; rerender(); },
      'lib-league': () => { U.lib = Object.assign(U.lib, { q: `league:"${d.l}"`, sport: 'all' }); go('#/library'); },
      'lib-tag': () => { U.lib = Object.assign(U.lib, { q: `tag:${d.t}`, sport: d.s || 'all' }); go('#/library'); },
      'lib-team': () => { U.lib = Object.assign(U.lib, { q: `team:"${d.t}"`, sport: 'all' }); go('#/library'); },
      // chat
      'chat-suggest': () => chatSend(d.q),
      'chat-clear': () => { st.chat = []; save(); renderChatLog(); },
      'chat-widen': () => { U.chatScope = { type: 'all', sport: 'all', league: 'all', date: 'any' }; const last = st.chat.filter((m) => m.role === 'user').pop(); rerender(); if (last) chatSend(last.text); },
      // player
      'p-play': () => toggle(),
      'p-skip': () => seek(U.player.pos + +d.d),
      'p-seek': () => { seek(+d.t); },
      'p-seg': () => {
        const v = video(U.player.videoId); const segs = visibleSegs(v);
        const t = U.player.pos;
        const s = +d.d > 0 ? segs.find((x) => x.t > t + 0.5) : segs.filter((x) => x.t < t - 2).pop();
        if (s) seek(s.t);
      },
      'p-golive': () => { U.player.atLiveEdge = true; seek(Desk.videoDuration(video(U.player.videoId))); play(); },
      'p-cc': () => { st.settings.captions = !st.settings.captions; save(); el.classList.toggle('on', st.settings.captions); updatePlayerUI(); },
      'p-mark': () => addMarker(),
      'p-clip-in': () => { U.player.clipIn = Math.floor(U.player.pos); if (U.player.clipOut != null && U.player.clipOut <= U.player.clipIn) U.player.clipOut = null; U.player.tab = 'clips'; renderAIBody(); renderTimeline(); updatePlayerUI(); toast(`Clip in: ${fmtDur(U.player.clipIn)}`); },
      'p-clip-out': () => { const P = U.player; if (P.clipIn == null || P.pos <= P.clipIn) { toast('Set an in point before the out point'); return; } P.clipOut = Math.floor(P.pos); P.tab = 'clips'; renderAIBody(); renderTimeline(); updatePlayerUI(); toast(`Clip out: ${fmtDur(P.clipOut)}`); },
      'p-tab': () => { U.player.tab = d.tab; renderAIBody(); },
      'p-gen': () => generateSummary(),
      'p-approve': () => approveSummary(),
      'p-copy-sum': () => { const t = $('#aibody .ai-out'); try { navigator.clipboard.writeText(t ? t.innerText : ''); } catch (err) { /* ignore */ } toast('Summary copied with timestamps'); },
      'p-segsum': () => segmentSummary(),
      'p-spk': () => { const P = U.player; P.spkOff = P.spkOff.includes(d.s) ? P.spkOff.filter((x) => x !== d.s) : P.spkOff.concat(d.s); renderSpeakerChips(); renderTranscript(); },
      'p-askscope': () => { U.player.askScope = d.s; renderAIBody(); },
      'p-ask-sugg': () => askVideo(d.q),
    };
    if (handlers[act]) {
      if (el.tagName === 'A' && act === 'layer-close') { closeLayer(); return; }
      e.preventDefault();
      handlers[act]();
      if (inPopover && !['asg-remind-pop'].includes(act)) closePopover();
    }
  });

  function addMarker() {
    const P = U.player; if (!P) return;
    S().notes.push({ id: uid('n'), videoId: P.videoId, t: Math.floor(P.pos), type: 'TIMESTAMP_NOTE', text: 'Bookmark', createdAt: Date.now(), tags: ['bookmark'] });
    save(); renderTimeline(); updatePlayerUI(); if (P.tab === 'notes') renderAIBody(); renderTranscript();
    toast(`Bookmarked ${fmtDur(P.pos)}`);
  }

  document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('[data-brief-toggle]')) U.briefOpen = e.target.open; }, true);

  // Inputs
  function onInput(e) {
    const el = e.target;
    const k = el.dataset && el.dataset.inp;
    const st = S();
    if (k) {
      const v = el.type === 'checkbox' ? el.checked : el.value;
      if (k.startsWith('lib-')) { U.lib[k.slice(4)] = v; $('#lib-results').innerHTML = Desk.libResultsHTML(); return; }
      if (k.startsWith('comm-')) { U.comm[k.slice(5)] = v; $('#comm-table').innerHTML = Desk.commTableHTML(); return; }
      if (k.startsWith('chat-')) { const f = k.slice(5); if (f === 'type') { U.chatScope.type = v; if (!['video', 'game'].includes(v)) delete U.chatScope.value; } else U.chatScope[f] = v; return; }
      if (k === 'notes-filter') { U.notesFilter = v; rerender(); return; }
      if (k === 'live-net') { st.settings.liveNetwork = v; save(); renderLiveBanner(); return; }
      if (k === 'p-speed') { U.player.speed = +v; toast(`Playback ${v}x`); return; }
      if (k === 'p-follow') { U.player.follow = v; return; }
      if (k === 'p-tq') { U.player.tq = v; renderTranscript(); return; }
      if (k === 'p-mode') { U.player.mode = v; renderAIBody(); return; }
    }
    const set = el.dataset && el.dataset.set;
    if (set && e.type === 'change') {
      const s = st.settings;
      const [kind, ...rest] = set.split(':');
      const key = rest.join(':');
      const tog = (arr, x, on) => (on ? (arr.includes(x) ? arr : arr.concat(x)) : arr.filter((y) => y !== x));
      if (kind === 'fav') s.favSports = tog(s.favSports, key, el.checked);
      else if (kind === 'side') s.sidebarSports = tog(s.sidebarSports, key, el.checked);
      else if (kind === 'team') s.followedTeams = tog(s.followedTeams, key, el.checked);
      else if (kind === 'ath') s.followedAthletes = tog(s.followedAthletes, key, el.checked);
      else if (kind === 'chan') s.channels[key] = el.checked;
      else if (kind === 'mute') s.mutes[key] = !el.checked;
      else if (el.type === 'checkbox') s[set] = el.checked;
      else s[set] = set === 'speed' ? +el.value : el.value;
      if (set === 'defaultAsgView') U.asgView = el.value;
      save(); renderSidebar(); renderTopMeta();
      toast('Preference saved');
    }
  }
  document.addEventListener('input', (e) => { if (e.target.matches('input[type="text"], input:not([type]), textarea') && e.target.dataset.inp) onInput(e); });
  document.addEventListener('change', (e) => { if (e.target.matches('select, input[type="checkbox"]')) onInput(e); });

  // Forms
  document.addEventListener('submit', (e) => {
    const f = e.target;
    const kind = f.dataset.form;
    if (!kind) return;
    e.preventDefault();
    const fd = new FormData(f);
    const st = S();
    if (kind === 'chat') { const ta = $('#chat-input'); chatSend(ta.value); ta.value = ''; }
    if (kind === 'sport-ask') { U.chatScope = { type: 'all', sport: f.dataset.s, league: 'all', date: 'any' }; const q = fd.get('q'); go('#/chat'); setTimeout(() => chatSend(q), 60); }
    if (kind === 'p-ask') { askVideo(fd.get('q')); }
    if (kind === 'p-note') {
      const text = String(fd.get('text') || '').trim();
      if (!text) { $('#note-text').focus(); return; }
      st.notes.push({ id: uid('n'), videoId: U.player.videoId, t: Math.floor(U.player.pos), type: fd.get('type'), text, createdAt: Date.now(), tags: String(fd.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean) });
      save(); renderAIBody(); renderTimeline(); renderTranscript(); renderSidebar();
      toast(`Note added at ${fmtDur(U.player.pos)}`);
    }
    if (kind === 'p-clip') {
      const P = U.player;
      st.clips.push({ id: uid('c'), videoId: P.videoId, start: P.clipIn, end: P.clipOut, title: String(fd.get('title')).trim(), tags: String(fd.get('tags') || '').split(',').map((s) => s.trim()).filter(Boolean), note: String(fd.get('note') || ''), createdAt: Date.now() });
      P.clipIn = P.clipOut = null;
      save(); renderAIBody(); renderTimeline(); renderSidebar();
      toast('Virtual clip saved');
    }
    if (kind === 'due') {
      const a = asg(f.dataset.a);
      const t = new Date(fd.get('due')).getTime();
      if (!isNaN(t)) { a.dueAt = t; a.reminders = Desk.defaultReminders(t, Date.now()); save(); toast(`Due date set to ${esc(fmtWhen(t))}`); }
      closeLayer(); rerender();
    }
    if (kind === 'remind-custom') {
      const a = asg(f.dataset.a);
      const t = new Date(fd.get('at')).getTime();
      if (!isNaN(t)) addReminder(a, t, 'Custom reminder');
      closeLayer(); rerender();
    }
  });

  // Kanban drag & drop
  document.addEventListener('dragstart', (e) => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col) { e.preventDefault(); $$('.kcol.drop').forEach((x) => x !== col && x.classList.remove('drop')); col.classList.add('drop'); } });
  document.addEventListener('dragleave', (e) => { const col = e.target.closest && e.target.closest('[data-drop]'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('drop'); });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('[data-drop]');
    if (!col) return;
    e.preventDefault();
    const a = asg(e.dataTransfer.getData('text/plain'));
    if (a && a.status !== col.dataset.drop) {
      if (col.dataset.drop === 'COMPLETE' && a.summaryRequired && !Desk.hasSummary(a.videoId)) { toast('Needs a reviewed summary before completing.'); rerender(); return; }
      setStatus(a, col.dataset.drop);
    }
    rerender();
  });

  // Keyboard (PRD §14.2, §22, §68)
  document.addEventListener('keydown', (e) => {
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (U.pal) closeLayer(); else openPalette(); return; }
    if (e.key === 'Escape') { if (U.popover) closePopover(); else if ($('#layer').innerHTML) closeLayer(); else if (typing) e.target.blur(); return; }
    if (e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const ta = e.target; chatSend(ta.value); ta.value = ''; return; }
    if (e.target.id === 'global-search' && e.key === 'Enter') {
      const q = e.target.value.trim(); if (!q) return;
      e.target.value = ''; e.target.blur();
      if (/\?$|^(what|who|why|how|which|when|where|did|does|is|are|show|find|summarize|compare|anything|any)\b/i.test(q)) { go('#/chat'); setTimeout(() => chatSend(q), 60); }
      else { U.lib.q = q; go('#/library'); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || $('#layer').innerHTML) return;
    const k = e.key;
    if (k === '/') { e.preventDefault(); openPalette(); return; }
    if (k === '?') { shortcuts(); return; }
    if (route().name === 'video' && U.player) {
      const P = U.player;
      const map = {
        ' ': toggle, k: pause, K: pause, j: () => seek(P.pos - 10), J: () => seek(P.pos - 10), l: () => seek(P.pos + 10), L: () => seek(P.pos + 10),
        ArrowLeft: () => seek(P.pos - 5), ArrowRight: () => seek(P.pos + 5),
        m: addMarker, M: addMarker,
        n: () => { P.tab = 'notes'; renderAIBody(); setTimeout(() => $('#note-text') && $('#note-text').focus(), 0); },
        s: segmentSummary, S: segmentSummary,
        q: () => { P.tab = 'ask'; renderAIBody(); const i = $('#p-ask-input'); if (i) { i.value = `What was said around ${fmtDur(P.pos)}?`; i.focus(); } },
        i: () => $('[data-act="p-clip-in"]').click(), o: () => $('[data-act="p-clip-out"]').click(),
        c: () => { const a = asgForVideo(P.videoId); if (a && !isDone(a)) complete(a); },
      };
      if (map[k]) { e.preventDefault(); map[k](); return; }
    }
    if (k === 'r' || k === 'R') { e.preventDefault(); doRefresh(); }
  });

  // ================= Boot =================
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', () => updateArrows());
  window.addEventListener('beforeunload', () => { persistPos(); try { localStorage.setItem('espn-video-desk:v1', JSON.stringify(Desk.S)); } catch (e) { /* ignore */ } });
  setRefreshBtn('idle');
  renderLiveBanner();
  render();
  checkReminders();
  setInterval(liveTick, 1000);
  Object.assign(Desk, { go, toast, doRefresh, chatSend });
})();
