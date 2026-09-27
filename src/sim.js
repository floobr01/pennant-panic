import { bestLineup, rating } from './data.js';

const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const r = () => Math.random();

export function fatigueState(pitcherState, player) {
  const bf = pitcherState?.bf || 0;
  const shift = player?.role === 'RP' ? -7 : 0;
  if (bf <= 12 + shift) return { name:'Fresh', penalty:0, tone:'good' };
  if (bf <= 20 + shift) return { name:'Working', penalty:3, tone:'neutral' };
  if (bf <= 26 + shift) return { name:'Tiring', penalty:7, tone:'warn' };
  if (bf <= 32 + shift) return { name:'Tired', penalty:12, tone:'bad' };
  return { name:'Exhausted', penalty:19, tone:'bad' };
}

function line(team, custom) {
  const slots = custom?.length === 9 ? custom : bestLineup(team);
  return slots.map(s => s.playerId).filter(Boolean);
}

export function makeGame(teams, userId, opponentId, userHome, userLineup, userStarterId, gameNumber, philosophyId = 'balanced', arcade = {}) {
  const user = teams[userId], opp = teams[opponentId];
  const away = userHome ? opp : user;
  const home = userHome ? user : opp;
  const awayLine = away.id === userId ? line(user,userLineup) : line(away);
  const homeLine = home.id === userId ? line(user,userLineup) : line(home);
  const aiStarter = opp.roster.filter(p=>p.role==='SP')[gameNumber % 4];
  const userStarter = user.roster.find(p=>p.id===userStarterId) || user.roster.filter(p=>p.role==='SP')[gameNumber%4];
  const awayStarter = away.id === userId ? userStarter : aiStarter;
  const homeStarter = home.id === userId ? userStarter : aiStarter;
  return {
    awayId: away.id, homeId: home.id, inning:1, half:'top', outs:0, bases:[null,null,null],
    score:{ [away.id]:0, [home.id]:0 }, hits:{ [away.id]:0, [home.id]:0 }, errors:{ [away.id]:0, [home.id]:0 },
    lineups:{ [away.id]:awayLine, [home.id]:homeLine }, battingIndex:{ [away.id]:0, [home.id]:0 },
    pitchers:{
      [away.id]:{ playerId:awayStarter.id, bf:0, outs:0, entryInning:1 },
      [home.id]:{ playerId:homeStarter.id, bf:0, outs:0, entryInning:1 }
    },
    pitcherLog:{ [away.id]:[awayStarter.id], [home.id]:[homeStarter.id] },
    stats:{}, log:[{ id:Math.random(), text:'Play ball! A fresh game begins.', kind:'info' }], finished:false, winnerId:null,
    lastResult:null, gameNumber, userId, philosophyId,arcade:{...arcade,ballparkId:userHome?(arcade.ballparkId||'balanced'):'balanced'}
  };
}

const stat = (game,id) => game.stats[id] || { pa:0,ab:0,h:0,doubles:0,triples:0,hr:0,bb:0,so:0,rbi:0,r:0,ipOuts:0,er:0,hitsAllowed:0,bbAllowed:0,k:0 };
function addStat(game,id,key,n=1) { game.stats[id] = {...stat(game,id), [key]:(stat(game,id)[key]||0)+n}; }
function findPlayer(teams,id) { for (const t of teams) { const p=t.roster.find(x=>x.id===id); if(p)return p; } }

function scoreRunner(game, runnerId, offenseId, batterId) {
  if (!runnerId) return;
  game.score[offenseId]++;
  addStat(game,runnerId,'r');
  addStat(game,batterId,'rbi');
}

