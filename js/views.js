/* Views: page renderers and shared components. Each view returns { html, rail } */
(function () {
  const Desk = window.Desk;
  const { D, esc, ic, fmtDur, fmtMins, fmtTime, fmtWhen, fmtAgo, fmtIn, fmtDay, dayDiff, sportById, sportStyle, glyph, typeLabel, video, transcript, speaker, asgForVideo, isDone, isOverdue, isDueToday, progressOf, sortByDue, weekStats, hasSummary, cite, spkName, roleTag, H } = Desk;

  // Transient UI state (not persisted)
  const U = (Desk.U = {
    asgView: Desk.S.settings.defaultAsgView || 'list', asgFilter: 'all',
    lib: { q: '', sport: 'all', type: 'all', status: 'all', sort: 'newest' },
    comm: { role: 'all', sport: 'all', topic: 'all', q: '' },
    chatScope: { type: 'all', sport: 'all', league: 'all', date: 'any' },
    chatBusy: false,
    notesFilter: 'all',
    player: null,
  });

  // ---------- Components ----------
  function thumb(v, o) {
    o = o || {};
    const [c1, c2] = sportStyle(v.sport);
    const p = o.progress;
    return `<div class="thumb ${o.sm ? 'sm' : ''}" style="background:linear-gradient(135deg,${c1},${c2})">
      <span class="t-type">${esc(typeLabel(v.type))}</span><span class="t-league">${esc(v.league)}</span>
      ${v.live ? '<span class="t-live">LIVE</span>' : ''}
      <span class="t-dur">${v.live ? 'LIVE' : fmtDur(v.duration)}</span>
      ${p ? `<span class="t-prog" style="width:${Math.min(100, p * 100)}%"></span>` : ''}</div>`;
  }
  const STATUS = {
    ASSIGNED: ['Not started', 'b-gray'], QUEUED: ['Queued', 'b-blue'], IN_PROGRESS: ['In progress', 'b-amber'],
    WATCHED: ['Watched', 'b-violet'], SUMMARIZED: ['Needs review', 'b-violet'], REVIEWED: ['Reviewed', 'b-green'],
    COMPLETE: ['Complete', 'b-green'], SKIPPED: ['Skipped', 'b-gray'], BLOCKED: ['Blocked', 'b-red'], UNASSIGNED: ['Unassigned', 'b-gray'],
  };
  function statusBadge(a) {
    const [l, c] = STATUS[a.status] || [a.status, 'b-gray'];
    const extra = a.status === 'WATCHED' && a.summaryRequired ? ' · needs summary' : '';
    return `<span class="badge ${c}">${l}${extra}</span>`;
  }
  function dueBadge(a) {
    if (isDone(a)) return `<span class="badge b-gray nodot">Due ${esc(fmtDay(a.dueAt))}</span>`;
    if (isOverdue(a)) return `<span class="badge b-red">Overdue · ${esc(fmtIn(a.dueAt).replace(' ago', ''))}</span>`;
    const d = dayDiff(a.dueAt);
    if (d === 0) return `<span class="badge b-amber">Due today ${fmtTime(a.dueAt)}</span>`;
    return `<span class="badge b-gray nodot">Due ${esc(fmtWhen(a.dueAt))}</span>`;
  }
  const prio = (p) => `<span class="prio ${p}" title="${{ P0: 'Must watch', P1: 'High', P2: 'Normal', P3: 'Optional' }[p]}">${p}</span>`;
  function primaryCTA(a, sm) {
    const v = video(a.videoId);
    const cls = sm ? 'btn sm' : 'btn';
    const pos = Desk.watchPos(v.id);
    switch (a.status) {
      case 'ASSIGNED': case 'QUEUED': return `<button class="${cls} red" data-act="open" data-v="${v.id}">${ic('play')} ${v.live ? 'Watch live' : 'Watch'}</button>`;
      case 'IN_PROGRESS': return `<button class="${cls} red" data-act="open" data-v="${v.id}">${ic('play')} Resume ${v.live ? 'live' : fmtDur(pos)}</button>`;
      case 'WATCHED': return a.summaryRequired
        ? `<button class="${cls} primary" data-act="asg-gen" data-a="${a.id}">${ic('sparkle')} Generate summary</button>`
        : `<button class="${cls} green" data-act="asg-complete" data-a="${a.id}">${ic('check')} Mark complete</button>`;
      case 'SUMMARIZED': return `<button class="${cls} primary" data-act="asg-review" data-a="${a.id}">${ic('sparkle')} Review summary</button>`;
      case 'REVIEWED': return `<button class="${cls} green" data-act="asg-complete" data-a="${a.id}">${ic('check')} Mark complete</button>`;
      case 'BLOCKED': return `<button class="${cls}" disabled title="${esc(a.blockedReason || '')}">${ic('alert')} Blocked</button>`;
      default: return `<button class="${cls} ghost" data-act="open" data-v="${v.id}">${ic('play')} Rewatch</button>`;
    }
  }
  function asgCard(a) {
    const v = video(a.videoId);
    const p = progressOf(v.id);
    const notes = Desk.S.notes.filter((n) => n.videoId === v.id).length;
    const sumState = hasSummary(v.id) ? (Object.values(Desk.S.summaries[v.id]).some((s) => s.reviewed) ? 'Summary reviewed' : 'Summary ready') : a.summaryRequired ? 'Summary required' : 'No summary needed';
    const cls = ['card', 'asg', isOverdue(a) ? 'overdue' : '', isDone(a) ? 'complete' : ''].join(' ');
    return `<article class="${cls}" aria-label="${esc(v.title)}">
      <div data-act="open" data-v="${v.id}" style="cursor:pointer">${thumb(v, { progress: p })}</div>
      <div style="min-width:0">
        <div class="row wrap" style="gap:6px">${prio(a.priority)} ${statusBadge(a)} ${dueBadge(a)} ${Desk.S.saved.includes(v.id) ? `<span class="pill">${ic('bookmark')} Saved</span>` : ''}</div>
        <div class="asg-title" data-act="open" data-v="${v.id}">${esc(v.title)}</div>
        <div class="asg-meta">
          <span>${glyph(v.sport)} ${esc(sportById(v.sport).name)} · ${esc(v.league)}</span>
          <span>${esc(typeLabel(v.type))} · ${v.live ? 'Live' : fmtDur(v.duration)}</span>
          <span>From ${esc(a.assignedBy)}</span>
        </div>
        <div class="row" style="margin-top:8px;gap:10px">
          <div class="progress thin" style="flex:1;max-width:220px" title="${Math.round(p * 100)}% watched"><span class="${p >= 1 ? 'p-done' : 'p-prog'}" style="width:${p * 100}%"></span></div>
          <span class="tiny muted num">${v.live ? 'Live' : Math.round(p * 100) + '%'} · ${esc(sumState)} · ${notes} note${notes === 1 ? '' : 's'} · ${(v.speakers || []).length} speakers</span>
        </div>
        <div class="asg-actions">
          ${primaryCTA(a)}
          ${!isDone(a) && a.status !== 'BLOCKED' ? `<button class="btn sm" data-act="asg-complete" data-a="${a.id}" title="Mark complete">${ic('check')} Complete</button>` : ''}
          ${!isDone(a) ? `<button class="btn sm" data-act="asg-snooze" data-a="${a.id}">${ic('clock')} Snooze</button><button class="btn sm" data-act="asg-remind" data-a="${a.id}">${ic('bell')} Remind</button>` : ''}
          <button class="btn sm ghost" data-act="ask-video" data-v="${v.id}">${ic('sparkle')} Ask AI</button>
          <button class="btn sm ghost" data-act="asg-more" data-a="${a.id}" aria-label="More actions">•••</button>
        </div>
        ${a.status === 'BLOCKED' ? `<div class="tiny" style="color:var(--red);margin-top:6px">${esc(a.blockedReason)} — transcript and summaries remain available.</div>` : ''}
      </div>
    </article>`;
  }
  function asgRow(a) {
    const v = video(a.videoId);
    return `<div class="asg-compact">
      ${prio(a.priority)}
      <span class="t" data-act="open" data-v="${v.id}" title="${esc(v.title)}">${esc(v.title)}</span>
      <span class="tiny muted num">${v.live ? 'Live' : fmtMins(Desk.remainingSec(a)) + ' left'}</span>
      ${dueBadge(a)} ${statusBadge(a)} ${primaryCTA(a, true)}
    </div>`;
  }
  function vcard(v, why) {
    const p = progressOf(v.id);
    const a = asgForVideo(v.id);
    return `<article class="card vcard" data-act="open" data-v="${v.id}" tabindex="0" aria-label="${esc(v.title)}">
      ${thumb(v, { progress: p > 0 && p < 1 ? p : 0 })}
      <div class="vc-body">
        <div class="vc-title">${esc(v.title)}</div>
        <div class="tiny muted">${esc(v.league)} · ${esc(typeLabel(v.type))} · ${esc(v.network)} · ${fmtAgo(v.publishedAt)}</div>
        <div class="row wrap" style="gap:4px;margin-top:2px">${a ? `${statusBadge(a)}` : ''}${v.transcriptStatus === 'processing' ? '<span class="badge b-gray">Transcript processing</span>' : ''}${v.rights !== 'PLAYABLE' ? `<span class="badge b-red">${esc(typeLabel(v.rights))}</span>` : ''}</div>
        ${why ? `<div class="tiny muted" style="margin-top:2px">${esc(why)}</div>` : ''}
      </div></article>`;
  }
  function vrow(v, extra) {
    return `<div class="vrow" data-act="open" data-v="${v.id}">${thumb(v, { sm: true, progress: progressOf(v.id) })}<div style="min-width:0;flex:1"><div class="t">${esc(v.title)}</div><div class="tiny muted">${esc(v.league)} · ${esc(typeLabel(v.type))} · ${fmtAgo(v.publishedAt)}</div>${extra || ''}</div></div>`;
  }
  const empty = (t, s) => `<div class="empty"><strong>${esc(t)}</strong>${esc(s || '')}</div>`;
  const secHead = (title, right) => `<div class="sec-head"><h2>${title}</h2><div class="meta">${right || ''}</div></div>`;

  // ---------- Right rail ----------
  function rail() {
    const S = Desk.S;
    const A = S.assignments;
    const today = sortByDue(A.filter((a) => isDueToday(a) || isOverdue(a)));
    const alerts = smartReminders();
    const upcoming = [];
    A.filter((a) => !isDone(a)).forEach((a) => (a.reminders || []).forEach((r) => { if (!r.sent && r.at > Date.now()) upcoming.push({ a, r }); }));
    upcoming.sort((x, y) => x.r.at - y.r.at);
    const aiRecent = [];
    Object.entries(S.summaries).forEach(([vid, modes]) => Object.entries(modes).forEach(([m, meta]) => aiRecent.push({ vid, m, meta })));
    aiRecent.sort((a, b) => b.meta.generatedAt - a.meta.generatedAt);
    return `
      <div class="rail-block"><h3>Due today <span class="badge ${today.some(isOverdue) ? 'b-red' : 'b-amber'}">${today.length}</span></h3>
        ${today.length ? today.map((a) => { const v = video(a.videoId); return `<div class="rail-item" data-act="open" data-v="${v.id}"><div class="row" style="gap:6px;margin-bottom:3px">${prio(a.priority)} ${dueBadge(a)}</div><div class="t">${esc(v.title)}</div><div class="tiny muted">${v.live ? 'Live now' : fmtMins(Desk.remainingSec(a)) + ' remaining'} · ${STATUS[a.status][0]}</div></div>`; }).join('') : '<div class="small muted">Nothing due today.</div>'}
      </div>
      <div class="rail-block"><h3>Alerts</h3>
        ${alerts.length ? alerts.map((al) => `<div class="alert-item"><span class="ic" style="background:${al.bg};color:${al.fg}">${al.icon}</span><div>${al.html}</div></div>`).join('') : '<div class="small muted">All clear.</div>'}
      </div>
      <div class="rail-block"><h3>Reminders <button class="link-btn" data-act="go" data-h="#/assignments">Manage</button></h3>
        ${upcoming.slice(0, 4).map(({ a, r }) => `<div class="rail-item" data-act="open" data-v="${a.videoId}"><div class="tiny muted">${ic('bell').replace('<svg', '<svg style="width:11px;height:11px;vertical-align:-1px"')} ${esc(fmtWhen(r.at))} · ${esc(r.label)}</div><div class="t">${esc(Desk.shortTitle(video(a.videoId)))}</div></div>`).join('') || '<div class="small muted">No upcoming reminders.</div>'}
      </div>
      <div class="rail-block"><h3>AI notes</h3>
        ${aiRecent.slice(0, 3).map((x) => `<div class="rail-item" data-act="asg-review-v" data-v="${x.vid}" data-m="${x.m}"><div class="row" style="gap:6px"><span class="trust ai">AI summary</span><span class="tiny muted">${fmtAgo(x.meta.generatedAt)}</span></div><div class="t" style="margin-top:3px">${esc(Desk.shortTitle(video(x.vid)))}</div><div class="tiny muted">${esc((Desk.MODES.find((m) => m[0] === x.m) || [0, x.m])[1])} · ${x.meta.reviewed ? 'Reviewed' : 'Awaiting review'}</div></div>`).join('') || '<div class="small muted">No summaries yet.</div>'}
      </div>
      <div class="rail-block"><h3>Saved <button class="link-btn" data-act="go" data-h="#/saved">All</button></h3>
        ${S.saved.slice(0, 3).map((id) => video(id)).filter(Boolean).map((v) => vrow(v)).join('') || '<div class="small muted">Nothing saved.</div>'}
      </div>`;
  }
  // PRD §13.4 smart reminders
  function smartReminders() {
    const S = Desk.S;
    const out = [];
    const od = S.assignments.filter(isOverdue);
    if (od.length) out.push({ icon: '!', bg: 'var(--red-soft)', fg: 'var(--red)', html: `<b>${od.length} overdue</b> — ${od.map((a) => esc(Desk.shortTitle(video(a.videoId)))).join(', ')}` });
    const soon = S.assignments.filter((a) => !isDone(a) && !isOverdue(a) && a.dueAt - Date.now() < 6 * H && !video(a.videoId).live);
    if (soon.length) {
      const mins = soon.reduce((t, a) => t + Desk.remainingSec(a), 0);
      const hrs = Math.max(1, Math.round((Math.min(...soon.map((a) => a.dueAt)) - Date.now()) / H));
      out.push({ icon: '⏱', bg: 'var(--amber-soft)', fg: 'var(--amber)', html: `You have <b>${fmtMins(mins)}</b> of video left across ${soon.length} assignment${soon.length > 1 ? 's' : ''}; the next is due in ${hrs}h.` });
    }
    const ns = S.assignments.filter((a) => ['ASSIGNED', 'QUEUED'].includes(a.status));
    if (ns.length >= 2) out.push({ icon: '▶', bg: 'var(--blue-soft)', fg: 'var(--blue)', html: `<b>${ns.length} assigned videos</b> have not been started.` });
    const rev = S.assignments.filter((a) => a.status === 'SUMMARIZED' || (a.status === 'WATCHED' && a.summaryRequired));
    rev.forEach((a) => out.push({ icon: '✎', bg: 'var(--violet-soft)', fg: 'var(--violet)', html: `You watched <b>${esc(Desk.shortTitle(video(a.videoId)))}</b> but the required summary ${a.status === 'WATCHED' ? 'has not been generated' : 'has not been reviewed'}.` }));
    return out;
  }

  // ---------- Home ----------
  function home() {
    const S = Desk.S;
    const st = weekStats();
    const pct = (n) => (st.total ? (n / st.total) * 100 : 0);
    const next = sortByDue(S.assignments.filter((a) => !isDone(a))).slice(0, 5);
    const cont = S.videos.filter((v) => { const p = progressOf(v.id); return !v.live && p > 0.02 && p < 0.98; }).sort((a, b) => progressOf(b.id) - progressOf(a.id));
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const sections = Desk.brief();
    const recs = recommended();
    return {
      rail: true,
      html: `
      <div class="page-head"><div><h1>${greet}</h1><div class="sub">${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · ${st.total - st.done} assignments open · last refresh ${fmtAgo(S.lastRefresh)}</div></div>
        <div class="row"><button class="btn" data-act="palette-open">${ic('search')} Find anything <span class="kbd">⌘K</span></button></div></div>

      <section class="section card" aria-labelledby="wk">
        <div class="card-pad">
          <div class="sec-head" style="margin-bottom:8px"><h2 id="wk">This week</h2><div class="meta num"><b style="color:var(--text);font-size:14px">${st.done} / ${st.total}</b> complete</div></div>
          <div class="progress" role="img" aria-label="${st.done} of ${st.total} complete"><span class="p-done" style="width:${pct(st.done)}%"></span><span class="p-prog" style="width:${pct(st.inProgress)}%"></span><span class="p-red" style="width:${pct(st.overdue)}%"></span></div>
        </div>
        <div class="stats">
          <button class="stat" data-act="asg-jump" data-f="all"><div class="v">${st.total}</div><div class="l">Assigned</div></button>
          <button class="stat" data-act="asg-jump" data-f="done"><div class="v" style="color:var(--green)">${st.done}</div><div class="l"><i style="background:var(--green)"></i>Completed</div></button>
          <button class="stat" data-act="asg-jump" data-f="progress"><div class="v" style="color:var(--amber)">${st.inProgress}</div><div class="l"><i style="background:var(--amber)"></i>In progress</div></button>
          <button class="stat" data-act="asg-jump" data-f="today"><div class="v">${st.dueToday}</div><div class="l">Due today</div></button>
          <button class="stat" data-act="asg-jump" data-f="overdue"><div class="v" style="color:${st.overdue ? 'var(--red)' : 'inherit'}">${st.overdue}</div><div class="l"><i style="background:var(--red)"></i>Overdue</div></button>
        </div>
      </section>

      <section class="section">${secHead('Due next', `<button class="link-btn" data-act="go" data-h="#/assignments">All assignments →</button>`)}
        <div class="card">${next.map(asgRow).join('') || empty('You are all caught up', 'No open assignments.')}</div>
      </section>

      <section class="section">${secHead('New since last refresh', `Refreshed ${fmtTime(S.lastRefresh)} · <button class="link-btn" data-act="refresh">Refresh now</button>`)}
        <div class="changes">${S.changes.map((c) => `<div class="change ${c.n && c.fresh ? 'new' : ''}"><b>${c.n ? '+' + c.n : '0'}</b> ${esc(c.label)}</div>`).join('')}</div>
      </section>

      <section class="section card">
        <div class="card-pad" style="padding-bottom:0">${secHead(`Daily ESPN brief <span class="trust ai">AI summary</span>`, `Generated ${fmtTime(S.briefAt)} from approved feeds · every video claim cited`)}</div>
        <div class="brief">${sections.map((s) => `<h3>${esc(s.h)}</h3><ul>${s.items.map((i) => `<li>${i}</li>`).join('')}</ul>`).join('')}</div>
        <div class="ai-meta" style="margin:10px 16px 14px">Model ${Desk.MODEL} · template brief@2.1 · ${sections.reduce((n, s) => n + s.items.length, 0)} items · unchanged stories suppressed</div>
      </section>

      <section class="section">${secHead('Continue watching')}
        ${cont.length ? `<div class="grid-3">${cont.map((v) => vcard(v, `${fmtDur(Desk.watchPos(v.id))} of ${fmtDur(v.duration)}${asgForVideo(v.id) ? ' · due ' + fmtWhen(asgForVideo(v.id).dueAt) : ''}`)).join('')}</div>` : empty('Nothing in progress')}
      </section>

      <section class="section">${secHead('Relevant to you', 'Ranked by assignment relevance, followed teams and recency — not watch time')}
        <div class="grid-3">${recs.map((r) => vcard(r.v, r.why)).join('')}</div>
      </section>
      <div class="demo-note">Demo data — leagues and teams are real; all people, quotes, and transcripts are fictional.</div>`,
    };
  }
  // PRD §33 — secondary to assignments; never optimize for watch time.
  function recommended() {
    const S = Desk.S;
    return S.videos.filter((v) => !asgForVideo(v.id) || !isDone(asgForVideo(v.id))).map((v) => {
      let s = 0; const why = [];
      const a = asgForVideo(v.id);
      if (a) { s += 3; why.push('Assigned'); }
      const team = v.teams.find((t) => S.settings.followedTeams.includes(t));
      if (team) { s += 2; why.push('You follow ' + team); }
      const ath = v.players.find((p) => S.settings.followedAthletes.includes(p));
      if (ath) { s += 1.5; why.push('Mentions ' + ath); }
      if (S.settings.favSports.includes(v.sport)) s += 1;
      s += Math.max(0, 1 - (Date.now() - v.publishedAt) / (72 * H));
      if (progressOf(v.id) >= 0.98) s -= 3;
      return { v, s, why: why.length ? 'Why: ' + why.join(' · ') : 'Why: recent in ' + sportById(v.sport).name };
    }).sort((a, b) => b.s - a.s).slice(0, 6);
  }

  // ---------- Assignments ----------
  function asgFiltered() {
    const f = U.asgFilter;
    let A = Desk.S.assignments;
    if (f === 'today') A = A.filter((a) => isDueToday(a) || isOverdue(a));
    if (f === 'overdue') A = A.filter(isOverdue);
    if (f === 'done') A = A.filter(isDone);
    if (f === 'progress') A = A.filter((a) => ['IN_PROGRESS', 'WATCHED', 'SUMMARIZED', 'REVIEWED'].includes(a.status));
    if (f === 'open') A = A.filter((a) => !isDone(a));
    if (f.startsWith('sport:')) A = A.filter((a) => video(a.videoId).sport === f.slice(6));
    if (f.startsWith('league:')) A = A.filter((a) => video(a.videoId).league === f.slice(7));
    return sortByDue(A);
  }
  const KCOLS = [
    ['Inbox', ['ASSIGNED', 'QUEUED', 'BLOCKED'], 'ASSIGNED'], ['In progress', ['IN_PROGRESS'], 'IN_PROGRESS'],
    ['Watched', ['WATCHED'], 'WATCHED'], ['Needs notes / review', ['SUMMARIZED', 'REVIEWED'], 'SUMMARIZED'], ['Complete', ['COMPLETE', 'SKIPPED'], 'COMPLETE'],
  ];
  function assignments() {
    const A = asgFiltered();
    const st = weekStats();
    const filters = [['all', 'All', st.total], ['open', 'Open', st.total - st.done], ['today', 'Due today', st.dueToday + st.overdue], ['overdue', 'Overdue', st.overdue], ['progress', 'In progress', null], ['done', 'Completed', st.done]];
    const views = [['list', 'List'], ['cards', 'Cards'], ['kanban', 'Kanban'], ['calendar', 'Calendar'], ['sport', 'Sport'], ['priority', 'Priority']];
    let body = '';
    if (!A.length) body = empty('No assignments match this filter');
    else if (U.asgView === 'list') {
      body = `<div class="table-wrap"><table class="table"><thead><tr><th>Pri</th><th>Title</th><th>Sport</th><th>Type</th><th>Due</th><th>Status</th><th>Progress</th><th>Summary</th><th></th></tr></thead><tbody>
        ${A.map((a) => { const v = video(a.videoId); const p = progressOf(v.id); return `<tr>
          <td>${prio(a.priority)}</td>
          <td class="title-cell" data-act="open" data-v="${v.id}">${esc(v.title)}<div class="tiny muted" style="font-weight:400">From ${esc(a.assignedBy)} · ${fmtAgo(a.assignedAt)}</div></td>
          <td class="small">${glyph(v.sport)} ${esc(v.league)}</td>
          <td class="small">${esc(typeLabel(v.type))}<div class="tiny muted">${v.live ? 'Live' : fmtDur(v.duration)}</div></td>
          <td>${dueBadge(a)}</td><td>${statusBadge(a)}</td>
          <td style="min-width:110px"><div class="progress thin"><span class="${p >= 1 ? 'p-done' : 'p-prog'}" style="width:${p * 100}%"></span></div><div class="tiny muted num">${v.live ? 'Live' : Math.round(p * 100) + '%'}</div></td>
          <td class="small">${hasSummary(v.id) ? '<span class="badge b-violet nodot">Ready</span>' : a.summaryRequired ? '<span class="tiny muted">Required</span>' : '<span class="tiny muted">—</span>'}</td>
          <td><div class="row" style="justify-content:flex-end">${primaryCTA(a, true)}<button class="btn sm ghost" data-act="asg-more" data-a="${a.id}" aria-label="More">•••</button></div></td></tr>`; }).join('')}
        </tbody></table></div>`;
    } else if (U.asgView === 'cards') {
      body = `<div class="grid-2">${A.map(asgCard).join('')}</div>`;
    } else if (U.asgView === 'kanban') {
      body = `<div class="kanban" style="grid-template-columns:repeat(5,minmax(210px,1fr))">${KCOLS.map(([name, sts, target]) => {
        const items = A.filter((a) => sts.includes(a.status));
        return `<div class="kcol" data-drop="${target}"><h3><span>${name}</span><span>${items.length}</span></h3>
          ${items.map((a) => { const v = video(a.videoId); return `<div class="kcard ${isOverdue(a) ? 'overdue' : ''}" draggable="true" data-drag="${a.id}"><div class="row wrap" style="gap:5px">${prio(a.priority)} ${dueBadge(a)}</div><div class="t">${esc(v.title)}</div><div class="row tiny muted" style="justify-content:space-between"><span>${glyph(v.sport)} ${esc(v.league)}</span><button class="btn sm ghost" data-act="open" data-v="${v.id}">${ic('play')}</button></div></div>`; }).join('')}
        </div>`;
      }).join('')}</div><div class="tiny muted" style="margin-top:6px">Drag cards between columns to change status.</div>`;
    } else if (U.asgView === 'calendar') {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 2);
      body = `<div class="cal">${Array.from({ length: 7 }, (_, i) => {
        const d0 = new Date(start); d0.setDate(start.getDate() + i);
        const d1 = new Date(d0); d1.setDate(d0.getDate() + 1);
        const items = A.filter((a) => a.dueAt >= d0 && a.dueAt < d1);
        const isToday = dayDiff(d0.getTime()) === 0;
        return `<div class="cal-day ${isToday ? 'today' : ''}"><h4><span>${d0.toLocaleDateString([], { weekday: 'short' })}</span><span>${d0.getDate()}</span></h4>
          ${items.map((a) => { const v = video(a.videoId); const col = isOverdue(a) ? 'var(--red)' : isDone(a) ? 'var(--green)' : a.priority === 'P0' ? 'var(--text)' : 'var(--amber)'; return `<div class="cal-item" style="border-left-color:${col}" data-act="open" data-v="${v.id}"><b>${fmtTime(a.dueAt)}</b> ${esc(Desk.shortTitle(v))}<div class="tiny muted">${STATUS[a.status][0]}</div></div>`; }).join('')}</div>`;
      }).join('')}</div>`;
    } else {
      const groups = {};
      A.forEach((a) => {
        const key = U.asgView === 'sport' ? sportById(video(a.videoId).sport).name : { P0: 'P0 · Must watch', P1: 'P1 · High', P2: 'P2 · Normal', P3: 'P3 · Optional' }[a.priority];
        (groups[key] = groups[key] || []).push(a);
      });
      body = Object.keys(groups).sort().map((k) => `<div class="section">${secHead(esc(k), groups[k].length + ' items')}<div class="card">${groups[k].map(asgRow).join('')}</div></div>`).join('');
    }
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>Assignments</h1><div class="sub">Week of ${new Date(Date.now() - new Date().getDay() * 864e5).toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${st.done}/${st.total} complete · ${fmtMins(Desk.S.assignments.filter((a) => !isDone(a) && !video(a.videoId).live).reduce((t, a) => t + Desk.remainingSec(a), 0))} of video remaining</div></div>
          <div class="seg" role="group" aria-label="View">${views.map(([k, l]) => `<button data-act="asg-view" data-view="${k}" aria-pressed="${U.asgView === k}">${l}</button>`).join('')}</div></div>
        <div class="filters" role="group" aria-label="Filter">${filters.map(([k, l, n]) => `<button class="btn sm ${U.asgFilter === k ? 'primary' : ''}" data-act="asg-filter" data-f="${k}">${l}${n != null ? ` <span class="num" style="opacity:.7">${n}</span>` : ''}</button>`).join('')}
          ${U.asgFilter.includes(':') ? `<span class="pill">${esc(U.asgFilter)} <button class="link-btn" data-act="asg-filter" data-f="all">✕</button></span>` : ''}</div>
        ${body}`,
    };
  }

  // ---------- Live ----------
  function liveCardBig(e) {
    const st = { LIVE: ['Live', 'b-red'], HALFTIME: ['Intermission', 'b-amber'], PRE_GAME: ['Upcoming', 'b-gray'], FINAL: ['Final', 'b-gray'], DELAYED: ['Delayed', 'b-amber'], SUSPENDED: ['Suspended', 'b-amber'] }[e.status] || [e.status, 'b-gray'];
    const hide = Desk.S.settings.hideScores;
    const line = (t) => t ? `<div class="row" style="justify-content:space-between;font-size:16px"><span>${esc(t.name)}</span><b class="num" data-score="${e.id}-${t.abbr}">${hide || t.score == null ? '–' : t.score}</b></div>` : '';
    return `<div class="card card-pad">
      <div class="row" style="gap:6px;margin-bottom:8px">${glyph(e.sport)} <span class="small strong">${esc(e.league)}</span><span class="spacer"></span><span class="badge ${st[1]}">${st[0]}</span></div>
      ${line(e.away)}${line(e.home)}
      <div class="row small muted" style="margin-top:6px"><span class="num" data-clockbig="${e.id}">${esc(Desk.liveStatusText(e))}</span><span class="spacer"></span>${esc(e.network)}</div>
      <div class="row" style="margin-top:10px">${e.status === 'PRE_GAME' ? `<button class="btn sm" data-act="live-remind" data-e="${e.id}">${ic('bell')} Remind me</button>` : `<button class="btn sm red" data-act="live-watch" data-e="${e.id}">${ic('play')} ${e.replay ? 'Watch replay' : 'Watch'}</button>`}
        ${e.assigned ? '<span class="badge b-dark nodot">Assigned</span>' : ''}</div></div>`;
  }
  function live() {
    const L = Desk.S.live;
    const groups = [['Live now', L.filter((e) => ['LIVE', 'HALFTIME', 'DELAYED', 'SUSPENDED'].includes(e.status))], ['Upcoming', L.filter((e) => e.status === 'PRE_GAME')], ['Final · replay available', L.filter((e) => e.status === 'FINAL')]];
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>Live</h1><div class="sub">Scores and status from the approved real-time feed · updated <span data-live-ago>${fmtAgo(Desk.S.liveUpdatedAt)}</span></div></div></div>
        ${groups.map(([h, arr]) => `<section class="section">${secHead(h, arr.length + ' events')}${arr.length ? `<div class="grid-3">${arr.map(liveCardBig).join('')}</div>` : empty('Nothing here right now')}</section>`).join('')}
        <section class="section">${secHead('Schedule · next 24 hours', 'Listings cover roughly two weeks ahead on ESPN Watch')}
          <div class="card">${[['7:30 PM', 'NCAA Football', 'Clemson at Florida State', 'ESPN'], ['8:00 PM', 'MLB', 'Mets at Braves', 'ESPN2'], ['9:00 PM', 'Professional Fighters League', 'PFL Playoffs: Main Card', 'ESPN2'], ['Sun 10:00 AM', 'LALIGA', 'Atlético Madrid vs Real Betis', 'ESPN+'], ['Sun 1:00 PM', 'NFL', 'NFL Countdown', 'ESPN'], ['Sun 3:00 PM', 'WNBA', 'Semifinals Game 4 (if necessary)', 'ESPN']].map((r) => `<div class="asg-compact"><span class="num small strong" style="width:92px">${r[0]}</span><span class="pill league">${r[1]}</span><span class="t" style="cursor:default">${r[2]}</span><span class="small muted">${r[3]}</span></div>`).join('')}</div>
        </section>`,
    };
  }

  // ---------- Queue ----------
  function queue() {
    const S = Desk.S;
    const q = S.queue.map(video).filter(Boolean);
    const openAsg = sortByDue(S.assignments.filter((a) => !isDone(a) && !S.queue.includes(a.videoId)));
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>My queue</h1><div class="sub">Your personal watch order. Assignments not yet queued are listed below.</div></div></div>
        <section class="section">${secHead('Up next', q.length + ' videos')}
          <div class="card">${q.length ? q.map((v, i) => `<div class="asg-compact"><span class="num strong muted" style="width:18px">${i + 1}</span>${thumb(v, { sm: true, progress: progressOf(v.id) })}<span class="t" data-act="open" data-v="${v.id}">${esc(v.title)}<div class="tiny muted" style="font-weight:400">${esc(v.league)} · ${v.live ? 'Live' : fmtDur(v.duration)}${asgForVideo(v.id) ? ' · ' + STATUS[asgForVideo(v.id).status][0] : ''}</div></span>
            <button class="btn sm ghost" data-act="queue-move" data-v="${v.id}" data-d="-1" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="btn sm ghost" data-act="queue-move" data-v="${v.id}" data-d="1" aria-label="Move down" ${i === q.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn sm red" data-act="open" data-v="${v.id}">${ic('play')} Play</button><button class="btn sm ghost" data-act="queue-remove" data-v="${v.id}" aria-label="Remove">${ic('x')}</button></div>`).join('') : empty('Queue is empty', 'Add videos with “Add to queue” from any video menu or the command palette.')}</div>
        </section>
        <section class="section">${secHead('Open assignments not in queue')}
          <div class="card">${openAsg.map((a) => `<div class="asg-compact">${prio(a.priority)}<span class="t" data-act="open" data-v="${a.videoId}">${esc(video(a.videoId).title)}</span>${dueBadge(a)}<button class="btn sm" data-act="queue-add" data-v="${a.videoId}">${ic('plus')} Queue</button></div>`).join('') || '<div class="card-pad muted small">All open assignments are queued.</div>'}</div>
        </section>`,
    };
  }

  // ---------- Library (PRD §21) ----------
  function parseQuery(q) {
    const f = {}; let rest = q;
    rest = rest.replace(/(\w+):("([^"]*)"|(\S+))/g, (m, k, _v, quoted, bare) => { f[k.toLowerCase()] = (quoted != null ? quoted : bare).toLowerCase(); return ' '; });
    return { f, text: rest.trim().toLowerCase() };
  }
  function libResults() {
    const S = Desk.S;
    const L = U.lib;
    const { f, text } = parseQuery(L.q);
    let vids = S.videos.slice();
    const has = (arr, s) => (arr || []).some((x) => x.toLowerCase().includes(s));
    if (f.sport) vids = vids.filter((v) => v.sport.includes(f.sport) || sportById(v.sport).name.toLowerCase().includes(f.sport) || v.league.toLowerCase() === f.sport);
    if (f.league) vids = vids.filter((v) => v.league.toLowerCase().includes(f.league));
    if (f.team) vids = vids.filter((v) => has(v.teams, f.team));
    if (f.player) vids = vids.filter((v) => has(v.players, f.player) || transcript(v.id).some((s) => s.text.toLowerCase().includes(f.player)));
    if (f.speaker) vids = vids.filter((v) => (v.speakers || []).some((s) => s.name.toLowerCase().includes(f.speaker)));
    if (f.type) vids = vids.filter((v) => v.type.toLowerCase().replace(/_/g, ' ').includes(f.type.replace(/_/g, ' ')) || (f.type === 'interview' && v.type === 'PRESS_CONFERENCE'));
    if (f.tag) vids = vids.filter((v) => has(v.tags, f.tag));
    if (f.network) vids = vids.filter((v) => v.network.toLowerCase().includes(f.network));
    if (f.assigned) vids = vids.filter((v) => !!asgForVideo(v.id) === (f.assigned === 'true'));
    if (f.watched) vids = vids.filter((v) => (progressOf(v.id) >= 0.98) === (f.watched === 'true'));
    if (f.saved) vids = vids.filter((v) => S.saved.includes(v.id) === (f.saved === 'true'));
    if (f.after) { const t = Date.parse(f.after); if (!isNaN(t)) vids = vids.filter((v) => v.publishedAt >= t); }
    if (f.before) { const t = Date.parse(f.before); if (!isNaN(t)) vids = vids.filter((v) => v.publishedAt <= t); }
    if (L.sport !== 'all') vids = vids.filter((v) => v.sport === L.sport);
    if (L.type !== 'all') vids = vids.filter((v) => v.type === L.type);
    if (L.status === 'assigned') vids = vids.filter((v) => asgForVideo(v.id));
    if (L.status === 'unwatched') vids = vids.filter((v) => progressOf(v.id) < 0.98);
    if (L.status === 'summary') vids = vids.filter((v) => hasSummary(v.id));
    if (L.status === 'notes') vids = vids.filter((v) => S.notes.some((n) => n.videoId === v.id));
    if (L.status === 'saved') vids = vids.filter((v) => S.saved.includes(v.id));

    const hits = {};
    if (text) {
      const words = text.split(/\s+/).filter(Boolean);
      vids = vids.filter((v) => {
        const meta = [v.title, v.league, v.program, v.network, sportById(v.sport).name, ...v.teams, ...v.players, ...(v.tags || []), ...(v.speakers || []).map((s) => s.name)].join(' ').toLowerCase();
        const segHits = transcript(v.id).filter((s) => !(v.live && s.t > S.livePos) && words.every((w) => (s.text + ' ' + (s.topic || '')).toLowerCase().includes(w)));
        const noteHit = S.notes.some((n) => n.videoId === v.id && words.every((w) => n.text.toLowerCase().includes(w)));
        if (segHits.length) hits[v.id] = segHits.slice(0, 2);
        return words.every((w) => meta.includes(w)) || segHits.length || noteHit;
      });
    }
    const sorters = {
      newest: (a, b) => b.publishedAt - a.publishedAt, oldest: (a, b) => a.publishedAt - b.publishedAt,
      longest: (a, b) => b.duration - a.duration, shortest: (a, b) => a.duration - b.duration,
      due: (a, b) => ((asgForVideo(a.id) || { dueAt: 9e15 }).dueAt - (asgForVideo(b.id) || { dueAt: 9e15 }).dueAt),
      relevant: (a, b) => (hits[b.id] ? hits[b.id].length : 0) - (hits[a.id] ? hits[a.id].length : 0) || b.publishedAt - a.publishedAt,
      recent: (a, b) => { const la = S.history.find((h) => h.videoId === a.id), lb = S.history.find((h) => h.videoId === b.id); return (lb ? lb.at : 0) - (la ? la.at : 0); },
    };
    vids.sort(sorters[L.sort] || sorters.newest);
    return { vids, hits, words: text ? text.split(/\s+/) : [] };
  }
  function highlight(s, words) {
    let out = esc(s);
    words.filter((w) => w.length > 1).forEach((w) => { out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  }
  function libResultsHTML() {
    const { vids, hits, words } = libResults();
    if (!vids.length) return empty('No videos match', 'Try removing a filter, or ask the AI in Chat.');
    return `<div class="small muted" style="margin-bottom:8px">${vids.length} video${vids.length > 1 ? 's' : ''}</div><div class="card" style="padding:4px">${vids.map((v) => {
      const a = asgForVideo(v.id);
      const hs = (hits[v.id] || []).map((s) => `<div class="hit" data-act="seek" data-v="${v.id}" data-t="${s.t}"><span class="mono" style="color:var(--blue)">${fmtDur(s.t)}</span> <b>${esc(speaker(v, s.spk).name)}:</b> ${highlight(s.text, words)}</div>`).join('');
      return vrow(v, `<div class="row wrap" style="gap:4px;margin-top:4px">${glyph(v.sport)}<span class="pill league">${esc(v.league)}</span>${a ? statusBadge(a) + dueBadge(a) : ''}${hasSummary(v.id) ? '<span class="badge b-violet nodot">Summary</span>' : ''}${v.transcriptStatus !== 'ready' && v.transcriptStatus !== 'streaming' ? '<span class="badge b-gray nodot">Transcript processing</span>' : ''}${(v.tags || []).slice(0, 3).map((t) => `<span class="pill tag">${esc(t)}</span>`).join('')}</div>${hs}`);
    }).join('')}</div>`;
  }
  function library() {
    const L = U.lib;
    const sports = [...new Set(Desk.S.videos.map((v) => v.sport))];
    const types = [...new Set(Desk.S.videos.map((v) => v.type))];
    const ex = ['sport:basketball', 'type:interview', 'team:"Buffalo Bills"', 'speaker:"Marcus Webb"', 'assigned:true', 'watched:false', 'tag:injury', 'rebound'];
    return {
      rail: false,
      html: `<div class="page-head"><div><h1>Library</h1><div class="sub">Searchable archive — titles, metadata, transcripts and notes</div></div></div>
        <div class="filters">
          <div class="searchbar" style="background:var(--surface);border-color:var(--line-strong);color:var(--muted);max-width:none;flex:1;min-width:240px;margin:0">${ic('search')}<input data-inp="lib-q" value="${esc(L.q)}" placeholder='Search… e.g. team:"New York Liberty" rebound' style="color:var(--text)" aria-label="Search library"></div>
          <select class="select" data-inp="lib-sport" aria-label="Sport"><option value="all">All sports</option>${sports.map((s) => `<option value="${s}" ${L.sport === s ? 'selected' : ''}>${esc(sportById(s).name)}</option>`).join('')}</select>
          <select class="select" data-inp="lib-type" aria-label="Content type"><option value="all">All types</option>${types.map((t) => `<option value="${t}" ${L.type === t ? 'selected' : ''}>${esc(typeLabel(t))}</option>`).join('')}</select>
          <select class="select" data-inp="lib-status" aria-label="Status">${[['all', 'Any status'], ['assigned', 'Assigned'], ['unwatched', 'Not watched'], ['summary', 'Has summary'], ['notes', 'Has notes'], ['saved', 'Saved']].map(([k, l]) => `<option value="${k}" ${L.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <select class="select" data-inp="lib-sort" aria-label="Sort">${[['newest', 'Newest'], ['oldest', 'Oldest'], ['relevant', 'Most relevant'], ['due', 'Due soon'], ['longest', 'Longest'], ['shortest', 'Shortest'], ['recent', 'Recently watched']].map(([k, l]) => `<option value="${k}" ${L.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div class="help-syntax">Power filters: ${ex.map((e) => `<code data-act="lib-quick" data-q="${esc(e)}">${esc(e)}</code>`).join(' ')} · also <code>league:</code> <code>player:</code> <code>after:2026-09-20</code> <code>before:</code> <code>saved:</code></div>
        <div id="lib-results">${libResultsHTML()}</div>`,
    };
  }

  // ---------- Commentary explorer (PRD §31) ----------
  function commRows() {
    const C = U.comm;
    let rows = Desk.commentaryRecords();
    if (C.role === 'broadcast') rows = rows.filter((r) => D.BROADCAST_ROLES.includes(r.spk.role));
    else if (C.role === 'interview') rows = rows.filter((r) => D.INTERVIEWEE_ROLES.includes(r.spk.role));
    else if (C.role !== 'all') rows = rows.filter((r) => r.spk.role === C.role);
    if (C.sport !== 'all') rows = rows.filter((r) => r.v.sport === C.sport);
    if (C.topic !== 'all') rows = rows.filter((r) => r.s.topic === C.topic);
    if (C.q) { const q = C.q.toLowerCase(); rows = rows.filter((r) => (r.s.text + r.s.sum + r.spk.name + r.v.title + r.v.teams.join(' ')).toLowerCase().includes(q)); }
    return rows;
  }
  function commTableHTML() {
    const rows = commRows();
    if (!rows.length) return empty('No statements match');
    return `<div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Speaker</th><th>Topic</th><th>Statement <span class="trust ai" style="margin-left:4px">AI paraphrase</span></th><th>Source</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${cite(r.v.id, r.s.t)}</td><td class="small">${spkName(r.v, r.s.spk)}<div>${roleTag(r.spk.role)}</div></td><td><span class="pill tag">${esc(r.s.topic || '—')}</span></td>
        <td class="small">${esc(r.s.sum)}<details><summary class="tiny muted" style="cursor:pointer">Transcript excerpt</summary><div class="tiny" style="margin-top:4px"><span class="trust source">Source transcript</span> “${esc(r.s.text)}”</div></details></td>
        <td class="small"><a href="#/video/${r.v.id}?t=${r.s.t}">${esc(Desk.shortTitle(r.v))}</a><div class="tiny muted">${esc(r.v.league)} · ${fmtAgo(r.v.publishedAt)}</div></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function commentary() {
    const C = U.comm;
    const recs = Desk.commentaryRecords();
    const topics = [...new Set(recs.map((r) => r.s.topic).filter(Boolean))].sort();
    const sports = [...new Set(recs.map((r) => r.v.sport))];
    const roles = [['all', 'All speakers'], ['broadcast', 'All broadcasters'], ['interview', 'All interviewees'], ...Object.entries(Desk.ROLE_LABEL).filter(([k]) => recs.some((r) => r.spk.role === k))];
    return {
      rail: false,
      html: `<div class="page-head"><div><h1>What did they say?</h1><div class="sub">Every extracted claim, opinion and quote — attributed to a speaker and timestamp</div></div></div>
        <div class="filters">
          <input class="input" data-inp="comm-q" value="${esc(C.q)}" placeholder="Filter by keyword, speaker, team…" style="min-width:240px;flex:1" aria-label="Filter statements">
          <select class="select" data-inp="comm-role" aria-label="Speaker role">${roles.map(([k, l]) => `<option value="${k}" ${C.role === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
          <select class="select" data-inp="comm-sport" aria-label="Sport"><option value="all">All sports</option>${sports.map((s) => `<option value="${s}" ${C.sport === s ? 'selected' : ''}>${esc(sportById(s).name)}</option>`).join('')}</select>
          <select class="select" data-inp="comm-topic" aria-label="Topic"><option value="all">All topics</option>${topics.map((t) => `<option value="${esc(t)}" ${C.topic === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        </div>
        <div id="comm-table">${commTableHTML()}</div>`,
    };
  }

  // ---------- Chat (PRD §19, §41, §59) ----------
  function aiMessageHTML(m) {
    const d = m.data;
    const trace = d.trace || {};
    const traceHTML = d.kind === 'asglist' ? `<div class="retrieval"><span>${esc(trace.source)}</span></div>`
      : `<div class="retrieval"><span>metadata filter: ${trace.scopeVideos} videos / ${trace.segments} segments</span><span>keyword + concept match: ${trace.keyword}</span>${trace.roleFilter ? `<span>role filter: ${esc(trace.roleFilter)}</span>` : ''}<span>reranked: ${trace.reranked || 0}</span><span>${trace.ms} ms</span></div>`;
    const hitLI = (h) => {
      const v = video(h.v); const s = Desk.findSeg(h.v, h.seg);
      if (!v || !s) return '';
      return `<li>${Desk.attributed(v, s)} <span class="muted small">— ${esc(Desk.shortTitle(v))}</span>
        <div class="tiny muted" style="margin-top:3px"><span class="trust source">Source transcript</span> “${esc(s.text)}”</div></li>`;
    };
    const chips = (hs) => `<div class="sources"><span class="tiny muted strong">SOURCES</span>${hs.map((h) => { const v = video(h.v); const s = Desk.findSeg(h.v, h.seg); return v && s ? `<button class="src-chip" data-act="seek" data-v="${v.id}" data-t="${s.t}"><span class="ttl">${esc(Desk.shortTitle(v))}</span><span class="tm">${fmtDur(s.t)}</span></button>` : ''; }).join('')}${hs.length > 1 ? `<button class="btn sm ghost" data-act="open-all" data-hits='${esc(JSON.stringify(hs))}'>Open all sources</button>` : ''}</div>`;
    let body = '';
    if (d.kind === 'answer') {
      body = `<div class="row" style="gap:6px;margin-bottom:6px"><span class="trust ai">AI answer</span><span class="tiny muted">Attributed statements only · ${esc(d.intro)}</span></div>
        <ol>${d.hits.map(hitLI).join('')}</ol>
        ${d.inference ? `<p style="margin-top:8px"><span class="trust inference">AI inference</span> ${esc(d.inference)}</p>` : ''}
        ${chips(d.hits)}`;
    } else if (d.kind === 'compare') {
      body = `<div class="row" style="gap:6px;margin-bottom:6px"><span class="trust ai">AI comparison</span></div>
        <div class="debate">${[d.left, d.right].map((side) => `<div><h5>${esc(side.label)}</h5>${side.hits.length ? `<ol style="padding-left:18px;margin:0">${side.hits.map(hitLI).join('')}</ol>` : '<div class="small muted">No evidence found.</div>'}</div>`).join('')}</div>
        ${chips(d.left.hits.concat(d.right.hits))}`;
    } else if (d.kind === 'asglist') {
      body = `<div class="row" style="gap:6px;margin-bottom:6px"><span class="trust source">Assignment data</span></div><p>${esc(d.intro)}</p>
        <div class="card" style="margin-top:6px">${d.asg.map((id) => Desk.S.assignments.find((a) => a.id === id)).filter(Boolean).map(asgRow).join('')}</div>`;
    } else {
      body = `<p>I couldn't find transcript evidence for that in <b>${esc(d.scope)}</b>. I won't guess without a source — try widening the scope to <button class="link-btn" data-act="chat-widen">All ESPN content</button> or rephrasing with a team, player, or topic.</p>`;
    }
    return `<div class="msg ai"><div class="bubble">${body}${traceHTML}</div></div>`;
  }
  function chatLogHTML() {
    const log = Desk.S.chat;
    const sugg = ["What did broadcasters say about the Liberty's defensive rebounding?", 'Show me every interview clip where a player mentioned fatigue', 'Anything new about the quarterback situation?', 'Summarize all comments about officiating', 'Which assigned videos still need a summary?', 'Find where the coach discussed the second-unit rotation', 'Compare pass protection and red zone', 'What are the injury updates on Jalen Brooks?'];
    if (!log.length) return `<div style="margin:auto;max-width:640px;text-align:center;padding:30px 0"><div style="font-family:var(--display);font-size:28px;font-weight:700">Ask ESPN</div><p class="muted">Answers come only from transcripts and metadata in scope, with every statement attributed to a speaker and timestamp.</p><div class="suggest" style="justify-content:center">${sugg.map((q) => `<button data-act="chat-suggest" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
    return log.map((m) => (m.role === 'user' ? `<div class="msg user">${esc(m.text)}<div class="tiny" style="opacity:.6;margin-top:3px">Scope: ${esc(m.scopeLabel)}</div></div>` : aiMessageHTML(m))).join('') + (U.chatBusy ? `<div class="msg ai"><div class="bubble" style="width:340px"><div class="tiny muted">Searching transcripts…</div><div class="skeleton"></div><div class="skeleton" style="width:70%"></div></div></div>` : '');
  }
  function chat() {
    const sc = U.chatScope;
    const S = Desk.S;
    const leagues = [...new Set(S.videos.map((v) => v.league))];
    const sports = [...new Set(S.videos.map((v) => v.sport))];
    const scopeOpts = [['all', 'All ESPN content'], ['assignments', 'My assignments'], ['week', 'This week'], ['saved', 'Saved videos']];
    if (sc.type === 'video' || sc.type === 'game') scopeOpts.push([sc.type, (sc.type === 'video' ? 'This video: ' : 'This game: ') + Desk.shortTitle(video(sc.value))]);
    return {
      rail: false,
      html: `<div class="page-head"><div><h1>Chat</h1><div class="sub">Ask ESPN · Ask assignments · Ask this week · Compare (“compare X and Y”)</div></div><button class="btn sm" data-act="chat-clear">Clear conversation</button></div>
        <div class="chat-page">
          <div class="chat-scope">
            <label>Scope <select class="select" data-inp="chat-type">${scopeOpts.map(([k, l]) => `<option value="${k}" ${sc.type === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
            <label>Date <select class="select" data-inp="chat-date">${[['any', 'Any time'], ['24h', 'Last 24 hours'], ['7d', 'Last 7 days']].map(([k, l]) => `<option value="${k}" ${sc.date === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label>Sport <select class="select" data-inp="chat-sport"><option value="all">All</option>${sports.map((s) => `<option value="${s}" ${sc.sport === s ? 'selected' : ''}>${esc(sportById(s).name)}</option>`).join('')}</select></label>
            <label>League <select class="select" data-inp="chat-league"><option value="all">All</option>${leagues.map((l) => `<option ${sc.league === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
          </div>
          <div class="chat-log" id="chat-log">${chatLogHTML()}</div>
          <form class="chat-composer" data-form="chat"><textarea id="chat-input" placeholder="Ask about any game, player, quote, or assignment…  (Enter to send)" aria-label="Ask a question"></textarea><button class="btn red" type="submit">${ic('send')} Ask</button></form>
        </div>`,
    };
  }

  // ---------- Sport landing (PRD §27) ----------
  function sport(id) {
    const S = Desk.S;
    const sp = sportById(id);
    const vids = S.videos.filter((v) => v.sport === id).sort((a, b) => b.publishedAt - a.publishedAt);
    const liveE = S.live.filter((e) => e.sport === id);
    const asg = sortByDue(S.assignments.filter((a) => video(a.videoId).sport === id));
    const tags = [...new Set(vids.flatMap((v) => v.tags || []))];
    const leagues = sp.leagues.length ? sp.leagues : [];
    return {
      rail: true,
      html: `<div class="page-head"><div class="row" style="gap:12px">${glyph(id).replace('sport-glyph"', 'sport-glyph" style="width:40px;height:40px;font-size:14px;border-radius:8px;background:' + sportStyle(id)[0] + '"')}<div><h1>${esc(sp.name)}</h1><div class="sub">${esc(sp.family || '')} · ${vids.length} videos · ${asg.length} assignments</div></div></div></div>
        <div class="filters">${leagues.map((l) => `<button class="pill clickable league" data-act="lib-league" data-l="${esc(l)}">${esc(l)}</button>`).join('')}</div>
        ${liveE.length ? `<section class="section">${secHead('Live now')}<div class="grid-3">${liveE.map(liveCardBig).join('')}</div></section>` : ''}
        <section class="section">${secHead('Assigned to me', asg.length ? `<button class="link-btn" data-act="asg-jump" data-f="sport:${id}">View in Assignments →</button>` : '')}${asg.length ? `<div class="card">${asg.map(asgRow).join('')}</div>` : empty('No assignments in ' + sp.name)}</section>
        <section class="section">${secHead('Latest')}${vids.length ? `<div class="grid-3">${vids.slice(0, 6).map((v) => vcard(v)).join('')}</div>` : empty('No videos yet', 'Content appears here after the next catalog sync.')}</section>
        ${tags.length ? `<section class="section">${secHead('Topics')}<div class="row wrap">${tags.map((t) => `<button class="pill clickable" data-act="lib-tag" data-t="${esc(t)}" data-s="${id}">${esc(t)}</button>`).join('')}</div></section>` : ''}
        <section class="section card card-pad">${secHead('Ask ' + esc(sp.name))}
          <form class="row" data-form="sport-ask" data-s="${id}"><input class="input" name="q" style="flex:1" placeholder="What are analysts saying about…"><button class="btn red" type="submit">${ic('sparkle')} Ask</button></form></section>`,
    };
  }
  function sportsIndex() {
    const fam = {};
    D.SPORTS.forEach((s) => { (fam[s.family] = fam[s.family] || []).push(s); });
    return {
      rail: false,
      html: `<div class="page-head"><div><h1>All sports</h1><div class="sub">Normalized taxonomy: Sport → League / Competition → Team / Athlete → Event → Video</div></div></div>
        ${Object.entries(fam).map(([f, arr]) => `<section class="section">${secHead(esc(f))}<div class="sport-tiles">${arr.map((s) => `<a class="sport-tile" href="#/sport/${s.id}" style="text-decoration:none">${glyph(s.id)} ${esc(s.name)}<span class="spacer"></span><span class="tiny muted">${Desk.S.videos.filter((v) => v.sport === s.id).length || ''}</span></a>`).join('')}</div></section>`).join('')}`,
    };
  }

  // ---------- Saved / History / Notes ----------
  function saved() {
    const S = Desk.S;
    const vids = S.saved.map(video).filter(Boolean);
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>Saved</h1><div class="sub">Saved videos and virtual clips</div></div></div>
        <section class="section">${secHead('Clips', S.clips.length + ' virtual clips · start/end references to the original asset')}
          <div class="card">${S.clips.length ? S.clips.map((c) => { const v = video(c.videoId); return `<div class="asg-compact">${Desk.ic('scissors').replace('<svg', '<svg style="width:16px;height:16px;flex-shrink:0"')}<span class="t" data-act="clip-play" data-c="${c.id}">${esc(c.title)}<div class="tiny muted" style="font-weight:400">${esc(Desk.shortTitle(v))} · ${fmtDur(c.start)}–${fmtDur(c.end)} (${fmtDur(c.end - c.start)})</div></span>${(c.tags || []).map((t) => `<span class="pill tag">${esc(t)}</span>`).join('')}<button class="btn sm" data-act="clip-play" data-c="${c.id}">${ic('play')} Play</button><button class="btn sm ghost" data-act="share" data-v="${c.videoId}" data-t="${c.start}">${ic('link')}</button></div>`; }).join('') : '<div class="card-pad small muted">No clips yet. In the player, press I / O to set in and out points.</div>'}</div></section>
        <section class="section">${secHead('Videos', vids.length + ' saved')}${vids.length ? `<div class="grid-3">${vids.map((v) => vcard(v)).join('')}</div>` : empty('Nothing saved')}</section>`,
    };
  }
  function history() {
    const S = Desk.S;
    const rows = S.history.slice().sort((a, b) => b.at - a.at);
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>History</h1><div class="sub">${S.settings.historyVisible ? 'Private to you' : 'History recording is paused (Settings → Privacy)'}</div></div><button class="btn sm" data-act="history-clear">Clear history</button></div>
        <div class="card" style="padding:4px">${rows.length ? rows.map((h) => { const v = video(h.videoId); return v ? vrow(v, `<div class="tiny muted">Watched ${fmtAgo(h.at)} · stopped at ${fmtDur(Desk.watchPos(v.id))}</div>`) : ''; }).join('') : empty('No history')}</div>`,
    };
  }
  const NOTE_TYPES = ['TIMESTAMP_NOTE', 'PRIVATE_NOTE', 'QUOTE', 'FOLLOW_UP', 'QUESTION', 'INSIGHT', 'ACTION_ITEM'];
  function noteHTML(n, showVideo) {
    const v = video(n.videoId);
    return `<div class="note"><div class="n-head"><span class="trust note">User note</span><span class="pill">${esc(typeLabel(n.type))}</span>${cite(n.videoId, n.t)}<span class="spacer"></span><span>${fmtAgo(n.createdAt)}</span><button class="btn sm ghost" data-act="note-del" data-n="${n.id}" aria-label="Delete note">${ic('x')}</button></div>
      <div>${esc(n.text)}</div>${showVideo && v ? `<div class="tiny muted" style="margin-top:3px">${esc(v.title)}</div>` : ''}${(n.tags || []).length ? `<div class="row wrap" style="gap:4px;margin-top:4px">${n.tags.map((t) => `<span class="pill tag">#${esc(t)}</span>`).join('')}</div>` : ''}</div>`;
  }
  function notes() {
    const S = Desk.S;
    let list = S.notes.slice().sort((a, b) => b.createdAt - a.createdAt);
    if (U.notesFilter !== 'all') list = list.filter((n) => n.type === U.notesFilter);
    return {
      rail: true,
      html: `<div class="page-head"><div><h1>Notes</h1><div class="sub">${S.notes.length} notes · every note keeps its video, timestamp, author and date</div></div>
        <select class="select" data-inp="notes-filter"><option value="all">All types</option>${NOTE_TYPES.map((t) => `<option value="${t}" ${U.notesFilter === t ? 'selected' : ''}>${typeLabel(t)}</option>`).join('')}</select></div>
        ${list.length ? list.map((n) => noteHTML(n, true)).join('') : empty('No notes', 'In the player press N to add a note at the current timestamp.')}`,
    };
  }

  // ---------- Settings (PRD §56) ----------
  function settings() {
    const st = Desk.S.settings;
    const chk = (path, on, label) => `<label class="check"><input type="checkbox" data-set="${path}" ${on ? 'checked' : ''}> ${label}</label>`;
    const cats = ['Assignments', 'Due Soon', 'Overdue', 'New Video', 'Live Event', 'Followed Team', 'Followed Athlete', 'Transcript Ready', 'Summary Ready', 'Breaking Update'];
    const teams = [...new Set(Desk.S.videos.flatMap((v) => v.teams))].sort();
    const athletes = [...new Set(Desk.S.videos.flatMap((v) => v.players))].sort();
    return {
      rail: false,
      html: `<div class="page-head"><div><h1>Settings</h1><div class="sub">Preferences are saved in this browser</div></div></div>
      <div class="settings-grid">
        <div class="card card-pad"><h3 style="margin-top:0">Sports</h3><div class="small muted" style="margin-bottom:6px">Favorite = boosts relevance · Sidebar = pinned in navigation</div>
          ${D.SPORTS.slice(0, 14).map((s) => `<div class="row" style="justify-content:space-between">${glyph(s.id)} <span style="flex:1">${esc(s.name)}</span>${chk('fav:' + s.id, st.favSports.includes(s.id), 'Fav')}${chk('side:' + s.id, st.sidebarSports.includes(s.id), 'Sidebar')}</div>`).join('')}</div>
        <div class="card card-pad"><h3 style="margin-top:0">Teams & athletes</h3>
          ${teams.map((t) => chk('team:' + t, st.followedTeams.includes(t), esc(t))).join('')}<div class="divider"></div>
          ${athletes.map((t) => chk('ath:' + t, st.followedAthletes.includes(t), esc(t))).join('')}</div>
        <div class="card card-pad"><h3 style="margin-top:0">Notifications</h3><div class="small muted">Channels</div>
          ${Object.entries(st.channels).map(([k, v]) => chk('chan:' + k, v, esc(k === 'in-app' ? 'In-app' : k[0].toUpperCase() + k.slice(1)))).join('')}
          <div class="divider"></div><div class="small muted">Categories (uncheck to mute)</div>
          ${cats.map((c) => chk('mute:' + c, !st.mutes[c], esc(c))).join('')}</div>
        <div class="card card-pad"><h3 style="margin-top:0">Assignments & playback</h3>
          <div class="form-row"><label>Default assignment view</label><select class="select" data-set="defaultAsgView">${['list', 'cards', 'kanban', 'calendar', 'sport', 'priority'].map((v) => `<option ${st.defaultAsgView === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="form-row"><label>Default playback speed</label><select class="select" data-set="speed">${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => `<option value="${v}" ${st.speed === v ? 'selected' : ''}>${v}x</option>`).join('')}</select></div>
          ${chk('captions', st.captions, 'Show captions on player')}
          <div class="divider"></div><h3>AI</h3>
          <div class="form-row"><label>Default summary mode</label><select class="select" data-set="summaryMode">${Desk.MODES.map(([k, l]) => `<option value="${k}" ${st.summaryMode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="form-row"><label>Answer length</label><select class="select" data-set="answerLength">${['brief', 'standard'].map((v) => `<option ${st.answerLength === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div class="divider"></div><h3>Privacy</h3>${chk('historyVisible', st.historyVisible, 'Record watch history')}
          ${chk('compactSidebar', st.compactSidebar, 'Compact sidebar')}
          <div class="divider"></div><button class="btn" data-act="reset-demo">Reset demo data</button></div>
      </div>`,
    };
  }

  // ---------- Player page (dynamic parts are driven by app.js) ----------
  function videoPage(id) {
    const v = video(id);
    if (!v) return { rail: false, html: empty('Video not found') };
    const a = asgForVideo(id);
    const S = Desk.S;
    const saved = S.saved.includes(id);
    const P = U.player;
    return {
      rail: false,
      html: `<div class="player-head">
          <button class="btn sm ghost" data-act="back">${ic('left')} Back</button>
          ${glyph(v.sport)}<span class="pill league">${esc(v.league)}</span><span class="pill">${esc(typeLabel(v.type))}</span>
          ${v.live ? '<span class="badge b-red">Live</span>' : ''}
          <span class="small muted">${esc(v.network)} · ${esc(v.program)} · ${v.live ? 'started ' + fmtAgo(v.publishedAt) : 'published ' + fmtAgo(v.publishedAt)}</span>
          <span class="spacer"></span>
          ${a ? `${prio(a.priority)} ${statusBadge(a)} ${dueBadge(a)}` : `<button class="btn sm" data-act="assign-self" data-v="${id}">${ic('plus')} Mark assigned</button>`}
          <h1>${esc(v.title)}</h1>
        </div>
        <div class="player-page">
          <div style="min-width:0">
            <div class="screen" id="screen">
              <div class="bg" style="background:linear-gradient(135deg,${sportStyle(v.sport)[0]},${sportStyle(v.sport)[1]} 70%)"></div>
              <div class="scr-top"><div class="bug">${esc(v.network)} <span style="opacity:.6">|</span> ${esc(v.league)}</div>${v.score ? `<div class="bug num">${esc(v.score)}</div>` : ''}${v.live ? `<div class="bug num" id="live-bug"></div>` : ''}</div>
              <div class="center"><div><div class="big">${esc(v.title)}</div><button class="play-big" data-act="p-play" aria-label="Play" id="play-big">${ic('play')}</button></div></div>
              <div class="caption" id="caption" hidden></div>
              ${v.rights !== 'PLAYABLE' ? `<div class="blocked"><div><div class="badge b-red" style="margin-bottom:10px">${esc(typeLabel(v.rights))}</div><div style="font-size:18px;font-weight:700">Playback isn't available in this context</div><div class="small" style="opacity:.75;margin-top:6px">Metadata, transcript, notes and AI summaries remain accessible.</div></div></div>` : ''}
            </div>
            <div class="controls">
              <div class="timeline" id="timeline" role="slider" aria-label="Seek" tabindex="0"></div>
              <div class="ctl-row">
                <button class="ctl" data-act="p-play" id="play-btn" aria-label="Play/pause (Space)">${ic('play')}</button>
                <button class="ctl" data-act="p-skip" data-d="-10" aria-label="Back 10 seconds (J)">−10s</button>
                <button class="ctl" data-act="p-skip" data-d="10" aria-label="Forward 10 seconds (L)">+10s</button>
                <button class="ctl" data-act="p-seg" data-d="-1" title="Previous transcript moment">⏮ moment</button>
                <button class="ctl" data-act="p-seg" data-d="1" title="Next transcript moment">moment ⏭</button>
                <span class="ctl-time" id="ptime"></span>
                ${v.live ? '<button class="ctl" data-act="p-golive" id="golive">● Go live</button>' : ''}
                <span class="spacer"></span>
                <button class="ctl" data-act="p-mark" title="Bookmark (M)">${ic('bookmark')}</button>
                <button class="ctl" data-act="p-clip-in" title="Clip in point (I)">${ic('scissors')} In</button>
                <button class="ctl" data-act="p-clip-out" title="Clip out point (O)">Out</button>
                <button class="ctl ${S.settings.captions ? 'on' : ''}" data-act="p-cc" title="Captions">CC</button>
                <select class="speed-sel" data-inp="p-speed" aria-label="Playback speed">${[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => `<option value="${s}" ${P && P.speed === s ? 'selected' : ''}>${s}x</option>`).join('')}</select>
                <button class="ctl" data-act="share" data-v="${id}" data-cur="1" title="Copy internal link at timestamp">${ic('link')}</button>
                <button class="ctl" data-act="save-toggle" data-v="${id}" title="Save">${saved ? '★' : '☆'}</button>
              </div>
            </div>
            <div class="chapters" id="chapters"></div>
            <div class="row wrap" style="margin:6px 0 12px;gap:6px">
              ${a && !isDone(a) ? `<button class="btn sm green" data-act="asg-complete" data-a="${a.id}">${ic('check')} Mark complete <span class="kbd">C</span></button>` : ''}
              <button class="btn sm" data-act="queue-add" data-v="${id}">${ic('plus')} Queue</button>
              <button class="btn sm" data-act="ask-video" data-v="${id}">${ic('chat')} Open in Chat</button>
              ${a ? `<button class="btn sm" data-act="asg-remind" data-a="${a.id}">${ic('bell')} Remind</button>` : ''}
              <button class="btn sm ghost" data-act="shortcuts">⌨ Shortcuts</button>
              <span class="spacer"></span>
              <span class="tiny muted">${(v.teams || []).map((t) => `<button class="pill clickable" data-act="lib-team" data-t="${esc(t)}">${esc(t)}</button>`).join(' ')}</span>
            </div>
            <div class="panel">
              <div class="card-pad" style="padding-bottom:8px;border-bottom:1px solid var(--line)">
                <div class="row wrap" style="gap:8px;margin-bottom:8px"><strong style="font-family:var(--display);text-transform:uppercase;letter-spacing:.06em;font-size:15px">Transcript</strong>
                  <span class="trust ${v.live ? 'live' : 'source'}">${v.live ? 'Live / unfinalized' : 'Source transcript'}</span>
                  <span class="tiny muted">English · diarized · ${(v.speakers || []).length} speakers</span><span class="spacer"></span>
                  <label class="tiny check" style="padding:0"><input type="checkbox" data-inp="p-follow" ${!P || P.follow ? 'checked' : ''}> Follow playback</label></div>
                <div class="row wrap" style="gap:6px">
                  <input class="input" data-inp="p-tq" placeholder="Search transcript…" value="${esc(P ? P.tq : '')}" style="flex:1;min-width:160px;height:30px" aria-label="Search transcript">
                  <span id="spk-chips" class="row wrap" style="gap:4px"></span>
                </div>
              </div>
              <div class="transcript" id="tlist"></div>
            </div>
          </div>
          <div class="side-stack"><div class="panel">
            <div class="panel-tabs" role="tablist">${[['summary', 'AI summary'], ['ask', 'Ask'], ['notes', 'Notes'], ['clips', 'Clips'], ['info', 'Details']].map(([k, l]) => `<button role="tab" data-act="p-tab" data-tab="${k}" aria-selected="${P && P.tab === k}">${l}</button>`).join('')}</div>
            <div class="panel-body" id="aibody"></div>
          </div></div>
        </div>`,
    };
  }

  Object.assign(Desk, {
    views: { home, assignments, live, queue, library, commentary, chat, sport, sports: sportsIndex, saved, history, notes, settings, video: videoPage },
    rail, thumb, statusBadge, dueBadge, prio, asgRow, asgCard, vcard, vrow, empty, noteHTML, NOTE_TYPES, STATUS,
    libResultsHTML, commTableHTML, chatLogHTML, aiMessageHTML, highlight, smartReminders,
  });
})();
