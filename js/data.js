/* ESPN Video Desk — demo data.
 * Leagues and teams are real; every person, quote, and transcript is fictional demo content.
 * Times are expressed relative to "now" so the demo always looks current.
 */
(function () {
  const H = 3600e3;

  // --- Taxonomy (PRD §3, §4) -------------------------------------------------
  const SPORTS = [
    { id: 'football', name: 'Football', family: 'Major U.S. Team Sports', leagues: ['NFL', 'NCAA Football', 'UFL'] },
    { id: 'basketball', name: 'Basketball', family: 'Major U.S. Team Sports', leagues: ['NBA', 'WNBA', "NCAA Men's Basketball", "NCAA Women's Basketball", 'NBA G League'] },
    { id: 'baseball', name: 'Baseball', family: 'Major U.S. Team Sports', leagues: ['MLB', 'NCAA Baseball', 'Little League Baseball', 'Banana Ball'] },
    { id: 'hockey', name: 'Hockey', family: 'Major U.S. Team Sports', leagues: ['NHL', 'NCAA Hockey'] },
    { id: 'soccer', name: 'Soccer', family: 'Global Football', leagues: ['LALIGA', 'Bundesliga', 'NWSL', 'FA Cup', 'Copa del Rey', 'USL'] },
    { id: 'golf', name: 'Golf', family: 'Individual', leagues: ['PGA TOUR', 'TGL', 'NCAA Golf'] },
    { id: 'tennis', name: 'Tennis', family: 'Individual', leagues: ['ATP', 'WTA', 'Grand Slam'] },
    { id: 'boxing', name: 'Boxing', family: 'Combat', leagues: ['Boxing'] },
    { id: 'mma', name: 'MMA', family: 'Combat', leagues: ['Professional Fighters League'] },
    { id: 'pro-wrestling', name: 'Pro Wrestling', family: 'Combat', leagues: ['WWE'] },
    { id: 'wrestling', name: 'Wrestling', family: 'Combat', leagues: ['NCAA Wrestling'] },
    { id: 'motor', name: 'Motor Sports', family: 'Motor & Action', leagues: ['Formula One', 'NASCAR'] },
    { id: 'surfing', name: 'Surfing', family: 'Motor & Action', leagues: ['World Surf League'] },
    { id: 'lacrosse', name: 'Lacrosse', family: 'Olympic & Collegiate', leagues: ['Premier Lacrosse League', 'National Lacrosse League', "Women's Lacrosse League"] },
    { id: 'rugby', name: 'Rugby', family: 'Olympic & Collegiate', leagues: ['Major League Rugby'] },
    { id: 'volleyball', name: 'Volleyball', family: 'Olympic & Collegiate', leagues: ['League One Volleyball', 'NCAA Volleyball'] },
    { id: 'softball', name: 'Softball', family: 'Olympic & Collegiate', leagues: ['NCAA Softball'] },
    { id: 'gymnastics', name: 'Gymnastics', family: 'Olympic & Collegiate', leagues: ['NCAA Gymnastics'] },
    { id: 'track', name: 'Track & Field', family: 'Olympic & Collegiate', leagues: ['NCAA Track & Field'] },
    { id: 'swimming', name: 'Swimming & Diving', family: 'Olympic & Collegiate', leagues: ['NCAA Swimming & Diving'] },
    { id: 'marathon', name: 'Marathon', family: 'Olympic & Collegiate', leagues: [] },
    { id: 'bowling', name: 'Bowling', family: 'Long-tail', leagues: [] },
    { id: 'cricket', name: 'Cricket', family: 'Long-tail', leagues: [] },
    { id: 'curling', name: 'Curling', family: 'Long-tail', leagues: [] },
    { id: 'equestrian', name: 'Equestrian', family: 'Long-tail', leagues: [] },
    { id: 'fencing', name: 'Fencing', family: 'Long-tail', leagues: ['NCAA Fencing'] },
    { id: 'fishing', name: 'Fishing', family: 'Long-tail', leagues: [] },
    { id: 'jai-alai', name: 'Jai Alai', family: 'Long-tail', leagues: [] },
    { id: 'padel', name: 'Padel', family: 'Long-tail', leagues: [] },
    { id: 'rowing', name: 'Rowing', family: 'Long-tail', leagues: ['NCAA Rowing'] },
    { id: 'water-polo', name: 'Water Polo', family: 'Long-tail', leagues: [] },
  ];

  const CONTENT_TYPES = ['LIVE_EVENT', 'FULL_REPLAY', 'CONDENSED_GAME', 'HIGHLIGHT', 'TOP_PLAY', 'INTERVIEW', 'PRESS_CONFERENCE', 'PREGAME', 'HALFTIME', 'POSTGAME', 'STUDIO_SHOW', 'STUDIO_SEGMENT', 'BROADCAST_ANALYSIS', 'FILM_BREAKDOWN', 'NEWS_UPDATE', 'BREAKING_NEWS', 'FEATURE', 'DOCUMENTARY', 'ORIGINAL', 'PODCAST_VIDEO', 'RADIO_VIDEO', 'SOCIAL_CLIP', 'TRAILER', 'OTHER'];

  const BROADCAST_ROLES = ['PLAY_BY_PLAY', 'COLOR_COMMENTATOR', 'STUDIO_HOST', 'ANALYST', 'REPORTER'];
  const INTERVIEWEE_ROLES = ['PLAYER', 'COACH', 'EXECUTIVE'];

  // Transcript segment builder: [time, speakerId, text, opts]
  function ts(str) {
    const p = str.split(':').map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }
  function tr(videoId, rows) {
    return rows.map((r, i) => Object.assign({ id: `${videoId}_s${i}`, t: ts(r[0]), spk: r[1], text: r[2], conf: 0.95 }, r[3] || {}));
  }

  // --- Videos ---------------------------------------------------------------
  const VIDEOS = [
    {
      id: 'v1', title: 'Bills at Chiefs — Full Game Replay', sport: 'football', league: 'NFL', type: 'FULL_REPLAY',
      duration: ts('3:08:00'), publishedH: -30, network: 'ESPN', program: 'Monday Night Football',
      teams: ['Buffalo Bills', 'Kansas City Chiefs'], players: ['Jalen Brooks', 'Marcus Reed'],
      tags: ['injury', 'strategy', 'officiating'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      score: 'BUF 27 · KC 24 · Final',
      speakers: [
        { id: 'pbp', name: 'Dan Mercer', role: 'PLAY_BY_PLAY', conf: 0.98 },
        { id: 'cc', name: 'Tony Alvarez', role: 'COLOR_COMMENTATOR', conf: 0.97 },
        { id: 'sr', name: 'Kelly Shaw', role: 'REPORTER', conf: 0.95 },
        { id: 'ref', name: 'Referee', role: 'OFFICIAL', conf: 0.71, possibly: 'Referee Ben Castillo' },
      ],
      chapters: [['0:00:00', 'Pregame'], ['0:05:00', '1st Quarter'], ['0:40:00', '2nd Quarter'], ['1:22:00', 'Halftime'], ['1:35:00', '3rd Quarter'], ['2:15:00', '4th Quarter']],
    },
    {
      id: 'v2', title: 'Bills Postgame Press Conference — Coach Ray Holloway', sport: 'football', league: 'NFL', type: 'PRESS_CONFERENCE',
      duration: ts('11:40'), publishedH: -26, network: 'ESPN+', program: 'NFL Postgame',
      teams: ['Buffalo Bills'], players: ['Ray Holloway'], tags: ['injury', 'contract', 'coaching', 'strategy'],
      rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [
        { id: 'coach', name: 'Ray Holloway', role: 'COACH', conf: 0.96 },
        { id: 'rep', name: 'Reporter', role: 'REPORTER', conf: 0.64, possibly: 'Kelly Shaw' },
      ],
      chapters: [['0:00', 'Opening statement'], ['1:05', 'Protection'], ['2:40', 'QB health'], ['4:00', 'Defense'], ['5:18', 'Contract'], ['7:00', 'Rotation & fatigue']],
    },
    {
      id: 'v3', title: 'WNBA Semifinals Game 2: Aces at Liberty — Full Replay', sport: 'basketball', league: 'WNBA', type: 'FULL_REPLAY',
      duration: ts('2:12:00'), publishedH: -44, network: 'ESPN', program: 'WNBA Playoffs',
      teams: ['New York Liberty', 'Las Vegas Aces'], players: ['Tasha Greene', 'Dana Pierce'],
      tags: ['playoffs', 'tactics', 'coaching'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      score: 'NY 84 · LV 79 · Final',
      speakers: [
        { id: 'pbp', name: 'Lena Ortiz', role: 'PLAY_BY_PLAY', conf: 0.97 },
        { id: 'cc', name: 'Marcus Webb', role: 'COLOR_COMMENTATOR', conf: 0.96 },
        { id: 'sr', name: 'Priya Nair', role: 'REPORTER', conf: 0.94 },
      ],
      chapters: [['0:00:00', '1st Quarter'], ['0:30:00', '2nd Quarter'], ['0:42:00', 'Halftime'], ['0:48:00', '3rd Quarter'], ['1:20:00', '4th Quarter']],
    },
    {
      id: 'v4', title: 'Tasha Greene Postgame Interview — Liberty Even Series', sport: 'basketball', league: 'WNBA', type: 'INTERVIEW',
      duration: ts('6:40'), publishedH: -41, network: 'ESPN', program: 'WNBA Playoffs Postgame',
      teams: ['New York Liberty'], players: ['Tasha Greene'], tags: ['playoffs', 'tactics'],
      rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [
        { id: 'rep', name: 'Priya Nair', role: 'REPORTER', conf: 0.95 },
        { id: 'pl', name: 'Tasha Greene', role: 'PLAYER', conf: 0.97 },
      ],
      chapters: [['0:00', 'Rebounding'], ['1:30', 'Pick-and-roll'], ['2:50', 'Fatigue'], ['4:20', 'Game 3']],
    },
    {
      id: 'v5', title: 'NFL Live: Is It Time for a QB Change in New York?', sport: 'football', league: 'NFL', type: 'STUDIO_SEGMENT',
      duration: ts('9:30'), publishedH: -20, network: 'ESPN', program: 'NFL Live',
      teams: ['New York Jets'], players: [], tags: ['roster', 'controversy', 'strategy'],
      rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [
        { id: 'host', name: 'Andrea Cole', role: 'STUDIO_HOST', conf: 0.98 },
        { id: 'a1', name: 'Greg Fontaine', role: 'ANALYST', conf: 0.96 },
        { id: 'a2', name: 'Devin Marsh', role: 'ANALYST', conf: 0.95 },
      ],
      chapters: [['0:00', 'Setup'], ['0:45', 'The case for a change'], ['2:05', 'The case against'], ['6:10', 'Reporting'], ['7:40', 'Predictions']],
    },
    {
      id: 'v6', title: 'Dodgers at Padres — Condensed Game', sport: 'baseball', league: 'MLB', type: 'CONDENSED_GAME',
      duration: ts('22:00'), publishedH: -18, network: 'ESPN', program: 'Sunday Night Baseball',
      teams: ['Los Angeles Dodgers', 'San Diego Padres'], players: [], tags: ['postseason', 'analytics', 'strategy'],
      rights: 'PLAYABLE', transcriptStatus: 'ready', score: 'SD 5 · LAD 3 · Final',
      speakers: [
        { id: 'pbp', name: 'Chris Lam', role: 'PLAY_BY_PLAY', conf: 0.97 },
        { id: 'cc', name: 'Sam Delgado', role: 'COLOR_COMMENTATOR', conf: 0.96 },
      ],
      chapters: [['0:00', 'Early innings'], ['7:00', 'Middle innings'], ['14:00', 'Late innings']],
    },
    {
      id: 'v7', title: 'Real Madrid vs Sevilla — Match Highlights', sport: 'soccer', league: 'LALIGA', type: 'HIGHLIGHT',
      duration: ts('8:00'), publishedH: -52, network: 'ESPN+', program: 'LALIGA on ESPN+',
      teams: ['Real Madrid', 'Sevilla'], players: [], tags: ['tactics', 'officiating'],
      rights: 'PLAYABLE', transcriptStatus: 'ready', score: 'RMA 1 · SEV 1 · FT',
      speakers: [
        { id: 'pbp', name: 'Ian Castell', role: 'PLAY_BY_PLAY', conf: 0.97 },
        { id: 'an', name: 'Sofia Mendes', role: 'ANALYST', conf: 0.96 },
      ],
      chapters: [['0:00', 'First half'], ['4:00', 'Second half']],
    },
    {
      id: 'v8', title: 'Formula One Qualifying — Round 18', sport: 'motor', league: 'Formula One', type: 'FULL_REPLAY',
      duration: ts('1:05:00'), publishedH: -8, network: 'ESPN2', program: 'F1 on ESPN',
      teams: [], players: [], tags: ['strategy'], rights: 'PLAYABLE', transcriptStatus: 'processing',
      speakers: [], chapters: [['0:00:00', 'Q1'], ['0:25:00', 'Q2'], ['0:45:00', 'Q3']],
    },
    {
      id: 'v9', title: 'Georgia vs Alabama — Game Highlights', sport: 'football', league: 'NCAA Football', type: 'HIGHLIGHT',
      duration: ts('12:00'), publishedH: -60, network: 'ABC', program: 'Saturday Night Football',
      teams: ['Georgia Bulldogs', 'Alabama Crimson Tide'], players: [], tags: ['milestone'],
      rights: 'PLAYABLE', transcriptStatus: 'ready', score: 'UGA 31 · ALA 28 · Final',
      speakers: [
        { id: 'pbp', name: 'Rob Kessler', role: 'PLAY_BY_PLAY', conf: 0.97 },
        { id: 'cc', name: 'Aaron Pike', role: 'COLOR_COMMENTATOR', conf: 0.95 },
      ],
      chapters: [['0:00', 'First half'], ['6:00', 'Second half']],
    },
    {
      id: 'v10', title: 'Elena Varga Press Conference — Asian Swing', sport: 'tennis', league: 'WTA', type: 'PRESS_CONFERENCE',
      duration: ts('7:00'), publishedH: -14, network: 'ESPN+', program: 'Tennis on ESPN+',
      teams: [], players: ['Elena Varga'], tags: ['injury', 'training'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [
        { id: 'pl', name: 'Elena Varga', role: 'PLAYER', conf: 0.96 },
        { id: 'rep', name: 'Reporter', role: 'REPORTER', conf: 0.6, possibly: 'Nora Blake' },
      ],
      chapters: [['0:00', 'Wrist'], ['2:30', 'Serve'], ['4:30', 'Schedule']],
    },
    {
      id: 'v11', title: 'Rangers vs Bruins — Preseason Highlights', sport: 'hockey', league: 'NHL', type: 'HIGHLIGHT',
      duration: ts('6:00'), publishedH: -36, network: 'ESPN+', program: 'NHL on ESPN',
      teams: ['New York Rangers', 'Boston Bruins'], players: [], tags: ['training'],
      rights: 'MARKET_RESTRICTED', transcriptStatus: 'ready',
      speakers: [{ id: 'pbp', name: 'Kyle Dorsey', role: 'PLAY_BY_PLAY', conf: 0.95 }],
      chapters: [['0:00', 'Period 1'], ['3:00', 'Period 2']],
    },
    {
      id: 'v12', title: 'SportsCenter: Weekend Injury Report', sport: 'football', league: 'NFL', type: 'STUDIO_SEGMENT',
      duration: ts('5:30'), publishedH: -6, network: 'ESPN', program: 'SportsCenter',
      teams: ['Kansas City Chiefs', 'New York Jets', 'New York Liberty'], players: ['Jalen Brooks', 'Tasha Greene'],
      tags: ['injury', 'roster'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [
        { id: 'host', name: 'Andrea Cole', role: 'STUDIO_HOST', conf: 0.97 },
        { id: 'rep', name: 'Kelly Shaw', role: 'REPORTER', conf: 0.95 },
      ],
      chapters: [['0:00', 'NFL'], ['3:30', 'WNBA']],
    },
    {
      id: 'vlive', title: 'LIVE — WNBA Semifinals Game 3: Liberty at Aces', sport: 'basketball', league: 'WNBA', type: 'LIVE_EVENT',
      duration: ts('2:15:00'), publishedH: -0.6, network: 'ESPN', program: 'WNBA Playoffs', live: true, liveEventId: 'e1',
      teams: ['New York Liberty', 'Las Vegas Aces'], players: ['Tasha Greene', 'Dana Pierce'], tags: ['playoffs'],
      rights: 'PLAYABLE', transcriptStatus: 'streaming',
      speakers: [
        { id: 'pbp', name: 'Lena Ortiz', role: 'PLAY_BY_PLAY', conf: 0.97 },
        { id: 'cc', name: 'Marcus Webb', role: 'COLOR_COMMENTATOR', conf: 0.93 },
        { id: 'sr', name: 'Priya Nair', role: 'REPORTER', conf: 0.9 },
      ],
      chapters: [['0:00:00', '1st Quarter'], ['0:30:00', '2nd Quarter']],
    },
  ];

  const TRANSCRIPTS = {
    v1: tr('v1', [
      ['0:02:10', 'pbp', "Welcome to Arrowhead. Bills and Chiefs, both 2-0, and the storyline all week has been Buffalo's rebuilt offensive line against this Kansas City pass rush.", { topic: 'storyline', sum: "Framed the game around Buffalo's rebuilt offensive line versus Kansas City's pass rush.", key: true }],
      ['0:14:45', 'cc', "Watch the right side. They're sliding protection to the left and leaving the right tackle on an island against the edge. That's going to be a problem all night if they don't chip.", { topic: 'pass protection', sum: "Warned that Buffalo's protection slide left the right tackle isolated against the edge rusher.", key: true, quote: true }],
      ['0:31:20', 'pbp', 'Reed on third and seven... throws it away. Kansas City goes three-and-out for the second straight drive.', { topic: 'offense' }],
      ['0:48:05', 'sr', "Chiefs trainers are looking at the left ankle of wide receiver Jalen Brooks. He's in the blue medical tent. Questionable to return.", { topic: 'injury', sum: 'Reported WR Jalen Brooks was evaluated for a left ankle injury; questionable to return.', key: true }],
      ['1:05:40', 'cc', "This is the adjustment. They've gone to a six-man protection with the running back staying in, and now the quarterback has time. That's coaching.", { topic: 'pass protection', sum: "Credited Buffalo's switch to six-man protection for giving the quarterback time.", key: true, quote: true }],
      ['1:22:10', 'pbp', "Halftime here at Arrowhead: Buffalo 17, Kansas City 10.", { topic: 'score' }],
      ['1:41:30', 'cc', "I don't love the red zone play-calling. Three straight fades? You've got a matchup nightmare at tight end and you're throwing fades.", { topic: 'red zone', sum: "Criticized Kansas City's red-zone play-calling, citing three straight fade routes.", key: true, quote: true }],
      ['1:52:00', 'ref', 'Holding, offense, number 74. Ten-yard penalty, repeat second down.', { topic: 'officiating', conf: 0.71 }],
      ['2:02:15', 'sr', 'Update on Jalen Brooks: he has been ruled out for the rest of the game with that ankle injury, per the team.', { topic: 'injury', sum: 'Reported Brooks was ruled out for the game with the ankle injury.', key: true }],
      ['2:19:50', 'cc', "The blitz is coming from the boundary and nobody's picking it up. The communication on that left side has broken down twice this quarter.", { topic: 'blitz pickup', sum: "Said Buffalo's left side failed to pick up boundary blitzes twice in the quarter." }],
      ['2:41:05', 'pbp', 'Touchdown Kansas City! Tie game at 24 with 3:12 to go.', { topic: 'score', sum: 'Kansas City tied the game 24-24 with 3:12 left.' }],
      ['2:58:30', 'cc', "Two-minute drill, and this is where the protection holds up. Six men in, clean pocket, and that's your late-game execution right there.", { topic: 'late-game execution', sum: "Said Buffalo's six-man protection held up on the game-winning two-minute drive.", key: true }],
      ['3:05:10', 'pbp', 'The kick is up... and it is good! Buffalo wins it, 27 to 24.', { topic: 'score', sum: 'Buffalo won 27-24 on a late field goal.', key: true }],
    ]),
    v2: tr('v2', [
      ['0:20', 'coach', "Proud of the way we responded in the second half. We made an adjustment in protection at the break and the guys executed it.", { topic: 'pass protection', sum: 'Credited a halftime protection adjustment for the second-half turnaround.', key: true, quote: true }],
      ['1:05', 'rep', 'Coach, what specifically changed with the protection?', { topic: 'pass protection', q: true }],
      ['1:12', 'coach', "We kept the back in more. We felt like they were overloading the boundary and we needed a sixth guy. Simple as that.", { topic: 'pass protection', sum: 'Explained keeping the running back in as a sixth blocker against boundary overloads.', key: true }],
      ['2:40', 'rep', 'Any update on the quarterback? He looked like he was favoring that right shoulder.', { topic: 'injury', q: true }],
      ['2:48', 'coach', "He's sore. We'll evaluate him tomorrow. I'm not going to speculate tonight.", { topic: 'injury', sum: 'Said the quarterback is sore and will be evaluated tomorrow; declined to speculate.', key: true, quote: true, nonAnswer: true }],
      ['4:09', 'coach', 'Defensively, the communication was outstanding. Nobody busted a coverage in the fourth quarter, and that is the whole game.', { topic: 'defense', sum: "Praised the defense's fourth-quarter communication — no busted coverages.", key: true }],
      ['5:18', 'rep', 'Is there any movement on the contract extension talks?', { topic: 'contract', q: true }],
      ['5:24', 'coach', "That's for another day. Tonight is about this team.", { topic: 'contract', sum: 'Declined to discuss the contract extension.', nonAnswer: true }],
      ['7:02', 'coach', 'Fatigue was real out there. It was hot and we rotated the D-line more than usual to keep guys fresh late.', { topic: 'fatigue', sum: 'Said heat-related fatigue led to a heavier defensive-line rotation.', key: true }],
      ['9:30', 'coach', "Next week is a short week, Thursday night. Recovery starts tonight.", { topic: 'schedule', sum: 'Noted a short week before Thursday night; recovery is the priority.', future: true }],
    ]),
    v3: tr('v3', [
      ['0:03:30', 'pbp', "Aces lead the series one-nothing, and the question after Game 1 was New York's defensive rebounding. They gave up fourteen offensive boards.", { topic: 'defensive rebounding', sum: 'Framed the game around New York allowing 14 offensive rebounds in Game 1.', key: true }],
      ['0:18:42', 'cc', "There it is again. Weak-side guard doesn't crash down, long rebound, second-chance points. That's exactly what hurt them in Game 1.", { topic: 'defensive rebounding', sum: 'Said weak-side guards were failing to crash down on long rebounds.', key: true, quote: true }],
      ['0:27:15', 'cc', "Transition defense is actually much better tonight. They're getting two back on every shot.", { topic: 'transition defense', sum: 'Noted improved transition defense, with two players getting back on every shot.', key: true }],
      ['0:39:11', 'cc', "Another offensive rebound for Las Vegas. That's five in the quarter. You cannot win a playoff game like this.", { topic: 'defensive rebounding', sum: 'Flagged five Las Vegas offensive rebounds in the quarter.' }],
      ['0:44:21', 'cc', "Big change coming out of halftime: they're switching the pick-and-roll instead of dropping. Takes away the pull-up.", { topic: 'pick-and-roll coverage', sum: "Highlighted New York's post-halftime move from drop to switching pick-and-roll coverage.", key: true, quote: true }],
      ['0:51:06', 'cc', "And now the rebounding is fixed because the bigs aren't stuck at the level. Switching solves two problems.", { topic: 'defensive rebounding', sum: 'Argued switching also fixed rebounding by keeping bigs near the rim.', key: true }],
      ['0:58:40', 'sr', "I talked to Coach Dana Pierce at the half. She said, 'We have to finish possessions. We're doing the hard part and giving it back on the glass.'", { topic: 'coaching', sum: "Relayed Coach Pierce's halftime comment about finishing possessions on the glass.", key: true }],
      ['1:03:17', 'cc', 'I question the second-unit spacing. Two non-shooters on the floor together and the paint is packed.', { topic: 'rotation', sum: 'Questioned second-unit spacing with two non-shooters on the floor.', key: true, quote: true }],
      ['1:28:30', 'cc', "Fourth-quarter rotation: Pierce goes back to the starters with eight minutes left. Earlier than usual, and I like it.", { topic: 'fourth-quarter rotations', sum: 'Noted the coach reinserted starters with eight minutes left, earlier than usual.', key: true }],
      ['1:40:00', 'cc', "You can see the legs going for Vegas. Third game in five days and the jumpers are coming up short.", { topic: 'fatigue', sum: 'Pointed to Las Vegas fatigue — third game in five days, jumpers coming up short.' }],
      ['1:52:10', 'pbp', 'Liberty win it 84-79 and this series is tied at one.', { topic: 'score', sum: 'New York won 84-79 to tie the series 1-1.', key: true }],
    ]),
    v4: tr('v4', [
      ['0:15', 'rep', 'Tasha, rebounding was the talk after Game 1. What was the message tonight?', { topic: 'defensive rebounding', q: true }],
      ['0:22', 'pl', 'Everybody hit somebody. Coach showed us the film, fourteen offensive rebounds, and that was embarrassing for us. We took it personal.', { topic: 'defensive rebounding', sum: "Said the team took Game 1's 14 offensive rebounds personally after film review.", key: true, quote: true }],
      ['1:30', 'rep', 'The move to switching on the pick-and-roll — how did that feel on the floor?', { topic: 'pick-and-roll coverage', q: true }],
      ['1:38', 'pl', "It felt good. We're long, we can switch one through four, and it kept us out of rotation.", { topic: 'pick-and-roll coverage', sum: "Said the team's length makes switching one through four comfortable.", key: true }],
      ['2:50', 'rep', 'You played 38 minutes tonight. How are the legs?', { topic: 'fatigue', q: true }],
      ['2:57', 'pl', "Tired, honestly. But it's the playoffs. Ice bath, sleep, and we go again.", { topic: 'fatigue', sum: 'Acknowledged fatigue after 38 minutes; focused on recovery.', key: true, quote: true }],
      ['4:20', 'pl', "Their guards are going to come out aggressive in Game 3. We have to be ready for that from the jump.", { topic: 'game preview', sum: 'Expects an aggressive start from Las Vegas guards in Game 3.', future: true }],
    ]),
    v5: tr('v5', [
      ['0:10', 'host', 'The Jets are 0-3 and the quarterback situation is the story. Greg, Devin — is it time to make a change?', { topic: 'quarterback situation', sum: 'Set up the debate over whether the Jets should change quarterbacks after an 0-3 start.', key: true }],
      ['0:45', 'a1', "It's time. The starter is holding the ball 3.1 seconds on average. You can't live like that behind this offensive line.", { topic: 'quarterback situation', sum: 'Argued it is time for a QB change, citing a 3.1-second average time to throw.', key: true, quote: true, debate: 'For a change' }],
      ['2:05', 'a2', "I disagree completely. Look at the drops — six drops in three games. The quarterback isn't the problem, the receivers are.", { topic: 'quarterback situation', sum: 'Disagreed, blaming six receiver drops rather than the quarterback.', key: true, quote: true, debate: 'Against a change' }],
      ['3:30', 'a1', "The backup ran the scout-team offense all week and the defense couldn't stop him. People inside that building are talking.", { topic: 'quarterback situation', sum: 'Said the backup has impressed in practice and there is internal discussion.', debate: 'For a change' }],
      ['4:48', 'a2', "Benching him now tells the locker room you've quit on the season. That's a head coach decision with long consequences.", { topic: 'quarterback situation', sum: 'Warned that a benching would signal quitting on the season.', debate: 'Against a change' }],
      ['6:10', 'host', 'Our reporting: the team has not made a decision, and the head coach said Monday the starter remains the starter this week.', { topic: 'quarterback situation', sum: 'Reported no decision has been made; the head coach said Monday the starter remains the starter.', key: true }],
      ['7:40', 'a1', 'Mark it down. By Week 6 there is a change.', { topic: 'prediction', sum: 'Predicted a quarterback change by Week 6.', debate: 'For a change', future: true }],
      ['8:30', 'a2', "And I'll say they're 3-3 by Week 6 with the same guy under center.", { topic: 'prediction', sum: 'Predicted a 3-3 record by Week 6 with the same starter.', debate: 'Against a change', future: true }],
    ]),
    v6: tr('v6', [
      ['0:30', 'pbp', 'Division on the line in San Diego. Dodgers lead the West by two with five to play.', { topic: 'storyline', sum: 'Framed the game as a division race: Dodgers up two with five to play.', key: true }],
      ['3:15', 'cc', "He's living on the slider tonight — sixty percent sliders through three. Hitters haven't adjusted.", { topic: 'pitching', sum: 'Noted the Dodgers starter threw 60% sliders through three innings.', key: true, quote: true }],
      ['7:40', 'cc', "Padres finally sitting on the slider. See the approach change — they're spitting on the ones below the zone.", { topic: 'hitting', sum: 'Said Padres hitters adjusted by laying off sliders below the zone.', key: true }],
      ['11:05', 'pbp', 'Three-run homer! Padres lead 4-2 in the sixth.', { topic: 'score', sum: 'Padres took a 4-2 lead on a sixth-inning three-run homer.', key: true }],
      ['14:20', 'cc', 'Bullpen usage here is interesting. Bringing the closer in for the eighth — that is a playoff move in September.', { topic: 'bullpen', sum: 'Called the eighth-inning closer usage a playoff-style move.', key: true, quote: true }],
      ['18:50', 'pbp', 'Final: Padres 5, Dodgers 3. The lead in the West is down to one.', { topic: 'score', sum: 'Padres won 5-3; the Dodgers division lead shrank to one game.', key: true }],
      ['20:30', 'cc', 'That bullpen has thrown a lot of innings this month. You worry about fatigue in October.', { topic: 'fatigue', sum: 'Raised concern about Padres bullpen fatigue heading into October.' }],
    ]),
    v7: tr('v7', [
      ['0:20', 'pbp', 'Bernabéu under the lights. Madrid unbeaten, Sevilla looking to bounce back.', { topic: 'storyline' }],
      ['1:40', 'an', "Sevilla are pressing in a 4-4-2 and forcing everything wide. Madrid can't play through the middle.", { topic: 'tactics', sum: "Said Sevilla's 4-4-2 press forced Madrid wide and cut off central build-up.", key: true }],
      ['3:05', 'pbp', 'Goal! A header from the corner and Madrid lead 1-0.', { topic: 'score', sum: 'Madrid scored first from a corner-kick header.', key: true }],
      ['4:30', 'an', 'The change to a back three at half — suddenly the wing-backs have space and Madrid can breathe.', { topic: 'tactics', sum: "Credited Madrid's halftime switch to a back three for freeing the wing-backs.", key: true, quote: true }],
      ['6:10', 'pbp', 'Sevilla level it in the 88th minute! Stunned silence at the Bernabéu.', { topic: 'score', sum: 'Sevilla equalized in the 88th minute.', key: true }],
      ['7:20', 'an', 'The VAR check on the handball was right. Arm is well away from the body.', { topic: 'officiating', sum: 'Agreed with the VAR handball decision.', key: true }],
    ]),
    v9: tr('v9', [
      ['0:40', 'pbp', 'A top-five showdown between the hedges tonight.', { topic: 'storyline' }],
      ['3:20', 'cc', "Alabama's running the ball right at them and it's working. Georgia's linebackers are flowing too fast.", { topic: 'run defense', sum: "Said Georgia's linebackers were overpursuing against Alabama's downhill run game.", key: true }],
      ['8:45', 'cc', 'Fourth-down aggressiveness from Georgia — going for it at midfield. That is a statement.', { topic: 'coaching', sum: "Praised Georgia's aggressive fourth-down call at midfield.", key: true, quote: true }],
      ['11:10', 'pbp', 'Intercepted! Georgia seals it, 31-28.', { topic: 'score', sum: 'Georgia sealed a 31-28 win with a late interception.', key: true }],
    ]),
    v10: tr('v10', [
      ['0:12', 'rep', 'Elena, how is the wrist feeling after the retirement last week?', { topic: 'injury', q: true }],
      ['0:20', 'pl', "Much better. We did scans, nothing structural. It's inflammation, and we manage it with tape and fewer practice hours.", { topic: 'injury', sum: 'Said scans on her wrist showed nothing structural; managing inflammation.', key: true, quote: true }],
      ['2:30', 'rep', 'You changed your service motion this summer. Why?', { topic: 'serve', q: true }],
      ['2:38', 'pl', 'Less stress on the wrist, more legs. The first-serve percentage is up and I feel I can hit spots.', { topic: 'serve', sum: 'Explained a new service motion that reduces wrist stress and improved first-serve percentage.', key: true }],
      ['4:30', 'pl', "Fatigue is a question. Four tournaments in five weeks is a lot, so I'm not promising I play all of them.", { topic: 'fatigue', sum: 'Would not commit to playing all four upcoming tournaments due to fatigue.', key: true, future: true }],
    ]),
    v11: tr('v11', [
      ['0:30', 'pbp', 'Preseason hockey at the Garden, lines still being sorted out.', { topic: 'storyline' }],
      ['3:40', 'pbp', 'Power play goal, and the new top unit clicks on its first try.', { topic: 'power play', sum: 'The new top power-play unit scored on its first opportunity.', key: true }],
    ]),
    v12: tr('v12', [
      ['0:15', 'host', "Let's run through the injury news from around the league, starting in Kansas City.", { topic: 'injury' }],
      ['0:30', 'rep', "Chiefs receiver Jalen Brooks had an MRI on that left ankle. I'm told it's a high-ankle sprain and he's considered week-to-week.", { topic: 'injury', sum: 'Reported Jalen Brooks has a high-ankle sprain and is week-to-week, per her sources.', key: true, quote: true }],
      ['1:50', 'rep', 'In New York, the Jets say the starting quarterback took every first-team rep today.', { topic: 'quarterback situation', sum: 'Reported the Jets starter took all first-team reps in practice.', key: true }],
      ['3:40', 'host', "And in the WNBA, the Liberty list Tasha Greene as probable with lower-leg soreness for Game 3.", { topic: 'injury', sum: 'Said Tasha Greene is listed probable for Game 3 with lower-leg soreness.', key: true }],
    ]),
    vlive: tr('vlive', [
      ['0:01:30', 'pbp', 'Game 3, series tied at one, and a sold-out crowd in Las Vegas.', { topic: 'storyline', sum: 'Framed Game 3 with the series tied 1-1.', key: true }],
      ['0:09:10', 'cc', "Vegas is attacking the switch early — they're hunting the smaller guard on every possession.", { topic: 'pick-and-roll coverage', sum: 'Said Las Vegas is targeting switches to attack the smaller guard.', key: true }],
      ['0:17:40', 'sr', 'Tasha Greene is moving well — no sign of that lower-leg soreness she was listed with.', { topic: 'injury', sum: 'Reported Tasha Greene appears unaffected by her lower-leg soreness.', key: true }],
      ['0:26:05', 'cc', "Liberty are crashing the defensive glass with all five. Totally different from Game 1.", { topic: 'defensive rebounding', sum: 'Said New York is crashing the defensive glass with all five players.', key: true, quote: true }],
      ['0:34:50', 'cc', 'Second unit in, and the spacing is better — they put a shooter at the four.', { topic: 'rotation', sum: 'Noted improved second-unit spacing with a shooter at power forward.' }],
      ['0:43:20', 'pbp', 'Aces go on an 8-0 run and Pierce has to call timeout.', { topic: 'score' }],
      ['0:52:10', 'cc', 'Transition defense is slipping — Vegas has eleven fast-break points already.', { topic: 'transition defense', sum: 'Flagged 11 Las Vegas fast-break points as transition defense slips.', key: true }],
      ['1:01:30', 'sr', "Coach Pierce at the half: 'We have to get back. Our transition defense is giving them life.'", { topic: 'coaching', sum: "Relayed Coach Pierce's halftime call to fix transition defense.", key: true }],
      ['1:10:40', 'cc', 'Out of the break, the Liberty are back in the drop on pick-and-roll. Interesting reversal.', { topic: 'pick-and-roll coverage', sum: 'Noted New York reverted to drop coverage after halftime.', key: true }],
      ['1:20:00', 'pbp', 'Greene from the corner — good! Liberty back within two.', { topic: 'score' }],
    ]),
  };

  // Pool of videos that appear on "Refresh ESPN Now" (PRD §23)
  const REFRESH_POOL = [
    {
      id: 'r1', title: 'Jalen Brooks MRI Update — NFL Live', sport: 'football', league: 'NFL', type: 'NEWS_UPDATE', duration: ts('2:40'), network: 'ESPN', program: 'NFL Live',
      teams: ['Kansas City Chiefs'], players: ['Jalen Brooks'], tags: ['injury'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [{ id: 'rep', name: 'Kelly Shaw', role: 'REPORTER', conf: 0.96 }], chapters: [['0:00', 'Update']],
      assign: { priority: 'P1', dueH: 20 },
      transcript: [['0:10', 'rep', "Update on Jalen Brooks: the Chiefs now expect him to miss two to three weeks with the high-ankle sprain.", { topic: 'injury', sum: 'Reported Brooks is now expected to miss two to three weeks.', key: true, quote: true }],
        ['1:20', 'rep', 'Kansas City is expected to elevate a receiver from the practice squad for Thursday.', { topic: 'roster', sum: 'Reported KC expects to elevate a practice-squad receiver.', key: true }]],
    },
    {
      id: 'r2', title: 'Georgia Coach Postgame Press Conference', sport: 'football', league: 'NCAA Football', type: 'PRESS_CONFERENCE', duration: ts('9:10'), network: 'ESPN+', program: 'College Football Postgame',
      teams: ['Georgia Bulldogs'], players: ['Wes Harlan'], tags: ['coaching', 'strategy'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [{ id: 'coach', name: 'Wes Harlan', role: 'COACH', conf: 0.95 }, { id: 'rep', name: 'Reporter', role: 'REPORTER', conf: 0.58, possibly: 'Tom Ruiz' }], chapters: [['0:00', 'Opening']],
      transcript: [['0:15', 'coach', 'We went for it on fourth down because I trust our line. That was never a hard decision.', { topic: 'coaching', sum: 'Said the fourth-down decision reflected trust in the offensive line.', key: true, quote: true }],
        ['2:40', 'rep', 'Your linebackers struggled against the run early. What changed?', { topic: 'run defense', q: true }],
        ['2:48', 'coach', 'We stopped overpursuing. Stay square, fit your gap, let the ball come to you.', { topic: 'run defense', sum: 'Said the fix against the run was to stop overpursuing and fit gaps.', key: true }]],
    },
    {
      id: 'r3', title: 'Padres Manager Postgame Interview', sport: 'baseball', league: 'MLB', type: 'INTERVIEW', duration: ts('4:30'), network: 'ESPN', program: 'Baseball Tonight',
      teams: ['San Diego Padres'], players: ['Luis Ortega'], tags: ['postseason', 'strategy'], rights: 'PLAYABLE', transcriptStatus: 'ready',
      speakers: [{ id: 'mgr', name: 'Luis Ortega', role: 'COACH', conf: 0.94 }, { id: 'rep', name: 'Chris Lam', role: 'REPORTER', conf: 0.93 }], chapters: [['0:00', 'Interview']],
      transcript: [['0:20', 'rep', 'Why go to the closer in the eighth?', { topic: 'bullpen', q: true }],
        ['0:26', 'mgr', 'Their best hitters were due up. In September you manage like it is October.', { topic: 'bullpen', sum: 'Said he used the closer in the eighth because the top of the order was due up.', key: true, quote: true }],
        ['2:10', 'mgr', "The bullpen is tired, I won't lie to you. We need length from our starters this week.", { topic: 'fatigue', sum: 'Acknowledged bullpen fatigue and asked for length from starters.', key: true }]],
    },
    {
      id: 'r4', title: 'Bundesliga Tactical Breakdown: Pressing Traps', sport: 'soccer', league: 'Bundesliga', type: 'FILM_BREAKDOWN', duration: ts('6:15'), network: 'ESPN+', program: 'ESPN FC',
      teams: [], players: [], tags: ['tactics'], rights: 'PLAYABLE', transcriptStatus: 'processing', speakers: [], chapters: [['0:00', 'Breakdown']],
    },
  ];

  // Transcripts still processing at load; the first "Refresh ESPN Now" marks them ready.
  const PENDING_TRANSCRIPTS = {
    v8: {
      speakers: [
        { id: 'pbp', name: 'Holly Grant', role: 'PLAY_BY_PLAY', conf: 0.96 },
        { id: 'an', name: 'Martin Kowal', role: 'ANALYST', conf: 0.95 },
        { id: 'rep', name: 'Pit lane reporter', role: 'REPORTER', conf: 0.62, possibly: 'Jess Adeyemi' },
      ],
      rows: [
        ['0:03:10', 'an', 'Track evolution is huge today. Whoever runs last in each session has a real advantage.', { topic: 'strategy', sum: 'Said heavy track evolution favors drivers who run last in each session.', key: true }],
        ['0:21:40', 'rep', 'The team tells me it was a gearbox sensor issue, not a driver error. They expect to make Q2.', { topic: 'reliability', sum: 'Reported a gearbox sensor issue, not driver error; team expected to make Q2.', key: true }],
        ['0:38:05', 'an', 'Look at the tire choice — they are saving a set of softs for tomorrow. That is a race-strategy decision.', { topic: 'tire strategy', sum: 'Noted a team saving soft tires for the race, prioritizing race strategy over grid slot.', key: true, quote: true }],
        ['0:58:20', 'pbp', 'Pole position by just four hundredths of a second!', { topic: 'score', sum: 'Pole position decided by four hundredths of a second.', key: true }],
      ],
    },
  };

  // --- Live events (PRD §10, §47) --------------------------------------------
  const LIVE_EVENTS = [
    { id: 'e1', sport: 'basketball', league: 'WNBA', status: 'LIVE', away: { abbr: 'NY', name: 'Liberty', score: 58 }, home: { abbr: 'LV', name: 'Aces', score: 61 }, period: 'Q3', clock: 412, network: 'ESPN', videoId: 'vlive', assigned: true },
    { id: 'e2', sport: 'football', league: 'NCAA Football', status: 'LIVE', away: { abbr: 'LSU', name: 'LSU', score: 17 }, home: { abbr: 'MISS', name: 'Ole Miss', score: 20 }, period: 'Q3', clock: 318, network: 'ABC' },
    { id: 'e3', sport: 'baseball', league: 'MLB', status: 'LIVE', away: { abbr: 'NYY', name: 'Yankees', score: 3 }, home: { abbr: 'BAL', name: 'Orioles', score: 2 }, period: 'Top 7', clock: null, network: 'ESPN2' },
    { id: 'e4', sport: 'soccer', league: 'LALIGA', status: 'LIVE', away: { abbr: 'VIL', name: 'Villarreal', score: 1 }, home: { abbr: 'BAR', name: 'Barcelona', score: 2 }, period: "67'", clock: 67 * 60, clockUp: true, network: 'ESPN+' },
    { id: 'e5', sport: 'tennis', league: 'WTA', status: 'LIVE', away: { abbr: 'KIM', name: 'J. Kim', score: 1 }, home: { abbr: 'VAR', name: 'E. Varga', score: 1 }, period: 'Set 3', detail: '4–3', clock: null, network: 'ESPN+' },
    { id: 'e6', sport: 'hockey', league: 'NHL', status: 'HALFTIME', away: { abbr: 'NYR', name: 'Rangers', score: 1 }, home: { abbr: 'BOS', name: 'Bruins', score: 1 }, period: '2nd Int', clock: null, network: 'ESPN+' },
    { id: 'e7', sport: 'mma', league: 'Professional Fighters League', status: 'PRE_GAME', away: { abbr: '', name: 'PFL Playoffs: Main Card', score: null }, home: null, period: 'Starts 9:00 PM', clock: null, network: 'ESPN2' },
    { id: 'e8', sport: 'football', league: 'NCAA Football', status: 'FINAL', away: { abbr: 'ALA', name: 'Alabama', score: 28 }, home: { abbr: 'UGA', name: 'Georgia', score: 31 }, period: 'Final', clock: null, network: 'ABC', videoId: 'v9', replay: true },
  ];

  // --- Assignments (PRD §12) --------------------------------------------------
  // dueH relative to now; progress 0..1
  const ASSIGNMENTS = [
    { id: 'a1', videoId: 'v1', assignedBy: 'Jordan Pike (NFL Desk)', assignedH: -48, dueH: 5, priority: 'P0', status: 'IN_PROGRESS', progress: 0.52, summaryRequired: true },
    { id: 'a2', videoId: 'v2', assignedBy: 'Jordan Pike (NFL Desk)', assignedH: -26, dueH: 3, priority: 'P1', status: 'ASSIGNED', progress: 0, summaryRequired: true },
    { id: 'a3', videoId: 'v3', assignedBy: 'Renee Wu (Basketball)', assignedH: -60, dueH: -2, priority: 'P0', status: 'IN_PROGRESS', progress: 0.3, summaryRequired: true },
    { id: 'a4', videoId: 'v4', assignedBy: 'Renee Wu (Basketball)', assignedH: -40, dueH: 26, priority: 'P1', status: 'ASSIGNED', progress: 0, summaryRequired: false },
    { id: 'a5', videoId: 'v5', assignedBy: 'Jordan Pike (NFL Desk)', assignedH: -20, dueH: 50, priority: 'P1', status: 'WATCHED', progress: 1, summaryRequired: true },
    { id: 'a6', videoId: 'v6', assignedBy: 'Marco Diaz (MLB)', assignedH: -18, dueH: 28, priority: 'P2', status: 'SUMMARIZED', progress: 1, summaryRequired: true },
    { id: 'a7', videoId: 'v7', assignedBy: 'Ana Lopes (Soccer)', assignedH: -70, dueH: -20, priority: 'P2', status: 'COMPLETE', progress: 1, summaryRequired: false },
    { id: 'a8', videoId: 'v8', assignedBy: 'Ana Lopes (Motor)', assignedH: -8, dueH: 72, priority: 'P3', status: 'ASSIGNED', progress: 0, summaryRequired: false },
    { id: 'a9', videoId: 'v9', assignedBy: 'Jordan Pike (CFB)', assignedH: -72, dueH: -30, priority: 'P2', status: 'COMPLETE', progress: 1, summaryRequired: false },
    { id: 'a10', videoId: 'v10', assignedBy: 'Nia Brooks (Tennis)', assignedH: -14, dueH: 30, priority: 'P2', status: 'QUEUED', progress: 0, summaryRequired: true },
    { id: 'a11', videoId: 'v11', assignedBy: 'Marco Diaz (NHL)', assignedH: -36, dueH: 96, priority: 'P3', status: 'BLOCKED', progress: 0, summaryRequired: false, blockedReason: 'Playback market-restricted' },
    { id: 'a12', videoId: 'v12', assignedBy: 'Jordan Pike (NFL Desk)', assignedH: -6, dueH: -1, priority: 'P1', status: 'COMPLETE', progress: 1, summaryRequired: false },
    { id: 'a13', videoId: 'vlive', assignedBy: 'Renee Wu (Basketball)', assignedH: -3, dueH: 4, priority: 'P0', status: 'ASSIGNED', progress: 0, summaryRequired: true },
  ];

  window.DESK_DATA = { H, SPORTS, CONTENT_TYPES, BROADCAST_ROLES, INTERVIEWEE_ROLES, VIDEOS, TRANSCRIPTS, PENDING_TRANSCRIPTS, REFRESH_POOL, LIVE_EVENTS, ASSIGNMENTS, ts, tr };
})();