function advanceHit(game, bases, batterId, basesTaken, offenseId, speed) {
  let runs = 0;
  if (basesTaken === 4) {
    bases.forEach(x => { if(x){ scoreRunner(game,x,offenseId,batterId); runs++; } });
    scoreRunner(game,batterId,offenseId,batterId); runs++;
    return { bases:[null,null,null], runs };
  }
  const next = [null,null,null];
  for (let i=2;i>=0;i--) {
    const runner = bases[i]; if(!runner) continue;
    let dest = i + basesTaken;
    if (basesTaken === 1 && i === 0 && speed > 67 && r()<.42) dest++;
    if (basesTaken === 1 && i === 1 && r()<.72) dest++;
    if (dest >= 3) { scoreRunner(game,runner,offenseId,batterId); runs++; }
    else next[dest]=runner;
  }
  if (basesTaken >= 3) { next[2]=batterId; }
  else next[basesTaken-1]=batterId;
  return { bases:next, runs };
}

function walk(game,batterId,offenseId) {
  const b=[...game.bases]; let runs=0;
  if(b[0]) {
    if(b[1]) {
      if(b[2]) { scoreRunner(game,b[2],offenseId,batterId); runs++; }
      b[2]=b[1];
    }
    b[1]=b[0];
  }
  b[0]=batterId; return {bases:b,runs};
}

export function currentMatchup(game, teams) {
  const offenseId = game.half === 'top' ? game.awayId : game.homeId;
  const defenseId = offenseId === game.awayId ? game.homeId : game.awayId;
  const lineup = game.lineups[offenseId];
  const batterId = lineup[game.battingIndex[offenseId] % lineup.length];
  const batter = findPlayer(teams,batterId);
  const pitcherState = game.pitchers[defenseId];
  const pitcher = findPlayer(teams,pitcherState.playerId);
  return { offenseId, defenseId, batter, pitcher, pitcherState };
}

