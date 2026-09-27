/* AI layer (simulated, deterministic): hybrid retrieval over transcripts, attributed answers,
 * summary modes, and the Daily ESPN Brief. Every video-derived claim carries a timestamp citation. */
(function () {
  const Desk = window.Desk;
  const { D, esc, fmtDur, lcfirst, ROLE_LABEL, video, transcript, speaker, H } = Desk;

  const MODEL = 'desk-rag-demo-1';

  // ---------- Citations & speaker attribution ----------
  function cite(vid, t, withTitle) {
    const v = video(vid);
    const label = withTitle && v ? `${esc(shortTitle(v))} • ${fmtDur(t)}` : fmtDur(t);
    return `<button class="cite" data-act="seek" data-v="${vid}" data-t="${Math.floor(t)}" title="Open ${esc(v ? v.title : '')} at ${fmtDur(t)}">${Desk.ic('play')}${label}</button>`;
  }
  function shortTitle(v) { return v.title.replace(/^LIVE — /, '').replace(/\s+—.*$/, ''); }

  // PRD §15.3 — never present uncertain attribution as fact.
  function spkName(v, spkId, opts) {
    const s = speaker(v, spkId);
    if (s.conf < 0.75) {
      return opts && opts.plain
        ? `${s.name}${s.possibly ? ' (possibly ' + s.possibly + ')' : ''}`
        : `<span class="uncertain">${esc(s.name)}${s.possibly ? ' — possibly ' + esc(s.possibly) : ''}</span>`;
    }
    return opts && opts.plain ? s.name : `<b>${esc(s.name)}</b>`;
  }
  const roleTag = (r) => `<span class="role ${Desk.roleClass(r)}">${esc(ROLE_LABEL[r] || r)}</span>`;

  const SAY_VERBS = /^(said|framed|warned|reported|credited|criticized|noted|flagged|highlighted|argued|relayed|questioned|pointed|explained|praised|declined|acknowledged|expects|disagreed|predicted|called|raised|agreed|set|would|asked)\b/i;
  // "Tony Alvarez (Color commentator) warned that …" — keeps attribution explicit (PRD §40).
  function attributed(v, seg, opts) {
    const s = speaker(v, seg.spk);
    const who = `${spkName(v, seg.spk)} ${roleTag(s.role)}`;
    if (seg.sum && SAY_VERBS.test(seg.sum)) return `${who} ${esc(lcfirst(seg.sum))}`;
    if (seg.sum && !(opts && opts.quote)) return `${who} on the call: ${esc(seg.sum)}`;
    return `${who} said: “${esc(seg.text)}”`;
  }

  // ---------- Tokenizing & synonyms ----------
  const STOP = new Set(('a an the of to in on for and or is are was were be been being what did does do say said says saying about this that these those with from at by it its as me my show find all every any ' +
    'where when who whom which how why there their they them i you we our your last night week today tonight anything new than into ' +
    'mention mentioned mentions discuss discussed discussing comment comments talk talked talking clip clips video videos segment moment moments timestamp exact ' +
    'broadcaster broadcasters announcer announcers commentator commentators analyst analysts interview interviews press conference presser pressers ' +
    'summarize summary give tell please whats happening situation up get got has have had can could would should will just so very more most some ' +
    'espn game games team teams player players coach coaches').split(' '));
  // Note: "situation", "player", "coach" are removed as terms but still detected as role/topic intents below.

  const GROUPS = [
    ['quarterback', 'qb', 'under center', 'starter', 'backup'],
    ['fatigue', 'tired', 'legs', 'fresh', 'recovery', 'rest'],
    ['injury', 'injured', 'ankle', 'wrist', 'shoulder', 'sore', 'soreness', 'mri', 'sprain', 'questionable', 'probable', 'ruled'],
    ['officiating', 'officials', 'official', 'referee', 'var', 'penalty', 'handball', 'foul', 'flag'],
    ['rebounding', 'rebound', 'rebounds', 'glass', 'boards'],
    ['rotation', 'rotations', 'second-unit', 'unit', 'starters', 'bench', 'substitution'],
    ['protection', 'blocking', 'blitz', 'pocket', 'line'],
    ['tactics', 'tactical', 'press', 'pressing', 'formation', 'back three', 'shape'],
    ['transition', 'fast-break', 'break'],
    ['contract', 'extension', 'deal'],
    ['pitching', 'slider', 'pitcher', 'starter'],
    ['bullpen', 'closer', 'reliever'],
    ['late-game', 'two-minute', 'clutch', 'execution', 'late'],
  ];
  const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w);
  const toks = (s) => String(s || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9-]+/).filter(Boolean).map(stem);
  const GROUP_OF = {};
  GROUPS.forEach((g, i) => g.forEach((w) => toks(w).forEach((t) => { GROUP_OF[t] = GROUP_OF[t] || i; })));

  function queryConcepts(q) {
    const words = toks(q).filter((w) => !STOP.has(w) && w.length > 1);
    const concepts = [];
    const seen = new Set();
    words.forEach((w) => {
      const g = GROUP_OF[w];
      const key = g != null ? 'g' + g : w;
      if (seen.has(key)) return;
      seen.add(key);
      concepts.push(g != null ? GROUPS[g].flatMap(toks) : [w]);
    });
    return concepts;
  }

  const tokCache = new Map();
  function segTokens(v, seg) {
    const k = seg.id + ':' + (seg.sum ? 1 : 0);
    if (tokCache.has(k)) return tokCache.get(k);
    const s = speaker(v, seg.spk);
    const r = {
      text: new Set(toks(seg.text)), topic: new Set(toks(seg.topic)), sum: new Set(toks(seg.sum)),
      spk: new Set(toks(s.name + ' ' + (s.possibly || ''))),
      meta: new Set(toks([v.title, v.league, v.program, v.sport, ...(v.teams || []), ...(v.players || [])].join(' '))),
    };
    tokCache.set(k, r);
    return r;
  }

  function roleIntent(q) {
    const s = q.toLowerCase();
    return {
      broadcast: /broadcast|announcer|commentat|analyst|booth|studio|pundit/.test(s),
      interview: /interview|press ?conference|presser|postgame (comments|interview)/.test(s),
      coach: /\bcoach|manager\b/.test(s),
      player: /\bplayer|athlete\b/.test(s),
    };
  }

  // ---------- Scope ----------
  function scopeVideos(scope) {
    const S = Desk.S;
    const now = Date.now();
    let vids = S.videos.slice();
    const sc = scope || { type: 'all' };
    if (sc.type === 'assignments') vids = vids.filter((v) => S.assignments.some((a) => a.videoId === v.id));
    if (sc.type === 'week') vids = vids.filter((v) => v.publishedAt >= now - 7 * 24 * H);
    if (sc.type === 'video') vids = vids.filter((v) => v.id === sc.value);
    if (sc.type === 'saved') vids = vids.filter((v) => S.saved.includes(v.id));
    if (sc.type === 'game') { const v0 = video(sc.value); vids = vids.filter((v) => v0 && v.teams.some((t) => v0.teams.includes(t)) && Math.abs(v.publishedAt - v0.publishedAt) < 72 * H); }
    if (sc.sport && sc.sport !== 'all') vids = vids.filter((v) => v.sport === sc.sport);
    if (sc.league && sc.league !== 'all') vids = vids.filter((v) => v.league === sc.league);
    if (sc.date === '24h') vids = vids.filter((v) => v.publishedAt >= now - 24 * H);
    if (sc.date === '7d') vids = vids.filter((v) => v.publishedAt >= now - 7 * 24 * H);
    return vids;
  }
  function scopeLabel(sc) {
    const base = { all: 'All ESPN content', assignments: 'My assignments', week: 'This week', saved: 'Saved videos', video: 'This video', game: 'This game' }[sc.type] || 'All ESPN content';
    const bits = [base];
    if (sc.type === 'video' || sc.type === 'game') { const v = video(sc.value); if (v) bits[0] += ` (${shortTitle(v)})`; }
    if (sc.sport && sc.sport !== 'all') bits.push(Desk.sportById(sc.sport).name);
    if (sc.league && sc.league !== 'all') bits.push(sc.league);
    if (sc.date && sc.date !== 'any') bits.push(sc.date === '24h' ? 'last 24h' : 'last 7 days');
    return bits.join(' · ');
  }

  // ---------- Hybrid retrieval (PRD §20): metadata filter → keyword/concept match → role rerank ----------
  function retrieve(q, scope, limit) {
    const vids = scopeVideos(scope);
    const concepts = queryConcepts(q);
    const intent = roleIntent(q);
    let candidates = [];
    vids.forEach((v) => {
      const segs = transcript(v.id);
      const visible = v.live ? segs.filter((s) => s.t <= Desk.S.livePos) : segs;
      visible.forEach((seg) => candidates.push({ v, seg }));
    });
    const trace = { scopeVideos: vids.length, segments: candidates.length };

    const scored = [];
    candidates.forEach(({ v, seg }) => {
      const T = segTokens(v, seg);
      let score = 0, matched = 0, contentHit = false;
      concepts.forEach((c) => {
        let best = 0;
        c.forEach((w) => {
          if (T.topic.has(w)) { best = Math.max(best, 2.2); contentHit = true; }
          if (T.sum.has(w)) { best = Math.max(best, 1.4); contentHit = true; }
          if (T.text.has(w)) { best = Math.max(best, 1.2); contentHit = true; }
          if (T.spk.has(w)) { best = Math.max(best, 3); contentHit = true; }
          if (T.meta.has(w)) best = Math.max(best, 0.7);
        });
        if (best) matched++;
        score += best;
      });
      if (!concepts.length) score = 0.5;
      if (!score) return;
      const cov = concepts.length ? matched / concepts.length : 1;
      const role = speaker(v, seg.spk).role;
      let s = score * (0.4 + cov) + (seg.key ? 0.35 : 0) + (seg.sum ? 0.2 : 0) - (seg.q ? 0.6 : 0);
      if (!contentHit) s *= 0.45;
      if (intent.coach && role === 'COACH') s += 1.2;
      if (intent.player && role === 'PLAYER') s += 1.2;
      scored.push({ v, seg, role, score: s, cov });
    });
    trace.keyword = scored.length;

    let pool = scored;
    if (intent.broadcast) {
      const f = pool.filter((x) => D.BROADCAST_ROLES.includes(x.role));
      if (f.length) { pool = f; trace.roleFilter = 'broadcasters only'; }
    } else if (intent.interview) {
      const f = pool.filter((x) => D.INTERVIEWEE_ROLES.includes(x.role) || ['INTERVIEW', 'PRESS_CONFERENCE'].includes(x.v.type));
      if (f.length) { pool = f; trace.roleFilter = 'interviews only'; }
    }
    const threshold = concepts.length ? 1.2 : 0;
    pool = pool.filter((x) => x.score >= threshold && !x.seg.q).sort((a, b) => b.score - a.score);
    // Rerank for diversity: at most 3 moments per video in the top results.
    const perVid = {};
    const out = [];
    pool.forEach((x) => {
      perVid[x.v.id] = (perVid[x.v.id] || 0) + 1;
      if (perVid[x.v.id] <= 3 && out.length < (limit || 6)) out.push(x);
    });
    trace.reranked = out.length;
    return { results: out, trace, concepts };
  }

  // ---------- Chat answers ----------
  function answer(q, scope) {
    const S = Desk.S;
    const s = q.toLowerCase();
    const started = performance.now();

    // Assignment-state questions are answered from workflow data, not transcripts.
    if (/(not|n't|never|still|without|missing)\b.*summar|unsummar/.test(s)) {
      const list = S.assignments.filter((a) => a.summaryRequired && !Desk.hasSummary(a.videoId) && !Desk.isDone(a));
      return { kind: 'asglist', intro: list.length ? `${list.length} assigned video${list.length > 1 ? 's' : ''} still require a summary that hasn't been generated:` : 'Every assignment that requires a summary has one. Nothing outstanding.', asg: Desk.sortByDue(list).map((a) => a.id), trace: { source: 'Assignment Service' } };
    }
    if (/(overdue|unfinished|not started|haven't started|due (today|soon|tomorrow|this week)|left to watch|remaining)/.test(s) && /(assign|video|watch|due|left|overdue|unfinished)/.test(s)) {
      let list = S.assignments.filter((a) => !Desk.isDone(a));
      if (/overdue/.test(s)) list = list.filter(Desk.isOverdue);
      else if (/not started|haven't started/.test(s)) list = list.filter((a) => ['ASSIGNED', 'QUEUED'].includes(a.status));
      else if (/due today/.test(s)) list = list.filter((a) => Desk.isDueToday(a) || Desk.isOverdue(a));
      const sport = D.SPORTS.find((sp) => s.includes(sp.name.toLowerCase()));
      const league = ['nfl', 'wnba', 'mlb', 'nhl', 'laliga'].find((l) => new RegExp('\\b' + l + '\\b').test(s));
      if (sport) list = list.filter((a) => video(a.videoId).sport === sport.id);
      if (league) list = list.filter((a) => video(a.videoId).league.toLowerCase() === league);
      const mins = Math.round(list.reduce((t, a) => t + Desk.remainingSec(a), 0) / 60);
      return { kind: 'asglist', intro: list.length ? `${list.length} assignment${list.length > 1 ? 's' : ''} match — about ${Desk.fmtMins(mins * 60)} of video remaining:` : 'No assignments match that.', asg: Desk.sortByDue(list).map((a) => a.id), trace: { source: 'Assignment Service' } };
    }

    // Compare mode (PRD §41)
    const cm = s.match(/^compare\s+(.+?)\s+(?:and|vs\.?|versus|with|to)\s+(.+?)\??$/);
    if (cm) {
      const A = retrieve(cm[1], scope, 3), B = retrieve(cm[2], scope, 3);
      return { kind: 'compare', left: { label: cm[1], hits: pack(A.results) }, right: { label: cm[2], hits: pack(B.results) }, trace: Object.assign({}, A.trace, { ms: Math.round(performance.now() - started) }) };
    }

    const { results, trace } = retrieve(q, scope, S.settings.answerLength === 'brief' ? 3 : 6);
    trace.ms = Math.round(performance.now() - started) + 180;
    if (!results.length) return { kind: 'none', scope: scopeLabel(scope), trace };

    const hits = pack(results);
    // Light synthesis — labelled as AI INFERENCE, never mixed into attributed statements.
    const topics = {};
    results.forEach((r) => { if (r.seg.topic) topics[r.seg.topic] = (topics[r.seg.topic] || 0) + 1; });
    const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
    const debates = new Set(results.map((r) => r.seg.debate).filter(Boolean));
    const speakers = new Set(results.map((r) => r.seg.spk + r.v.id));
    let inference = '';
    if (debates.size > 1) inference = 'Speakers in these sources disagree — see the opposing positions above before drawing a conclusion.';
    else if (topTopic && topTopic[1] > 1) inference = `The most recurring theme across these moments is “${topTopic[0]}” (${topTopic[1]} of ${results.length} moments, ${speakers.size} distinct speaker${speakers.size > 1 ? 's' : ''}).`;
    const nv = new Set(results.map((r) => r.v.id)).size;
    return { kind: 'answer', intro: `Found ${results.length} relevant moment${results.length > 1 ? 's' : ''} across ${nv} video${nv > 1 ? 's' : ''} in “${scopeLabel(scope)}”.`, hits, inference, trace };
  }
  const pack = (results) => results.map((r) => ({ v: r.v.id, seg: r.seg.id }));
  function findSeg(vid, segId) { return transcript(vid).find((s) => s.id === segId); }

  // ---------- Summary modes (PRD §16) ----------
  const MODES = [
    ['EXEC', 'Executive Summary'], ['BROADCAST', 'Broadcaster Commentary'], ['INTERVIEW', 'Interview Summary'], ['QUOTES', 'Quote Sheet'],
    ['TACTICAL', 'Tactical / Technical'], ['STORYLINE', 'Storyline'], ['TIMELINE', 'Timeline'], ['DEBATE', 'Debate / Disagreement'],
  ];
  const TACTICAL = /protection|pick-and-roll|tactic|pitching|hitting|bullpen|red zone|rotation|run defense|serve|transition|rebounding|blitz|power play|coverage/;

  function summarize(vid, mode, range) {
    const v = video(vid);
    let segs = transcript(vid);
    if (v.live) segs = segs.filter((s) => s.t <= Desk.S.livePos);
    if (range) segs = segs.filter((s) => s.t >= range[0] && s.t <= range[1]);
    const withSum = segs.filter((s) => s.sum);
    const ids = [];
    const li = (seg, body) => { ids.push(seg.id); return `<li>${body} ${cite(vid, seg.t)}</li>`; };
    let html = '';

    if (!segs.length) return { html: '<p class="muted">No finalized transcript in this range yet.</p>', ids };

    switch (mode) {
      case 'EXEC': {
        const k = withSum.filter((s) => s.key).slice(0, 8);
        html = `<ol>${(k.length ? k : withSum.slice(0, 6)).map((s) => li(s, attributed(v, s))).join('')}</ol>`;
        break;
      }
      case 'BROADCAST': {
        const b = withSum.filter((s) => D.BROADCAST_ROLES.includes(speaker(v, s.spk).role));
        if (!b.length) { html = '<p class="muted">No broadcaster or analyst commentary detected in this video.</p>'; break; }
        const byTopic = {};
        b.forEach((s) => { (byTopic[s.topic] = byTopic[s.topic] || []).push(s); });
        const topicsRanked = Object.entries(byTopic).sort((a, b2) => b2[1].length - a[1].length);
        html = `<h4>Key commentary</h4><ol>${b.filter((s) => s.topic !== 'score').slice(0, 8).map((s) => li(s, attributed(v, s))).join('')}</ol>` +
          `<h4>Most discussed topics</h4><ul>${topicsRanked.slice(0, 4).map(([t, arr]) => `<li><b>${esc(t)}</b> — ${arr.length} mention${arr.length > 1 ? 's' : ''} ${arr.map((s) => cite(vid, s.t)).join('')}</li>`).join('')}</ul>`;
        break;
      }
      case 'INTERVIEW': {
        const iv = segs.filter((s) => D.INTERVIEWEE_ROLES.includes(speaker(v, s.spk).role));
        if (!iv.length) { html = '<p class="muted">No interviewee content (player, coach, executive) detected in this video.</p>'; break; }
        const subj = speaker(v, iv[0].spk);
        let qa = '';
        let n = 0;
        segs.forEach((s, i) => {
          if (!s.q) return;
          const a = segs.slice(i + 1).find((x) => !x.q);
          if (!a) return;
          n++; ids.push(s.id, a.id);
          qa += `<div class="qa"><div class="q"><b>Q${n}</b> ${cite(vid, s.t)} ${esc(s.text)}</div><div class="a"><b>A:</b> ${esc(a.text)}</div>${a.sum ? `<div class="small muted">Key point: ${esc(a.sum)}</div>` : ''}</div>`;
        });
        const takeaways = iv.filter((s) => s.key && s.sum).slice(0, 5);
        const non = iv.filter((s) => s.nonAnswer);
        const fut = iv.filter((s) => s.future);
        const inj = iv.filter((s) => /injur|fatigue/.test(s.topic || ''));
        html = `<p><b>Interviewee:</b> ${esc(subj.name)} ${roleTag(subj.role)} · <b>Context:</b> ${esc(Desk.typeLabel(v.type))}, ${esc(v.program)}</p>` +
          `<h4>Top takeaways</h4><ol>${takeaways.map((s) => li(s, esc(s.sum))).join('')}</ol>` +
          (inj.length ? `<h4>Injury / fatigue comments</h4><ul>${inj.map((s) => li(s, esc(s.sum || s.text))).join('')}</ul>` : '') +
          (non.length ? `<h4>Non-answers / declined</h4><ul>${non.map((s) => li(s, esc(s.sum))).join('')}</ul>` : '') +
          (fut.length ? `<h4>Future-facing statements</h4><ul>${fut.map((s) => li(s, esc(s.sum))).join('')}</ul>` : '') +
          (qa ? `<h4>Question → answer pairs</h4>${qa}` : '');
        break;
      }
      case 'QUOTES': {
        const qs = segs.filter((s) => s.quote);
        html = qs.length ? qs.map((s) => { ids.push(s.id); return `<div class="quote-card"><blockquote>“${esc(s.text)}”</blockquote><div class="small">${spkName(v, s.spk)} ${roleTag(speaker(v, s.spk).role)} ${cite(vid, s.t)}</div></div>`; }).join('') : '<p class="muted">No standout direct quotes flagged.</p>';
        break;
      }
      case 'TACTICAL': {
        const t = withSum.filter((s) => TACTICAL.test(s.topic || ''));
        html = t.length ? `<ol>${t.map((s) => li(s, `<span class="pill tag">${esc(s.topic)}</span> ${attributed(v, s)}`)).join('')}</ol>` : '<p class="muted">No tactical or technical analysis detected.</p>';
        break;
      }
      case 'STORYLINE': {
        const st = withSum.filter((s) => s.key);
        const first = st[0], last = st[st.length - 1];
        html = `<p><b>Setup.</b> ${first ? esc(first.sum) + ' ' + cite(vid, first.t) : '—'}</p>` +
          `<h4>How the story turned</h4><ol>${st.slice(1, -1).map((s) => li(s, esc(s.sum))).join('')}</ol>` +
          (last && last !== first ? `<p><b>Resolution.</b> ${esc(last.sum)} ${cite(vid, last.t)}</p>` : '');
        if (first) ids.push(first.id); if (last) ids.push(last.id);
        break;
      }
      case 'TIMELINE': {
        html = `<ul style="list-style:none;padding-left:0">${segs.map((s) => { ids.push(s.id); return `<li>${cite(vid, s.t)} ${spkName(v, s.spk)} — ${esc(s.sum || s.text)}</li>`; }).join('')}</ul>`;
        break;
      }
      case 'DEBATE': {
        const d = withSum.filter((s) => s.debate);
        if (!d.length) { html = '<p class="muted">No disagreement between speakers was detected in this video.</p>'; break; }
        const sides = {};
        d.forEach((s) => { (sides[s.debate] = sides[s.debate] || []).push(s); });
        html = `<div class="debate">${Object.entries(sides).map(([side, arr]) => `<div><h5>${esc(side)}</h5><ul style="padding-left:16px;margin:0">${arr.map((s) => li(s, attributed(v, s))).join('')}</ul></div>`).join('')}</div>`;
        break;
      }
    }
    return { html, ids };
  }

  // ---------- Daily ESPN Brief (PRD §11.6, §42) ----------
  function brief() {
    const S = Desk.S;
    const now = Date.now();
    const sections = [];
    const dueToday = Desk.sortByDue(S.assignments.filter((a) => (Desk.isDueToday(a) || Desk.isOverdue(a))));
    if (dueToday.length) {
      sections.push({ h: 'Assigned content due today', items: dueToday.map((a) => {
        const v = video(a.videoId);
        return `<a href="#/video/${v.id}"><b>${esc(v.title)}</b></a> — ${Desk.isOverdue(a) ? `<span class="badge b-red">Overdue</span>` : 'due ' + Desk.fmtTime(a.dueAt)} · ${Math.round(Desk.progressOf(v.id) * 100)}% watched`;
      }) });
    }
    const live = S.live.filter((e) => e.status === 'LIVE' || e.status === 'PRE_GAME');
    if (live.length) {
      sections.push({ h: 'Live & upcoming', items: live.slice(0, 4).map((e) => `${esc(e.league)}: ${esc(eventName(e))} — ${e.status === 'LIVE' ? '<span class="badge b-red">Live</span> ' + esc(e.period) : esc(e.period)} on ${esc(e.network)}${e.assigned ? ' · <b>assigned to you</b>' : ''}`) });
    }
    const fresh = S.videos.filter((v) => v.publishedAt > now - 24 * H && !v.live).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 4);
    if (fresh.length) sections.push({ h: 'Newly available relevant video', items: fresh.map((v) => `<a href="#/video/${v.id}">${esc(v.title)}</a> <span class="muted small">· ${esc(v.league)} · ${Desk.fmtAgo(v.publishedAt)}</span>`) });

    const recentSegs = [];
    S.videos.filter((v) => v.publishedAt > now - 60 * H).forEach((v) => transcript(v.id).forEach((s) => { if (s.key && s.sum && (!v.live || s.t <= S.livePos)) recentSegs.push({ v, s, role: speaker(v, s.spk).role }); }));
    const interviews = recentSegs.filter((x) => D.INTERVIEWEE_ROLES.includes(x.role)).sort((a, b) => b.v.publishedAt - a.v.publishedAt).slice(0, 3);
    if (interviews.length) sections.push({ h: 'Important comments from interviews', items: interviews.map((x) => `${attributed(x.v, x.s)} ${cite(x.v.id, x.s.t, true)}`) });
    const bc = recentSegs.filter((x) => ['ANALYST', 'COLOR_COMMENTATOR', 'STUDIO_HOST'].includes(x.role) && !/score|storyline/.test(x.s.topic)).sort((a, b) => b.v.publishedAt - a.v.publishedAt).slice(0, 3);
    if (bc.length) sections.push({ h: 'Broadcaster & analyst remarks', items: bc.map((x) => `${attributed(x.v, x.s)} ${cite(x.v.id, x.s.t, true)}`) });
    const inj = recentSegs.filter((x) => /injury|roster/.test(x.s.topic) && x.role === 'REPORTER').sort((a, b) => b.v.publishedAt - a.v.publishedAt).slice(0, 3);
    if (inj.length) sections.push({ h: 'Injury & roster developments', items: inj.map((x) => `${attributed(x.v, x.s)} ${cite(x.v.id, x.s.t, true)}`) });
    return sections;
  }
  function eventName(e) { return e.home ? `${e.away.name} at ${e.home.name}` : e.away.name; }

  // ---------- Commentary records (PRD §17, §31) ----------
  function commentaryRecords() {
    const out = [];
    Desk.S.videos.forEach((v) => transcript(v.id).forEach((s) => {
      if (!s.sum || (v.live && s.t > Desk.S.livePos)) return;
      out.push({ v, s, spk: speaker(v, s.spk) });
    }));
    return out.sort((a, b) => b.v.publishedAt - a.v.publishedAt || a.s.t - b.s.t);
  }

  Object.assign(Desk, { MODEL, MODES, cite, shortTitle, spkName, roleTag, attributed, retrieve, answer, findSeg, summarize, brief, eventName, commentaryRecords, scopeLabel, toks });
})();
