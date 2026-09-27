export const CAP = 180;
export const POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
export const BAT_TRAITS = ['contact', 'power', 'eye', 'speed'];
export const PITCH_TRAITS = ['velocity', 'spin', 'control'];

const first = ['Biscuit','Bongo','Brick','Bubbles','Cactus','Chowder','Cricket','Dingo','Doodle','Fuzzy','Gumbo','Hiccup','Jellybean','Lunchbox','Mango','Mittens','Mookie','Noodle','Pickles','Pogo','Scooter','Skippy','Sprout','Tater','Tofu','Waffles','Wiggles','Ziggy'];
const last = ['Backflip','Beanbag','Bumbershoot','Crankshaft','Dingus','Flapjack','Foghorn','Gingersnap','Gravyboat','Hammock','Hatstand','Hootenanny','Jamboree','Kazoo','McSneeze','Moonboots','Noodlearm','Pants','Peppercorn','Picklejar','Puddles','Rutabaga','Sidecar','Socks','Spatula','Teacup','Wobble'];
const cities = ['Baltimore','Boston','Brooklyn','Chicago','Cleveland','Detroit','Denver','Houston','Kansas City','Las Vegas','Los Angeles','Miami','Milwaukee','Nashville','New Orleans','New York','Oakland','Philadelphia','Portland','Seattle'];
const mascots = ['Moonshots','Mud Hens','Night Owls','Pickles','Hot Dogs','Thunderbats','Trash Pandas','Sidewinders','Sasquatches','Comets','Jackalopes','Buzzards','Fireflies','River Rats','Gold Sox','Pelicans','Biscuit Kings','Mammoths','Gremlins','Rockets'];
const marks = ['🌙','🐔','🦉','🥒','🌭','🦇','🦝','🐍','🦶','☄️','🐇','🦅','✨','🐀','🧦','🐦','🍪','🦣','👹','🚀'];
const palettes = [
  ['#ff6b35','#20205b'],['#f2c14e','#284b63'],['#a96cff','#18152f'],['#78d64b','#173f2a'],['#ff5d8f','#57213b'],
  ['#64a8ff','#202f57'],['#f08a4b','#49312a'],['#b8dd54','#244b37'],['#f2d46f','#4a361d'],['#be8cff','#35235d'],
  ['#ff9f68','#542a32'],['#d96478','#301d3f'],['#f4e75d','#253f42'],['#55b7a5','#263748'],['#e6b84f','#3d2461'],
  ['#59b9e8','#153854'],['#df9b50','#512e1e'],['#87a8c7','#273442'],['#8cd75b','#3b2057'],['#ff734f','#173d61']
];