export function stepPlateAppearance(source, teams) {
  if(source.finished) return source;
  const game = structuredClone(source);
  let matchup = currentMatchup(game,teams);
  // Two innings is a hard relief limit while another unused reliever exists.
  if (matchup.pitcher?.role === 'RP' && matchup.pitcherState.outs >= 6) {
    const defense = teams[matchup.defenseId];
    const replacement = defense.roster.find(p => p.role === 'RP' && !game.pitcherLog[matchup.defenseId].includes(p.id));
    if (replacement) {
      game.pitchers[matchup.defenseId] = { playerId:replacement.id, bf:0, outs:0, entryInning:game.inning };
      game.pitcherLog[matchup.defenseId].push(replacement.id);
      game.log.unshift({id:Math.random(),text:`${replacement.name} enters from the bullpen.`,kind:'info'});
      matchup = currentMatchup(game,teams);
    }
  }
  const {offenseId,defenseId,batter,pitcher,pitcherState} = matchup;
  if (!batter || !pitcher) return {...game, finished:true};
  const fatigue = fatigueState(pitcherState,pitcher);
  const userPitching = defenseId === game.userId;
  const userBatting = offenseId === game.userId;
  const philosophyFatigue = userPitching && game.philosophyId === 'control' && fatigue.penalty ? 3 : 0;
  const talentBoost = game.philosophyId === 'now' ? 2 : 0;
  const equipped=game.arcade?.artifacts?.equipped||{},batterArtifact=equipped[batter.id],pitcherArtifact=equipped[pitcher.id];
  const activePlayers=Object.values(game.lineups).flat(),bonded=id=>game.arcade?.bonds?.some(d=>d.players.includes(id)&&d.players.every(pid=>activePlayers.includes(pid)));
  const batterCore=userBatting&&game.arcade?.cornerstoneId===batter.id?2:0,pitcherCore=userPitching&&game.arcade?.cornerstoneId===pitcher.id?2:0;
  const batterBond=userBatting&&bonded(batter.id)?3:0,pitcherBond=userPitching&&bonded(pitcher.id)?3:0;
  const lunchB=batterArtifact==='golden-lunchbox'&&bonded(batter.id)?3:0,lunchP=pitcherArtifact==='golden-lunchbox'&&bonded(pitcher.id)?3:0;
  const boss=game.arcade?.boss,bossBatting=!userBatting,bossPitching=!userPitching;
  const oldB=boss?.id==='old-gods'&&bossBatting&&batter.age>=30?7:0,oldP=boss?.id==='old-gods'&&bossPitching&&pitcher.age>=30?7:0;
  const park=game.arcade?.ballparkId||'balanced',parkPower=park==='short-porch'?8:park==='endless'?-8:0,parkSpeed=park==='endless'?10:0,parkVelocity=park==='rocket-mound'?6:0,parkFatigue=park==='rocket-mound'&&pitcherState.bf>12?3:0;
  const form = batter.form==='hot'?5:batter.form==='cold'?(batterArtifact==='possessed-cleats'?-8:-5):0;
  const pForm = pitcher.form==='hot'?4:pitcher.form==='cold'?-4:0;
  const platoon = batter.bats === pitcher.throws ? -3 : 3;
  const signatureP=pitcher.signature?.id,signatureB=batter.signature?.id;
  const bossControl=boss?.id==='wall'&&bossPitching?8:0,bossSpin=boss?.id==='wall'&&bossPitching?8:0,bossPower=boss?.id==='launchers'&&bossBatting?12:0,bossSpeed=boss?.id==='track'&&bossBatting?14:0;
  const control = pitcher.control - fatigue.penalty-parkFatigue-philosophyFatigue+pForm+(userPitching?talentBoost:0)+pitcherCore+pitcherBond+lunchP+oldP+bossControl+(pitcherArtifact==='illegal-curve'?-5:0)+(signatureP==='walk-eraser'?10:0);
  const velocity = pitcher.velocity-fatigue.penalty-parkFatigue-philosophyFatigue+pForm+(userPitching?talentBoost:0)+pitcherCore+pitcherBond+lunchP+oldP+parkVelocity+(signatureP==='strikeout-artist'?9:0);
  const spin = pitcher.spin-fatigue.penalty-parkFatigue-philosophyFatigue+pForm+(userPitching?talentBoost:0)+pitcherCore+pitcherBond+lunchP+oldP+bossSpin+(pitcherArtifact==='illegal-curve'?10:0)+(signatureP==='spin-wizard'?9:0);
  const contact = batter.contact+form+platoon+(userBatting?talentBoost:0)+batterCore+batterBond+lunchB+oldB+(batterArtifact==='corked-bat'?-5:0)+(signatureB==='two-out-menace'&&game.outs===2?8:0);
  const eye=batter.eye+batterCore+batterBond+lunchB+oldB+(signatureB==='walk-machine'?10:0);
  const power=batter.power+batterCore+batterBond+lunchB+oldB+parkPower+bossPower+(batterArtifact==='corked-bat'?10:0)+(signatureB==='extra-base-goblin'?10:0);
  const speed=batter.speed+batterCore+batterBond+lunchB+oldB+parkSpeed+bossSpeed+(batterArtifact==='possessed-cleats'?12:0);
  const walkP = clamp(.065 + (eye-control)*.0015, .025, .18);
  const strikeoutP = clamp(.17 + (velocity-contact)*.002, .07, .34);
  const hitP = clamp(.245 + (contact-spin)*.0021, .14, .39);
  const roll=r(); let text='', kind='out', runs=0;
  addStat(game,batter.id,'pa'); pitcherState.bf++;
  if(roll < walkP) {
    const res=walk(game,batter.id,offenseId); game.bases=res.bases; runs=res.runs;
    addStat(game,batter.id,'bb'); addStat(game,pitcher.id,'bbAllowed'); text=`${batter.name} draws a walk.`; kind='walk';
  } else if(roll < walkP+strikeoutP) {
    game.outs++; pitcherState.outs++; addStat(game,batter.id,'ab'); addStat(game,batter.id,'so'); addStat(game,pitcher.id,'ipOuts'); addStat(game,pitcher.id,'k');
    text=`${pitcher.name} strikes out ${batter.name}.`;
  } else if(r() < hitP) {
    let basesTaken=1; const xb=clamp(.16+(power-50)*.006,.07,.45); const hr=clamp(.035+(power-50)*.0035,.012,.19);
    const powerRoll=r();
    if(powerRoll<hr) basesTaken=4; else if(powerRoll<xb) basesTaken=r()<.14?3:2;
    const philosophySpeed = userBatting && game.philosophyId === 'chaos' ? 8 : 0;
    const res=advanceHit(game,game.bases,batter.id,basesTaken,offenseId,speed+philosophySpeed); game.bases=res.bases; runs=res.runs;
    game.hits[offenseId]++; addStat(game,batter.id,'ab'); addStat(game,batter.id,'h'); addStat(game,pitcher.id,'hitsAllowed');
    if(basesTaken===2) addStat(game,batter.id,'doubles');
    if(basesTaken===3) addStat(game,batter.id,'triples');
    if(basesTaken===4) addStat(game,batter.id,'hr');
    const labels={1:'singles',2:'doubles',3:'triples',4:'launches a home run'};
    text=`${batter.name} ${labels[basesTaken]}${runs?` — ${runs} run${runs>1?'s':''} score!`:'.'}`; kind=basesTaken===4?'homer':'hit';
  } else {
    game.outs++; pitcherState.outs++; addStat(game,batter.id,'ab'); addStat(game,pitcher.id,'ipOuts');
    text=`${batter.name} is retired on a ball in play.`;
  }
  if(runs) addStat(game,pitcher.id,'er',runs);
  game.battingIndex[offenseId]=(game.battingIndex[offenseId]+1)%game.lineups[offenseId].length;
  game.lastResult={text,kind,runs}; game.log.unshift({id:Math.random(),text,kind}); game.log=game.log.slice(0,8);
  if(game.outs>=3) {
    game.outs=0; game.bases=[null,null,null];
    if(game.half==='top') {
      if(game.inning>=9 && game.score[game.homeId]>game.score[game.awayId]) finish(game,game.homeId);
      else game.half='bottom';
    } else {
      if(game.inning>=9 && game.score[game.homeId]!==game.score[game.awayId]) finish(game,game.score[game.homeId]>game.score[game.awayId]?game.homeId:game.awayId);
      else {game.half='top';game.inning++;}
    }
  } else if(game.half==='bottom' && game.inning>=9 && game.score[game.homeId]>game.score[game.awayId]) {
    finish(game,game.homeId);
  }
  return game;
}