export const teamNames = cities.map((city, i) => ({ city, name: mascots[i], mark: marks[i], colors: palettes[i] }));

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = a => a[rand(0, a.length - 1)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function sillyName() { return `${pick(first)} ${pick(last)}`; }

export function makePlayer(role, position, teamId, rookie = false) {
  const age = rookie ? rand(19, 22) : rand(21, 35);
  const isPitcher = role === 'SP' || role === 'RP';
  const base = rookie ? rand(43, 65) : rand(48, 82);
  const player = {
    id: uid(), name: sillyName(), age, role, position: position || role,
    secondary: !isPitcher && Math.random() < .22 ? [pick(POSITIONS.filter(p => p !== position))] : [],
    bats: Math.random() < .28 ? 'L' : 'R', throws: Math.random() < .24 ? 'L' : 'R',
    teamId, salary: rookie ? rand(2, 5) : rand(4, 15), tenure: teamId == null ? 0 : rand(1, 4),
    originTeamId: teamId, draftedYear: null, draftPick: null, previousTeams: [], championships: 0,
    form: 'neutral', formGames: 0, development: 0, careerSeasons: Math.max(0, age - 20),
    stats: { g: 0, pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, r: 0, rbi: 0, bb: 0, so: 0, ipOuts: 0, er: 0, hitsAllowed: 0, bbAllowed: 0, k: 0, wins: 0 },
  };
  const traits = isPitcher ? PITCH_TRAITS : BAT_TRAITS;
  traits.forEach((t, i) => {
    const current = clamp(base + rand(-10, 10) + (i === 0 ? 2 : 0), 30, 92);
    player[t] = current;
    player[`${t}Pot`] = clamp(current + rand(rookie ? 10 : 3, rookie ? 30 : 20) - Math.max(0, age - 29) * 2, current, 99);
  });
  if (rookie && Math.random() < .42) {
    const wild = isPitcher
      ? pick([
          { id:'wild-fire', name:'Wildfire Arm', note:'Huge velocity, frightening control.', up:'velocity', down:'control' },
          { id:'witch-curve', name:'Witch Curve', note:'Impossible spin, modest velocity.', up:'spin', down:'velocity' },
          { id:'paint-bot', name:'Paint Bot', note:'Elite control, very hittable mistakes.', up:'control', down:'spin' }
        ])
      : pick([
          { id:'moon-or-bust', name:'Moonshot or Bust', note:'Monster power, tiny contact zone.', up:'power', down:'contact' },
          { id:'road-runner', name:'Road Runner', note:'Absurd speed, almost no power.', up:'speed', down:'power' },
          { id:'walk-goblin', name:'Walk Goblin', note:'Elite eye, raw contact skills.', up:'eye', down:'contact' }
        ]);
    player[wild.up] = clamp(player[wild.up] + rand(18,26), 30, 96);
    player[wild.down] = clamp(player[wild.down] - rand(14,22), 22, 92);
    player[`${wild.up}Pot`] = clamp(Math.max(player[`${wild.up}Pot`], player[wild.up] + rand(2,8)), player[wild.up], 99);
    player[`${wild.down}Pot`] = clamp(Math.max(player[wild.down], player[`${wild.down}Pot`] - rand(4,10)), player[wild.down], 99);
    player.wildCard = wild;
  }
  return player;
}

function rosterFor(teamId) {
  const roster = [];
  for (let i = 0; i < 4; i++) roster.push(makePlayer('SP', 'SP', teamId));
  for (let i = 0; i < 4; i++) roster.push(makePlayer('RP', 'RP', teamId));
  POSITIONS.forEach(pos => roster.push(makePlayer('BAT', pos, teamId)));
  for (let i = 0; i < 4; i++) roster.push(makePlayer('BAT', pick(POSITIONS), teamId));
  return roster;
}

function payroll(roster) { return roster.reduce((sum, p) => sum + p.salary, 0); }

export function makeLeague() {
  const teams = teamNames.map((t, i) => {
    let roster = rosterFor(i);
    while (payroll(roster) > CAP - 12) {
      const rich = [...roster].sort((a,b) => b.salary-a.salary)[0];
      rich.salary = Math.max(2, rich.salary - 2);
    }
    return {
      id: i, ...t, league: i < 10 ? 'Circuit A' : 'Circuit B', roster,
      wins: 0, losses: 0, runsFor: 0, runsAgainst: 0,
      history: { championships: 0, playoffs: 0, best: null }, rivalId: i < 10 ? (i + 5) % 10 : 10 + ((i - 10 + 5) % 10)
    };
  });
  const freeAgents = [];
  for (let i = 0; i < 18; i++) freeAgents.push(makePlayer(i < 4 ? 'SP' : i < 8 ? 'RP' : 'BAT', i < 8 ? undefined : pick(POSITIONS), null));
  return { teams, freeAgents };
}

export function teamPayroll(team) { return payroll(team.roster); }
export function rating(player) {
  const traits = player.role === 'BAT' ? BAT_TRAITS : PITCH_TRAITS;
  return Math.round(traits.reduce((s,t) => s + player[t], 0) / traits.length);
}
export function potential(player) {
  const traits = player.role === 'BAT' ? BAT_TRAITS : PITCH_TRAITS;
  return Math.round(traits.reduce((s,t) => s + player[`${t}Pot`], 0) / traits.length);
}
export function fullTeamName(team) { return `${team.city} ${team.name}`; }

export function scheduleFor(teamId, teams) {
  const team = teams[teamId];
  const same = teams.filter(t => t.league === team.league && t.id !== teamId).sort(() => Math.random()-.5).slice(0,4);
  const other = teams.filter(t => t.league !== team.league).sort(() => Math.random()-.5).slice(0,4);
  const schedule=[...same, ...other].sort(() => Math.random()-.5).map((t, i) => ({ opponentId: t.id, games: 4, played: 0, userWins:0, home: i % 2 === 0 }));
  const bossIndex=2+rand(0,4),boss=pick([
    {id:'wall',name:'THE WALL',note:'Every opposing pitcher gains spin and control.',reward:'golden-lunchbox'},
    {id:'track',name:'THE TRACK MEET',note:'Every opposing runner gains terrifying speed.',reward:'possessed-cleats'},
    {id:'launchers',name:'THE MOON LAUNCHERS',note:'Every opposing batter swings with colossal power.',reward:'corked-bat'},
    {id:'old-gods',name:'THE OLD GODS',note:'Their veterans play like legends for four games.',reward:'illegal-curve'}
  ]);
  schedule[bossIndex].boss=boss;
  return schedule;
}

export function validRoster(team) {
  return team.roster.length === 20 && team.roster.filter(p=>p.role==='SP').length===4 && team.roster.filter(p=>p.role==='RP').length===4 && team.roster.filter(p=>p.role==='BAT').length===12 && teamPayroll(team) <= CAP;
}

export function bestLineup(team, versus = 'R') {
  const batters = team.roster.filter(p => p.role === 'BAT');
  const used = new Set();
  const slots = POSITIONS.map(pos => {
    const primary = batters.filter(p => !used.has(p.id) && p.position === pos);
    const secondary = batters.filter(p => !used.has(p.id) && p.secondary.includes(pos));
    const eligible = primary.length ? primary : secondary;
    const chosen = [...eligible].sort((a,b) => rating(b)-rating(a))[0];
    if (chosen) used.add(chosen.id);
    return { position: pos, playerId: chosen?.id };
  });
  const dh = [...batters].filter(p => !used.has(p.id)).sort((a,b)=>(b.contact+b.power+b.eye)-(a.contact+a.power+a.eye))[0];
  if (dh) used.add(dh.id);
  slots.push({ position: 'DH', playerId: dh?.id });
  return slots.sort((a,b) => {
    const pa = team.roster.find(p=>p.id===a.playerId), pb = team.roster.find(p=>p.id===b.playerId);
    return ((pb?.contact||0)+(pb?.eye||0)+(pb?.speed||0)*.4)-((pa?.contact||0)+(pa?.eye||0)+(pa?.speed||0)*.4);
  });
}

export function chooseCandidates(team, mode) {
  return [...team.roster].map(p => {
    const traits = p.role === 'BAT' ? BAT_TRAITS : PITCH_TRAITS;
    const trait = pick(traits);
    const gap = p[`${trait}Pot`] - p[trait];
    const weight = mode === 'develop' ? gap * 2 + Math.max(0, 31-p.age)*3 : Math.max(0,p.age-27)*5 + Math.max(0, 5-p.development);
    return { playerId: p.id, trait, weight: weight + Math.random()*30 };
  }).sort((a,b)=>b.weight-a.weight).slice(0,4);
}

export const philosophies = [
  { id:'balanced', name:'Steady Hands', icon:'◎', benefit:'No modifiers. Build your way.', drawback:'No specialty bonus.' },
  { id:'mash', name:'Mash Everything', icon:'◆', benefit:'Power development gains +25%.', drawback:'Speed development costs more.' },
  { id:'chaos', name:'Chaos on the Bases', icon:'↗', benefit:'Speed is more effective.', drawback:'Power development gains less.' },
  { id:'control', name:'Nothing Is Free', icon:'⊘', benefit:'Control development gains +25%.', drawback:'Pitchers fatigue faster.' },
  { id:'youth', name:'Youth Movement', icon:'✦', benefit:'Players under 25 develop faster.', drawback:'Veterans leave more often.' },
  { id:'now', name:'Win Right Now', icon:'⚡', benefit:'All ratings play 2 points higher.', drawback:'One extra decline point per series.' },
  { id:'value', name:'Value Hunters', icon:'$', benefit:'Gain 25% more development points.', drawback:'Top free agents cost more.' }
];