function finish(game,winnerId){game.finished=true;game.winnerId=winnerId;game.log.unshift({id:Math.random(),text:'Final. The ballgame is over.',kind:'info'});}

export function substitutePitcher(source, teamId, playerId) {
  const game=structuredClone(source);
  game.pitchers[teamId]={playerId,bf:0,outs:0,entryInning:game.inning};
  game.pitcherLog[teamId].push(playerId);
  return game;
}

export function substituteBatter(source, teamId, oldId, newId) {
  const game=structuredClone(source); const idx=game.lineups[teamId].indexOf(oldId);
  if(idx>=0) game.lineups[teamId][idx]=newId;
  return game;
}

export function simulateUntil(game,teams,predicate,max=400) {
  let next=game, count=0;
  do { next=stepPlateAppearance(next,teams); count++; } while(!next.finished && !predicate(next) && count<max);
  return next;
}

export function quickGame(teamA,teamB) {
  const strengthA=teamA.roster.reduce((s,p)=>s+rating(p),0)/20;
  const strengthB=teamB.roster.reduce((s,p)=>s+rating(p),0)/20;
  let a=Math.max(0,Math.round(3.7+(strengthA-strengthB)*.12+(Math.random()-.5)*6));
  let b=Math.max(0,Math.round(3.7+(strengthB-strengthA)*.12+(Math.random()-.5)*6));
  if(a===b) Math.random()<.5?a++:b++;
  return [a,b];
}
