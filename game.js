(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);

  const UI = {
    score: $('score'), level: $('level'), combo: $('combo'), lives: $('lives'),
    levelName: $('level-name'), missionCopy: $('mission-copy'), modeLabel: $('mode-label'),
    runeRow: $('rune-row'), timerFill: $('timer-fill'), timerText: $('timer-text'),
    powerStatus: $('power-status'), championStrip: $('champion-strip'), champCount: $('champ-count'),
    levelDots: $('level-dots'), depthIndicator: $('depth-indicator'), startScreen: $('start-screen'),
    messageScreen: $('message-screen'), messageKicker: $('message-kicker'), messageTitle: $('message-title'),
    messageScore: $('message-score'), messageCopy: $('message-copy'), toastLayer: $('toast-layer')
  };

  const REALMS = {
    '-1': { name: 'DEPTHS', color: '#35c1d9', dark: '#082c38', glow: '#75e7eb' },
    '0':  { name: 'SURFACE', color: '#baf452', dark: '#16311d', glow: '#d8ff8d' },
    '1':  { name: 'SKY', color: '#f1dfa1', dark: '#253a45', glow: '#fff2bd' }
  };

  const LEVELS = [
    { name:'Meadow Run', lanes:3, runes:[0], weather:'SUNBEAMS', rule:'STEADY FLOW', force:0, reverse:0, blurb:'Read the rhythm. Cross three gentle surface lanes.' },
    { name:'Rush Hour', lanes:4, runes:[0,0], weather:'POLLEN DRIFT', rule:'TIGHT GAPS', force:.08, reverse:0, blurb:'Traffic accelerates and the gaps begin to close.' },
    { name:'Split Current', lanes:6, runes:[0,-1], weather:'LIGHT RAIN', rule:'CURRENT PULL', force:.13, reverse:0, blurb:'The blue rune is below. Dive into the current to claim it.' },
    { name:'Sunken Arcade', lanes:8, runes:[-1,0,-1], weather:'DEEP GLOW', rule:'BUBBLE VENTS', force:.16, reverse:0, blurb:'Sharks patrol the flooded underpass. Bubble armor helps.' },
    { name:'Cloudbreak', lanes:10, runes:[0,1,1], weather:'HIGH WIND', rule:'CROSSWINDS', force:.19, reverse:0, blurb:'Rise above the road and weave between the storm birds.' },
    { name:'Triple Crossing', lanes:12, runes:[-1,0,1], weather:'SUNSHOWER', rule:'REALM LOCKS', force:.21, reverse:13, blurb:'Every realm holds a key. Change altitude deliberately.' },
    { name:'Tempest Exchange', lanes:14, runes:[1,-1,0,1], weather:'TEMPEST', rule:'FLOW REVERSAL', force:.24, reverse:10, blurb:'Fierce currents and crosswinds now reverse with a warning.' },
    { name:'Neon Migration', lanes:16, runes:[-1,1,0,-1,1], weather:'FIREFLY NIGHT', rule:'SPEED SURGE', force:.27, reverse:8, blurb:'Fast patterns overlap. Build a combo to bend the clock.' },
    { name:'The Long Ascent', lanes:18, runes:[-1,0,1,-1,0,1], weather:'AURORA GALE', rule:'RAPID REVERSAL', force:.3, reverse:7, blurb:'Eighteen layers. Save your dash for the narrowest openings.' },
    { name:'Twentyfold Crown', lanes:20, runes:[-1,1,0,-1,1,0,-1], weather:'CROWN STORM', rule:'ALL SYSTEMS', force:.34, reverse:6, blurb:'All twenty layers are awake. Conquer the three-realm crown.' }
  ];

  const MODES = {
    easy:   { name: 'TRAIL', lives: 5, speed: .72, time: 1.35, grace: 1.25 },
    arcade: { name: 'ARCADE', lives: 3, speed: 1, time: 1, grace: 1 },
    brutal: { name: 'WILDS', lives: 2, speed: 1.3, time: .82, grace: .82 }
  };

  const CHAMPIONS = [
    {name:'Moss',color:'#9ddb49',accent:'#fff1a8',accessory:'♕',motto:'First fan in the circle'},
    {name:'Rilla',color:'#e58dcb',accent:'#ffd75e',accessory:'✿',motto:'Traffic rhythm keeper'},
    {name:'Pip',color:'#63cfb1',accent:'#ff8d72',accessory:'◇',motto:'Deep-current scout'},
    {name:'Junie',color:'#d9b64f',accent:'#e8fbff',accessory:'◌',motto:'Bubble-vent cartographer'},
    {name:'Luma',color:'#6fa6ef',accent:'#f4a4df',accessory:'★',motto:'Cloudbreak ace'},
    {name:'Fern',color:'#73b953',accent:'#db9cff',accessory:'♬',motto:'Three-realm conductor'},
    {name:'Mara',color:'#dd765f',accent:'#ffeba6',accessory:'⚡',motto:'Tempest outrider'},
    {name:'Nix',color:'#906fd2',accent:'#71f1df',accessory:'☾',motto:'Neon-night guide'},
    {name:'Clover',color:'#bbd94e',accent:'#ff8fc3',accessory:'♧',motto:'Long-ascent champion'},
    {name:'Astra',color:'#eae2c0',accent:'#8bdfff',accessory:'✦',motto:'Keeper of the crown'}
  ];

  const POWER_INFO = {
    shield: { label:'LEAF SHIELD', color:'#baf452', glyph:'◈', duration:10 },
    freeze: { label:'TIME BLOOM', color:'#87e6ff', glyph:'✦', duration:6 },
    double: { label:'DOUBLE SCORE', color:'#ffd45c', glyph:'×2', duration:9 },
    bubble: { label:'BUBBLE ARMOR', color:'#65dff2', glyph:'○', duration:12 },
    wings: { label:'STORM WINGS', color:'#f4e9ae', glyph:'⌁', duration:11 }
  };

  const state = {
    running: false, paused: false, transitioning: false, finished: false,
    mode: 'arcade', daypart: 'morning', level: 0, completed: 0,
    score: 0, combo: 1, lives: 3, time: 60, maxTime: 60,
    world: null, elapsed: 0, lastTime: performance.now(), shake: 0,
    flash: 0, freeze: 0, power: null, powerTime: 0, inputLock: 0,
    bestRow: 0, particles: [], stars: [], fireflies: [], keys: new Set(), audio: null,
    dashCharges: 2, dashRegen: 0, shiftEnergy: 1, checkpoint: 0, crossedRows: new Set(),
    nearMisses: 0, fliesCaught: 0, perfect: true, dangerLane: -1, realmWash: 0, lastNearMiss:'',
    muted: false, records: { bestScore:0, bestLevel:0, medals:[] }, sessionStartedAt: 0
  };

  const player = {
    col: 5, row: 0, realm: 0, x: 0, y: 0, targetX: 0, targetY: 0,
    hop: 0, facing: 0, invincible: 0, shifting: 0, dash: 0, riding: null,
    trail: [], lastSafeCol: 5
  };

  let view = { w: innerWidth, h: innerHeight, dpr: 1, board: null };

  function resize() {
    view.w = innerWidth; view.h = innerHeight; view.dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
    canvas.style.width = `${view.w}px`; canvas.style.height = `${view.h}px`;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    computeBoard();
  }

  function computeBoard() {
    const left = Math.max(170, view.w * .125);
    const right = Math.min(view.w - 290, view.w * .805);
    const top = 124;
    const bottom = view.h - 82;
    view.board = { x:left, y:top, w:right-left, h:bottom-top };
    syncPlayerTarget(true);
  }

  function seeded(seed) {
    let x = seed | 0;
    return () => {
      x |= 0; x = x + 0x6D2B79F5 | 0;
      let t = Math.imul(x ^ x >>> 15, 1 | x);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildWorld(levelIndex) {
    const cfg = LEVELS[levelIndex];
    const rand = seeded(8137 + levelIndex * 991);
    const lanes = [];
    for (let row = 1; row <= cfg.lanes; row++) {
      const dir = (row + levelIndex) % 2 ? 1 : -1;
      const base = .055 + levelIndex * .004 + (row % 4) * .008;
      const realmData = {};
      [-1,0,1].forEach(realm => {
        const variant = (row + realm * 2 + levelIndex + 12) % 5;
        let type;
        if (realm === 0) type = variant === 0 || variant === 3 ? 'river' : 'road';
        if (realm === -1) type = variant === 1 ? 'vent' : variant === 4 ? 'trench' : 'current';
        if (realm === 1) type = variant === 2 ? 'storm' : variant === 4 ? 'jetstream' : 'cloudway';
        const count = realm === 0 && type === 'river' ? 3 + (row % 2) : 2 + ((row + levelIndex + realm + 6) % 3);
        const entities = [];
        for (let i = 0; i < count; i++) {
          let kind;
          if (realm === 0) kind = type === 'river' ? (i % 3 === 0 ? 'lilypad' : 'log') : ['car','truck','beetle'][(i+row)%3];
          if (realm === -1) kind = type === 'vent' ? 'bubbleJet' : ['shark','jelly','eel'][(i+row)%3];
          if (realm === 1) kind = type === 'storm' ? 'stormcloud' : ['bird','glider','drone'][(i+row)%3];
          entities.push({
            x: ((i / count) + rand() * .13) % 1,
            width: realm === 0 && type === 'river' ? .13 + rand()*.07 : .062 + rand()*.04,
            speed: dir * base * (.82 + rand()*.44),
            kind,
            bob: rand() * Math.PI * 2,
            hue: Math.floor(rand()*5)
          });
        }
        realmData[realm] = {
          type, entities, dir, originalDir:dir, phase:rand()*20,
          nextReverse: cfg.reverse ? cfg.reverse * (.72 + rand()*.56) : Infinity,
          warning:0, force: cfg.force * (realm===0 ? .45 : 1) * dir
        };
      });
      lanes.push({ row, realms: realmData });
    }

    const runes = cfg.runes.map((realm, i) => ({
      id: i, realm, row: Math.max(1, Math.min(cfg.lanes, Math.round((i+1) * (cfg.lanes+1)/(cfg.runes.length+1)))),
      col: 1 + ((i*3 + levelIndex*2 + 2) % 9), collected: false, pulse: rand()*6
    }));
    const powers = [];
    const powerCount = 2 + Math.floor(levelIndex / 2);
    const kinds = Object.keys(POWER_INFO);
    for (let i=0;i<powerCount;i++) {
      powers.push({
        kind: kinds[(i+levelIndex)%kinds.length],
        realm: [-1,0,1][(i*2+levelIndex)%3],
        row: 1 + ((i*4+levelIndex*3+2)%cfg.lanes), col: 1+((i*5+levelIndex)%9),
        collected:false, pulse:rand()*6
      });
    }
    const flies = [];
    const flyCount = 1 + Math.floor(levelIndex/2);
    for(let i=0;i<flyCount;i++) flies.push({
      realm:[0,-1,1][(i+levelIndex)%3], row:1+((i*5+levelIndex+1)%cfg.lanes),
      x:.15+rand()*.7, baseX:.15+rand()*.7, phase:rand()*6, collected:false
    });
    return { lanes, runes, powers, flies, cfg };
  }

  function startGame() {
    initAudio();
    state.running = true; state.paused = false; state.transitioning = false; state.finished = false;
    state.level = 0; state.completed = 0; state.score = 0; state.combo = 1;
    state.lives = MODES[state.mode].lives; state.particles.length = 0; state.sessionStartedAt=performance.now();
    UI.startScreen.classList.remove('visible'); UI.messageScreen.classList.remove('visible');
    loadLevel(0, true); tone(240, .07, 'square');
  }

  function loadLevel(index, fresh = false) {
    state.level = index;
    state.world = buildWorld(index);
    const base = 50 + LEVELS[index].lanes * 3.15;
    state.maxTime = Math.round(base * MODES[state.mode].time);
    state.time = state.maxTime; state.freeze = 0; state.power = null; state.powerTime = 0;
    state.combo = 1; state.bestRow = 0; state.inputLock = .5; state.dashCharges=2; state.dashRegen=0;
    state.shiftEnergy=1; state.checkpoint=0; state.crossedRows=new Set(); state.nearMisses=0; state.fliesCaught=0; state.perfect=true;
    state.dangerLane=-1; state.realmWash=0;
    player.col = 5; player.row = 0; player.realm = 0; player.invincible = fresh ? 1.2 : 1;
    player.shifting = 0; player.riding = null; player.trail=[]; player.lastSafeCol=5;
    syncPlayerTarget(true); updateUI(); buildRuneUI(); buildLevelDots(); updateChampions();
  }

  function syncPlayerTarget(snap = false) {
    if (!view.board || !state.world) return;
    const b = view.board, totalRows = state.world.cfg.lanes + 2;
    player.targetX = b.x + b.w * ((player.col + .5) / 11);
    player.targetY = b.y + b.h - b.h * ((player.row + .5) / totalRows);
    if (snap || !Number.isFinite(player.x)) { player.x = player.targetX; player.y = player.targetY; }
  }

  function movePlayer(dx, dy, dash = false) {
    if (!state.running || state.paused || state.transitioning || state.inputLock > 0) return;
    if (dash && state.dashCharges < 1) { showToast('DASH RECHARGING',player.x,player.y,true); tone(95,.08,'square'); return; }
    initAudio();
    const oldRow = player.row;
    const step = dash ? 2 : 1;
    if(dash){state.dashCharges--;state.dashRegen=0;}
    player.col = Math.max(0, Math.min(10, player.col + dx * step));
    player.row = Math.max(0, Math.min(state.world.cfg.lanes + 1, player.row + dy * step));
    player.facing = dx < 0 ? -1 : dx > 0 ? 1 : player.facing;
    player.hop = 1; player.dash = dash ? 1 : 0; state.inputLock = dash ? .18 : .11;
    syncPlayerTarget();
    if (dy > 0 && player.row > oldRow) {
      state.combo = Math.min(9, state.combo + .15);
      if (player.row > state.bestRow) {
        const pts = Math.round((25 + state.level*5) * state.combo * scorePower());
        addScore(pts, player.targetX, player.targetY); state.bestRow = player.row;
      }
      if(!state.crossedRows.has(player.row) && player.row<=state.world.cfg.lanes){
        state.crossedRows.add(player.row); addScore(Math.round(18*(state.level+1)*state.combo),player.targetX,player.targetY);
      }
      const checkpointEvery=state.world.cfg.lanes>=10?5:state.world.cfg.lanes>=6?4:3;
      if(player.row<state.world.cfg.lanes && player.row%checkpointEvery===0 && player.row>state.checkpoint){
        state.checkpoint=player.row;player.lastSafeCol=Math.round(player.col);showToast('CHECKPOINT',player.x,player.y,true);tone(720,.16,'triangle',.045);screenPulse('#baf452');
      }
    } else if (dy < 0) state.combo = Math.max(1, state.combo - .35);
    tone(dash ? 410 : 320, .035, 'square', .028);
    burst(player.x, player.y+8, REALMS[player.realm].color, dash ? 10 : 4);
    checkCollectibles();
    if (player.row === state.world.cfg.lanes + 1) attemptFinish();
    updateUI();
  }

  function shiftRealm(dir) {
    if (!state.running || state.paused || state.transitioning || state.inputLock > 0) return;
    if(state.shiftEnergy<.34){showToast('ALTITUDE CHARGING',player.x,player.y,true);tone(90,.08,'square');return;}
    const next = Math.max(-1, Math.min(1, player.realm + dir));
    if (next === player.realm) { tone(90,.08,'square'); return; }
    state.shiftEnergy=Math.max(0,state.shiftEnergy-.34);state.realmWash=1;
    player.realm = next; player.shifting = 1; player.invincible = Math.max(player.invincible,.48); state.inputLock = .28;
    player.riding = null; setRealmUI(); checkCollectibles();
    burst(player.x, player.y, REALMS[next].color, 18);
    tone(next === 1 ? 660 : 180, .13, 'sine', .05);
  }

  function attemptFinish() {
    const missing = state.world.runes.filter(r => !r.collected);
    if (missing.length) {
      player.row = state.world.cfg.lanes; syncPlayerTarget(); state.inputLock = .3;
      showToast(`FIND ${missing.length} MISSING RUNE${missing.length>1?'S':''}`, player.x, player.y, true);
      tone(110,.2,'sawtooth'); return;
    }
    completeLevel();
  }

  function completeLevel() {
    if (state.transitioning) return;
    state.transitioning = true; state.completed = Math.max(state.completed, state.level+1);
    const clearRatio=state.time/state.maxTime;
    const medal=state.perfect&&clearRatio>.35?'GOLD':clearRatio>.18?'SILVER':'BRONZE';
    const medalMult=medal==='GOLD'?1.5:medal==='SILVER'?1.2:1;
    const bonus = Math.round((1000 + state.level*550 + state.time*40 + state.nearMisses*90 + state.fliesCaught*300) * medalMult * scorePower());
    state.score += bonus;state.records.bestScore=Math.max(state.records.bestScore,state.score);state.records.bestLevel=Math.max(state.records.bestLevel,state.completed);
    const oldMedal=state.records.medals[state.level];if(!oldMedal||medalRank(medal)>medalRank(oldMedal))state.records.medals[state.level]=medal;saveRecords();
    updateUI(); updateChampions(); buildLevelDots();
    burst(player.x, player.y, '#f5e878', 42); fanfare();
    setTimeout(() => {
      const last = state.level === LEVELS.length - 1;
      UI.messageKicker.textContent = last ? 'THE THREE-REALM CROWN' : 'REALM CLEARED';
      UI.messageTitle.textContent = last ? 'Legend of the Crossing' : `${CHAMPIONS[state.level].name} Joins the Circle`;
      UI.messageScore.textContent = `${medal}  •  +${bonus.toLocaleString()}`;
      UI.messageCopy.textContent = last
        ? `All ten champions are cheering. Final score: ${state.score.toLocaleString()}.`
        : `${state.completed} ${state.completed===1?'champion is':'champions are'} now waiting at the circle. ${state.nearMisses} near misses · ${state.fliesCaught} golden flies. Next: ${LEVELS[state.level+1].name}.`;
      $('continue-button').querySelector('span').textContent = last ? 'PLAY AGAIN' : 'NEXT CROSSING';
      UI.messageScreen.classList.add('visible'); state.finished = last;
    }, 600);
  }

  function medalRank(m){return m==='GOLD'?3:m==='SILVER'?2:m==='BRONZE'?1:0;}

  function continueGame() {
    UI.messageScreen.classList.remove('visible');
    if (state.finished) { UI.startScreen.classList.add('visible'); state.running=false; state.transitioning=false; return; }
    loadLevel(state.level+1); state.transitioning=false;
  }

  function loseLife(reason) {
    if (player.invincible > 0 || state.transitioning) return;
    const protectedNow = state.power === 'shield' || (state.power === 'bubble' && player.realm === -1) || (state.power === 'wings' && player.realm === 1);
    if (protectedNow) {
      showToast('ARMOR SAVED YOU', player.x, player.y, true); state.power = null; state.powerTime = 0;
      player.invincible = 1.1; burst(player.x,player.y,'#ffffff',24); tone(760,.14,'triangle'); updateUI(); return;
    }
    state.lives--; state.combo = 1; state.shake = 14; state.flash = 1; state.perfect=false; tone(75,.36,'sawtooth',.08);
    burst(player.x, player.y, '#ff6b61', 30); showToast(reason, player.x, player.y, true);
    if (state.lives <= 0) {
      state.transitioning = true;
      setTimeout(() => {
        UI.messageKicker.textContent='CROSSING ENDED'; UI.messageTitle.textContent='The Realms Won This Time';
        UI.messageScore.textContent=state.score.toLocaleString();
        UI.messageCopy.textContent=`You reached level ${state.level+1} and gathered ${state.world.runes.filter(r=>r.collected).length} runes.`;
        $('continue-button').querySelector('span').textContent='TRY AGAIN'; UI.messageScreen.classList.add('visible'); state.finished=true;
      },500);
    } else {
      player.col=state.checkpoint?player.lastSafeCol:5; player.row=state.checkpoint; player.realm=0; player.invincible=1.5; player.riding=null; state.bestRow=state.checkpoint;
      state.time=Math.max(10,state.time-4); syncPlayerTarget(); setRealmUI(); updateUI();
    }
  }

  function checkCollectibles() {
    if (!state.world) return;
    state.world.runes.forEach(r => {
      if (!r.collected && r.realm===player.realm && r.row===player.row && Math.abs(r.col-player.col)<=.25) {
        r.collected=true; const pts=Math.round(750*(state.level+1)*scorePower()); addScore(pts,player.x,player.y,true);
        burst(player.x,player.y,REALMS[r.realm].glow,30); tone(560+r.id*80,.18,'triangle',.06); buildRuneUI();
      }
    });
    state.world.powers.forEach(p => {
      if (!p.collected && p.realm===player.realm && p.row===player.row && Math.abs(p.col-player.col)<=.25) {
        p.collected=true; activatePower(p.kind); addScore(200*(state.level+1),player.x,player.y,true);
      }
    });
    state.world.flies.forEach(f=>{
      const flyCol=f.x*11-.5;
      if(!f.collected&&f.realm===player.realm&&f.row===player.row&&Math.abs(flyCol-player.col)<.7){
        f.collected=true;state.fliesCaught++;state.time=Math.min(state.maxTime,state.time+4);
        addScore(500*(state.level+1)*scorePower(),player.x,player.y,true);showToast('GOLDEN FLY  +4s',player.x,player.y-18,true);
        burst(player.x,player.y,'#ffe15c',34);tone(980,.18,'triangle',.06);screenPulse('#ffe15c');
      }
    });
  }

  function activatePower(kind) {
    state.power=kind; state.powerTime=POWER_INFO[kind].duration;
    if (kind==='freeze') state.freeze=POWER_INFO[kind].duration;
    showToast(POWER_INFO[kind].label,player.x,player.y,true); burst(player.x,player.y,POWER_INFO[kind].color,24);
    tone(880,.1,'sine',.06); setTimeout(()=>tone(1180,.12,'sine',.05),80); updateUI();
  }

  function scorePower() { return state.power==='double' ? 2 : 1; }
  function addScore(points,x,y,power=false) { state.score+=points; showToast(`+${points.toLocaleString()}`,x,y,power); updateUI(); }

  function update(dt) {
    state.elapsed += dt; state.inputLock=Math.max(0,state.inputLock-dt); state.shake*=Math.pow(.03,dt); state.flash=Math.max(0,state.flash-dt*2.8);
    state.realmWash=Math.max(0,state.realmWash-dt*2.5);
    player.invincible=Math.max(0,player.invincible-dt); player.hop=Math.max(0,player.hop-dt*5); player.shifting=Math.max(0,player.shifting-dt*3.2); player.dash=Math.max(0,player.dash-dt*4);
    const ease=1-Math.pow(.0001,dt); player.x += (player.targetX-player.x)*ease; player.y += (player.targetY-player.y)*ease;
    updateParticles(dt);
    if (!state.running || state.paused || state.transitioning || !state.world) return;
    state.shiftEnergy=Math.min(1,state.shiftEnergy+dt*.11);
    if(state.dashCharges<2){state.dashRegen+=dt;if(state.dashRegen>=5.5){state.dashCharges++;state.dashRegen=0;showToast('DASH READY',player.x,player.y,true);tone(520,.07,'triangle');}}
    state.combo=Math.max(1,state.combo-dt*.018);
    player.trail.push({x:player.x,y:player.y,realm:player.realm,life:.34});
    if(player.trail.length>18)player.trail.shift();player.trail.forEach(t=>t.life-=dt);
    const speedMod=MODES[state.mode].speed;
    if (state.powerTime>0) {
      state.powerTime=Math.max(0,state.powerTime-dt);
      if (state.powerTime===0) { state.power=null; state.freeze=0; updateUI(); }
    }
    if (state.freeze>0) state.freeze=Math.max(0,state.freeze-dt);
    const entityDt=state.freeze>0 ? dt*.12 : dt;
    state.dangerLane=-1;
    state.world.lanes.forEach(lane => Object.values(lane.realms).forEach(data => {
      data.phase += entityDt;
      if(Number.isFinite(data.nextReverse)){
        data.nextReverse-=entityDt;data.warning=data.nextReverse<2.2?1-data.nextReverse/2.2:0;
        if(data.warning>0&&lane.row===player.row&&lane.realms[player.realm]===data)state.dangerLane=lane.row;
        if(data.nextReverse<=0){data.entities.forEach(e=>e.speed*=-1);data.dir*=-1;data.nextReverse=state.world.cfg.reverse*(.78+Math.random()*.42);data.warning=0;if(lane.row===player.row)showToast('FLOW REVERSED',player.x,player.y,true);}
      }
      const surge=state.level>=7?1+Math.sin(data.phase*.75+lane.row)*.13:1;
      data.entities.forEach(e => { e.x += e.speed*speedMod*surge*entityDt; if(e.x>1.16)e.x=-.16; if(e.x<-.16)e.x=1.16; e.bob+=entityDt*2; });
    }));
    state.world.flies.forEach(f=>{f.phase+=dt*2.2;f.x=f.baseX+Math.sin(f.phase)*.075;});
    applyLaneForce(dt);
    state.time-=dt;
    if (state.time<=0) { state.time=0; loseLife('TIME RAN OUT'); }
    collisionCheck(dt);
    if (Math.floor((state.time+dt)*10)!==Math.floor(state.time*10)) updateUI();
  }

  function applyLaneForce(dt){
    if(player.row<1||player.row>state.world.cfg.lanes||player.riding)return;
    const data=state.world.lanes[player.row-1].realms[player.realm];
    if(player.realm===0||!data.force)return;
    const delta=data.force*dt*(player.realm===1?1.25:1);player.col+=delta;player.targetX+=delta*(view.board.w/11);
    if(player.col<-.4||player.col>10.4)loseLife(player.realm===1?'BLOWN OUT OF THE SKY':'LOST IN THE CURRENT');
  }

  function collisionCheck(dt) {
    if (player.row<1 || player.row>state.world.cfg.lanes || player.invincible>0) return;
    const lane=state.world.lanes[player.row-1].realms[player.realm];
    const px=(player.col+.5)/11;
    let hit=null,minGap=99,nearEntity=null;
    for (const e of lane.entities) {
      const d=wrappedDistance(px,e.x);
      const gap=d-(e.width*.5+.025);if(gap<minGap){minGap=gap;nearEntity=e;}
      const forgiveness=.017*MODES[state.mode].grace;
      if (d < e.width*.5 + .025 - forgiveness) { hit=e; break; }
    }
    if (player.realm===0 && lane.type==='river') {
      if (!hit) loseLife('SWEPT INTO THE CURRENT');
      else {
        player.riding=hit; const delta=hit.speed*MODES[state.mode].speed*dt*11;
        player.col+=delta; player.targetX+=delta*(view.board.w/11);
        if(player.col<-.35||player.col>10.35) loseLife('CARRIED OFF THE EDGE');
      }
      return;
    }
    player.riding=null;
    if (hit) {
      const reasons = player.realm===0 ? 'TRAFFIC HIT' : player.realm===-1 ? 'DEPTH CREATURE HIT' : 'SKY HAZARD HIT';
      loseLife(reasons);
    } else if(minGap<.018&&player.hop>.3){
      const key=`${player.realm}:${player.row}:${nearEntity?nearEntity.kind:''}:${Math.floor(state.elapsed*2)}`;
      if(state.lastNearMiss!==key){state.lastNearMiss=key;state.nearMisses++;state.combo=Math.min(9,state.combo+.25);addScore(Math.round(75*state.combo*(state.level+1)),player.x,player.y,true);showToast('NEAR MISS',player.x,player.y-16,true);tone(740,.045,'square',.025);}
    }
  }

  function wrappedDistance(a,b) { let d=Math.abs(a-b); return Math.min(d,Math.abs(d-1),Math.abs(d+1)); }

  function updateParticles(dt) {
    for(let i=state.particles.length-1;i>=0;i--) {
      const p=state.particles[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.gravity*dt; p.size*=Math.pow(.42,dt);
      if(p.life<=0) state.particles.splice(i,1);
    }
  }

  function burst(x,y,color,count=12) {
    for(let i=0;i<count;i++) {
      const a=Math.random()*Math.PI*2, s=25+Math.random()*95;
      state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,gravity:45,size:2+Math.random()*4,life:.45+Math.random()*.65,maxLife:1,color});
    }
  }

  function showToast(text,x,y,power=false) {
    const el=document.createElement('div'); el.className=`score-toast${power?' power':''}`; el.textContent=text;
    el.style.left=`${Math.max(170,Math.min(view.w-380,x-30))}px`; el.style.top=`${Math.max(120,y-28)}px`;
    UI.toastLayer.appendChild(el); setTimeout(()=>el.remove(),1050);
  }

  function screenPulse(color='#baf452'){
    const el=document.createElement('div');el.className='screen-pulse';el.style.setProperty('--lime',color);document.getElementById('app').appendChild(el);setTimeout(()=>el.remove(),500);
  }

  function draw() {
    ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
    ctx.clearRect(0,0,view.w,view.h);
    const sx=state.shake ? (Math.random()-.5)*state.shake : 0, sy=state.shake ? (Math.random()-.5)*state.shake : 0;
    ctx.save(); ctx.translate(sx,sy);
    drawBackdrop(); drawWeather();
    if(state.world) {
      drawAdjacentRealmEcho(); drawBoard(); drawCollectibles(); drawRuneRadar(); drawPlayerTrail(); drawPlayer(); drawParticles();
    }
    ctx.restore();
    if(state.flash>0) { ctx.fillStyle=`rgba(255,55,45,${state.flash*.22})`; ctx.fillRect(0,0,view.w,view.h); }
    if(state.realmWash>0){ctx.fillStyle=hexAlpha(REALMS[player.realm].color,Math.min(.28,state.realmWash*.22));ctx.fillRect(0,0,view.w,view.h);}
    if(state.paused) drawPause();
  }

  function palette() {
    if(state.daypart==='night') return { top:'#071327', bottom:'#081a1b', sun:'#91a3ff', haze:'#516493', shadow:'rgba(0,0,8,.76)', light:'#96a9ff' };
    if(state.daypart==='afternoon') return { top:'#35515a', bottom:'#69703a', sun:'#ffbd42', haze:'#d88935', shadow:'rgba(28,8,0,.62)', light:'#ffca55' };
    return { top:'#7eb6a1', bottom:'#486d45', sun:'#f5edb0', haze:'#c8dda0', shadow:'rgba(0,17,10,.56)', light:'#e8f6bd' };
  }

  function drawBackdrop() {
    const p=palette(), g=ctx.createLinearGradient(0,0,0,view.h);
    g.addColorStop(0,p.top); g.addColorStop(.6,p.bottom); g.addColorStop(1,'#06100d'); ctx.fillStyle=g; ctx.fillRect(0,0,view.w,view.h);
    const realm=player.realm;
    if(realm===-1) drawUnderwaterBackdrop(p);
    else if(realm===1) drawSkyBackdrop(p);
    else drawSurfaceBackdrop(p);
    drawLeftLight(p);
  }

  function drawLeftLight(p) {
    const rg=ctx.createRadialGradient(-30,view.h*.25,20,-30,view.h*.25,view.w*.82);
    rg.addColorStop(0,`${p.light}88`); rg.addColorStop(.42,`${p.light}19`); rg.addColorStop(1,'transparent');
    ctx.fillStyle=rg; ctx.fillRect(0,0,view.w,view.h);
    ctx.fillStyle=p.sun; ctx.globalAlpha=state.daypart==='night'?.38:.72;
    ctx.beginPath(); ctx.arc(30,154,state.daypart==='afternoon'?48:34,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  }

  function drawWeather(){
    if(!state.world)return;const weather=state.world.cfg.weather;
    if(/RAIN|TEMPEST|STORM/.test(weather)){
      ctx.strokeStyle=player.realm===-1?'rgba(130,238,242,.16)':'rgba(215,235,238,.25)';ctx.lineWidth=1;
      const slant=player.realm===1?18:8;
      for(let i=0;i<72;i++){const x=(i*67+state.elapsed*230)%(view.w+80)-40,y=(i*109+state.elapsed*430)%view.h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-slant,y+18);ctx.stroke();}
    }
    if(/POLLEN|FIREFLY|DEEP GLOW|AURORA/.test(weather)){
      for(let i=0;i<36;i++){const x=(i*151+Math.sin(state.elapsed*.4+i)*35)%view.w,y=(i*83-state.elapsed*(6+i%4)+view.h)%view.h;ctx.globalAlpha=.16+(i%5)*.06;ctx.fillStyle=i%3?'#c8f26b':'#75dfe5';ctx.fillRect(x,y,2+(i%2),2+(i%2));}ctx.globalAlpha=1;
    }
    if(/AURORA|CROWN/.test(weather)&&state.daypart==='night'){
      const g=ctx.createLinearGradient(0,70,view.w,260);g.addColorStop(0,'rgba(75,255,198,.02)');g.addColorStop(.45,'rgba(90,172,255,.17)');g.addColorStop(.7,'rgba(200,91,255,.08)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,70,view.w,240);
    }
  }

  function drawSurfaceBackdrop(p) {
    ctx.fillStyle='rgba(12,43,29,.45)';
    for(let i=0;i<42;i++) { const x=(i*97+41)%view.w, y=110+((i*61)%Math.max(130,view.h-130)); const s=3+(i%5); hardRect(x,y,s,s*2,p.shadow); }
    ctx.fillStyle='rgba(4,23,16,.58)'; ctx.beginPath(); ctx.moveTo(0,view.h*.7);
    for(let x=0;x<=view.w;x+=70) ctx.lineTo(x,view.h*.62+Math.sin(x*.017)*27); ctx.lineTo(view.w,view.h);ctx.lineTo(0,view.h);ctx.fill();
  }

  function drawUnderwaterBackdrop() {
    const g=ctx.createLinearGradient(0,0,0,view.h); g.addColorStop(0,'rgba(37,156,174,.72)');g.addColorStop(1,'rgba(2,31,48,.86)');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);
    ctx.strokeStyle='rgba(130,235,240,.12)';ctx.lineWidth=18;
    for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-80,i*130+(state.elapsed*18)%130);ctx.bezierCurveTo(view.w*.35,i*130-60,view.w*.65,i*130+90,view.w+80,i*130);ctx.stroke();}
    for(let i=0;i<34;i++){const x=(i*83+state.elapsed*(8+i%3))%view.w,y=(i*127)%view.h;ctx.fillStyle='rgba(186,244,242,.35)';ctx.beginPath();ctx.arc(x,y,1+i%4,0,7);ctx.fill();}
  }

  function drawSkyBackdrop() {
    const g=ctx.createLinearGradient(0,0,0,view.h);g.addColorStop(0,'rgba(98,145,178,.62)');g.addColorStop(1,'rgba(176,195,160,.32)');ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);
    for(let i=0;i<11;i++){const x=((i*173-state.elapsed*(9+i%3))%(view.w+260))-130,y=140+(i*79)%(view.h-180),s=26+i%4*9;ctx.fillStyle='rgba(244,244,220,.17)';ctx.beginPath();ctx.ellipse(x,y,s*2,s,0,0,7);ctx.fill();}
    if(state.daypart==='night') for(let i=0;i<55;i++){ctx.fillStyle=`rgba(235,245,255,${.25+(i%4)*.12})`;ctx.fillRect((i*139)%view.w,(i*83)%view.h,1+(i%2),1+(i%2));}
  }

  function drawAdjacentRealmEcho() {
    const b=view.board;
    ctx.save();ctx.globalAlpha=.18;
    ctx.strokeStyle=player.realm===0?'#7fd8ea':player.realm===-1?'#d6e8b2':'#9ad76d';ctx.setLineDash([4,8]);ctx.lineWidth=1;
    ctx.strokeRect(b.x-9,b.y-9,b.w+18,b.h+18);ctx.setLineDash([]);ctx.restore();
  }

  function drawBoard() {
    const b=view.board,cfg=state.world.cfg,total=cfg.lanes+2,rowH=b.h/total,p=palette();
    ctx.save();
    hardRect(b.x,b.y,b.w,b.h,p.shadow,12,14);
    ctx.fillStyle='rgba(4,17,13,.82)';ctx.fillRect(b.x,b.y,b.w,b.h);
    drawGoalRow(b,rowH); drawStartRow(b,rowH);
    for(let row=1;row<=cfg.lanes;row++) drawLane(state.world.lanes[row-1],b.y+b.h-rowH*(row+1),rowH,b);
    ctx.strokeStyle='rgba(235,255,224,.13)';ctx.lineWidth=1;ctx.strokeRect(b.x+.5,b.y+.5,b.w-1,b.h-1);
    ctx.restore();
  }

  function drawGoalRow(b,rowH) {
    ctx.fillStyle=player.realm===-1?'#0c4350':player.realm===1?'#596e70':'#294b27';ctx.fillRect(b.x,b.y,b.w,rowH);
    const p=palette();
    for(let i=0;i<11;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)';ctx.fillRect(b.x+i*b.w/11,b.y,b.w/11,rowH);}
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.font='800 8px system-ui';ctx.letterSpacing='2px';ctx.textAlign='center';ctx.fillText('WINNER CIRCLE  •  ALL RUNES REQUIRED',b.x+b.w/2,b.y+13);
    ctx.strokeStyle=REALMS[player.realm].color;ctx.globalAlpha=.4+.18*Math.sin(state.elapsed*3);ctx.lineWidth=2;ctx.strokeRect(b.x+b.w*.42,b.y+19,b.w*.16,Math.max(10,rowH-26));ctx.globalAlpha=1;
    for(let i=0;i<state.completed;i++) drawBoardChampion(b.x+18+i*31,b.y+rowH-13,CHAMPIONS[i],i);
    ctx.fillStyle=p.light;ctx.globalAlpha=.17;ctx.fillRect(b.x,b.y,3,rowH);ctx.globalAlpha=1;
  }

  function drawStartRow(b,rowH) {
    const y=b.y+b.h-rowH;ctx.fillStyle=player.realm===-1?'#0a3844':player.realm===1?'#344d57':'#1d3d21';ctx.fillRect(b.x,y,b.w,rowH);
    ctx.fillStyle='rgba(255,255,255,.08)';for(let i=0;i<11;i+=2)ctx.fillRect(b.x+i*b.w/11,y,b.w/11,rowH);
    ctx.fillStyle='rgba(235,255,225,.42)';ctx.font='800 7px system-ui';ctx.textAlign='left';ctx.fillText(`${REALMS[player.realm].name} START`,b.x+10,y+14);
  }

  function drawLane(lane,y,h,b) {
    const data=lane.realms[player.realm], type=data.type, p=palette();
    let fill='#16231f';
    if(player.realm===0) fill=type==='river'?(lane.row%2?'#164d58':'#123f4d'):(lane.row%2?'#2b302c':'#252b28');
    if(player.realm===-1) fill=type==='vent'?'#173947':type==='trench'?'#071d2d':'#0d3442';
    if(player.realm===1) fill=type==='storm'?'#323a49':type==='jetstream'?'#50666c':'#607677';
    ctx.fillStyle=fill;ctx.fillRect(b.x,y,b.w,h);
    ctx.strokeStyle='rgba(255,255,255,.065)';ctx.beginPath();ctx.moveTo(b.x,y);ctx.lineTo(b.x+b.w,y);ctx.stroke();
    drawLaneDetails(data,y,h,b,lane.row);
    if(data.warning>0){ctx.fillStyle=`rgba(255,72,54,${.05+data.warning*.18})`;ctx.fillRect(b.x,y,b.w,h);ctx.fillStyle='#ff7569';ctx.globalAlpha=.45+.45*Math.sin(state.elapsed*11);ctx.font='900 8px system-ui';ctx.textAlign='center';ctx.fillText('↔  FLOW REVERSAL  ↔',b.x+b.w/2,y+12);ctx.globalAlpha=1;}
    data.entities.forEach(e=>drawEntity(e,b.x+e.x*b.w,y+h/2,h,data.type,p));
    if(state.checkpoint===lane.row){ctx.strokeStyle='rgba(186,244,82,.7)';ctx.setLineDash([5,5]);ctx.strokeRect(b.x+2,y+2,b.w-4,h-4);ctx.setLineDash([]);ctx.fillStyle='#baf452';ctx.font='900 6px system-ui';ctx.textAlign='right';ctx.fillText('CHECKPOINT',b.x+b.w-6,y+10);}
    const arrow=data.dir>0?'›':'‹';ctx.fillStyle='rgba(255,255,255,.22)';ctx.font=`900 ${Math.min(15,h*.38)}px system-ui`;ctx.textAlign=data.dir>0?'right':'left';ctx.fillText(arrow,data.dir>0?b.x+b.w-6:b.x+6,y+h*.64);
    ctx.fillStyle='rgba(0,0,0,.25)';ctx.font='700 7px "SFMono-Regular",monospace';ctx.textAlign='left';ctx.fillText(String(lane.row).padStart(2,'0'),b.x+5,y+10);
  }

  function drawLaneDetails(data,y,h,b,row) {
    if(player.realm===0 && data.type==='road') {
      ctx.strokeStyle='rgba(250,240,180,.24)';ctx.lineWidth=1;ctx.setLineDash([13,12]);ctx.beginPath();ctx.moveTo(b.x,y+h/2);ctx.lineTo(b.x+b.w,y+h/2);ctx.stroke();ctx.setLineDash([]);
    } else if(player.realm===0) {
      ctx.strokeStyle='rgba(100,222,232,.2)';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(b.x,y+h*(.25+i*.25));ctx.lineTo(b.x+b.w,y+h*(.25+i*.25));ctx.stroke();}
    } else if(player.realm===-1) {
      ctx.strokeStyle='rgba(102,226,236,.13)';ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(b.x,y+h*.5);ctx.lineTo(b.x+b.w,y+h*.5);ctx.stroke();ctx.setLineDash([]);
      if(data.type==='vent') for(let x=b.x+40;x<b.x+b.w;x+=110){ctx.fillStyle='rgba(110,225,231,.18)';ctx.beginPath();ctx.arc(x,y+h*.72,2+Math.sin(state.elapsed+x)*1.3,0,7);ctx.fill();}
    } else {
      ctx.strokeStyle='rgba(255,255,235,.13)';ctx.beginPath();ctx.moveTo(b.x,y+h*.55);ctx.bezierCurveTo(b.x+b.w*.3,y+h*.3,b.x+b.w*.7,y+h*.8,b.x+b.w,y+h*.45);ctx.stroke();
      if(data.type==='storm'){ctx.fillStyle='rgba(187,195,220,.1)';for(let x=b.x+(row*47)%90;x<b.x+b.w;x+=100)ctx.fillRect(x,y,2,h);}
    }
  }

  function drawEntity(e,x,y,h,type,p) {
    const unit=Math.max(8,h*.22), w=Math.max(unit*1.7,e.width*view.board.w), bob=Math.sin(e.bob)*Math.min(2,h*.05);
    y+=bob;ctx.save();
    const shadowX=state.daypart==='afternoon'?12:state.daypart==='night'?8:10;
    const shadowY=state.daypart==='afternoon'?7:12;
    ctx.fillStyle=p.shadow;shapeEntity(e.kind,x+shadowX,y+shadowY,w,unit,true,e.hue);
    shapeEntity(e.kind,x,y,w,unit,false,e.hue);ctx.restore();
  }

  function shapeEntity(kind,x,y,w,u,shadow,hue) {
    const colors=['#e76042','#e9c84b','#5e9cd0','#c46fa5','#90bd48'];
    if(kind==='car'||kind==='truck'||kind==='beetle') {
      ctx.fillStyle=shadow?'rgba(0,0,0,.7)':colors[hue%colors.length];roundRect(x-w/2,y-u*.52,w,u,2);ctx.fill();
      if(!shadow){ctx.fillStyle='rgba(190,235,230,.75)';ctx.fillRect(x-w*.18,y-u*.42,w*.34,u*.35);ctx.fillStyle='#0c1414';ctx.fillRect(x-w*.34,y+u*.38,u*.25,u*.25);ctx.fillRect(x+w*.22,y+u*.38,u*.25,u*.25);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-w/2,y-u*.52,3,u*.75);}
      return;
    }
    if(kind==='log'||kind==='lilypad') {
      ctx.fillStyle=shadow?'rgba(0,0,0,.65)':kind==='lilypad'?'#70b552':'#79502c';
      if(kind==='lilypad'){ctx.beginPath();ctx.ellipse(x,y,w*.36,u*.55,0,0,7);ctx.fill();if(!shadow){ctx.strokeStyle='#b4dc67';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.3,y-u*.35);ctx.stroke();}}
      else {roundRect(x-w/2,y-u*.45,w,u*.9,u*.35);ctx.fill();if(!shadow){ctx.strokeStyle='rgba(255,220,140,.28)';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x-w*.32,y+i*u*.22);ctx.lineTo(x+w*.33,y+i*u*.22);ctx.stroke();}ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(x-w*.42,y-u*.45,4,u*.75);}}
      return;
    }
    if(kind==='shark'||kind==='eel'||kind==='jelly'||kind==='bubbleJet') {
      const c=kind==='jelly'?'#bb81d0':kind==='eel'?'#b4cf56':kind==='bubbleJet'?'#61d5df':'#5e91a8';ctx.fillStyle=shadow?'rgba(0,0,0,.6)':c;
      if(kind==='jelly'||kind==='bubbleJet'){ctx.beginPath();ctx.arc(x,y,u*.52,Math.PI,0);ctx.lineTo(x+u*.52,y+u*.5);ctx.lineTo(x-u*.52,y+u*.5);ctx.fill();if(!shadow){ctx.strokeStyle='rgba(220,250,255,.5)';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*u*.28,y+u*.35);ctx.lineTo(x+i*u*.33,y+u*.8);ctx.stroke();}}}
      else {ctx.beginPath();ctx.ellipse(x,y,w*.36,u*.48,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x+w*.32,y);ctx.lineTo(x+w*.52,y-u*.5);ctx.lineTo(x+w*.5,y+u*.48);ctx.fill();if(!shadow){ctx.fillStyle='#e9f4cf';ctx.fillRect(x-w*.24,y-u*.18,3,3);}}
      return;
    }
    const c=kind==='stormcloud'?'#596174':kind==='bird'?'#f1dd9c':kind==='glider'?'#e69164':'#8fd0d8';ctx.fillStyle=shadow?'rgba(0,0,0,.65)':c;
    if(kind==='stormcloud'){ctx.beginPath();ctx.arc(x-w*.18,y,u*.5,0,7);ctx.arc(x+w*.12,y-u*.16,u*.68,0,7);ctx.arc(x+w*.36,y,u*.46,0,7);ctx.fill();if(!shadow){ctx.fillStyle='#f4d34f';ctx.beginPath();ctx.moveTo(x,y+u*.42);ctx.lineTo(x-u*.25,y+u*1.05);ctx.lineTo(x+u*.08,y+u*.88);ctx.lineTo(x-u*.12,y+u*1.45);ctx.fill();}}
    else {ctx.beginPath();ctx.moveTo(x-w*.5,y);ctx.lineTo(x-u*.18,y-u*.32);ctx.lineTo(x,y);ctx.lineTo(x+u*.18,y-u*.32);ctx.lineTo(x+w*.5,y);ctx.lineTo(x+u*.12,y+u*.32);ctx.lineTo(x,y+u*.12);ctx.lineTo(x-u*.12,y+u*.32);ctx.closePath();ctx.fill();if(!shadow){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-w*.36,y-u*.06,w*.26,2);}}
  }

  function drawCollectibles() {
    const b=view.board,total=state.world.cfg.lanes+2,rowH=b.h/total;
    [...state.world.runes.map(r=>({...r,isRune:true})),...state.world.powers.map(p=>({...p,isRune:false}))].forEach(item=>{
      if(item.collected||item.realm!==player.realm)return;
      const x=b.x+b.w*((item.col+.5)/11),y=b.y+b.h-rowH*(item.row+.5),pulse=1+Math.sin(state.elapsed*4+item.pulse)*.12;
      ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);ctx.shadowColor=item.isRune?REALMS[item.realm].color:POWER_INFO[item.kind].color;ctx.shadowBlur=14;
      ctx.fillStyle='rgba(0,0,0,.52)';ctx.beginPath();ctx.moveTo(8,10);ctx.lineTo(20,20);ctx.lineTo(0,20);ctx.closePath();ctx.fill();
      ctx.fillStyle=item.isRune?REALMS[item.realm].color:POWER_INFO[item.kind].color;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(9,0);ctx.lineTo(0,10);ctx.lineTo(-9,0);ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#0b1b17';ctx.font=`900 ${item.isRune?10:7}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.isRune?'R':POWER_INFO[item.kind].glyph,0,0);ctx.restore();
    });
    state.world.flies.forEach(f=>{if(f.collected||f.realm!==player.realm)return;const x=b.x+b.w*f.x,y=b.y+b.h-rowH*(f.row+.5);ctx.save();ctx.translate(x,y);ctx.shadowColor='#ffe15c';ctx.shadowBlur=12;ctx.fillStyle='#ffe15c';ctx.beginPath();ctx.arc(0,0,3,0,7);ctx.fill();ctx.fillStyle='rgba(255,250,205,.7)';ctx.beginPath();ctx.ellipse(-5,-2,5,2,-.3,0,7);ctx.ellipse(5,-2,5,2,.3,0,7);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,225,92,.4)';ctx.beginPath();ctx.arc(0,0,8+Math.sin(state.elapsed*6+f.phase)*2,0,7);ctx.stroke();ctx.restore();});
  }

  function drawRuneRadar(){
    const missing=state.world.runes.filter(r=>!r.collected);if(!missing.length)return;const b=view.board;
    missing.forEach((r,i)=>{if(r.realm===player.realm)return;const x=b.x+b.w-13,y=b.y+28+i*15;ctx.fillStyle=REALMS[r.realm].color;ctx.font='900 8px system-ui';ctx.textAlign='right';ctx.fillText(`${r.realm>player.realm?'↑':'↓'} RUNE · ${REALMS[r.realm].name}`,x,y);});
  }

  function drawPlayerTrail(){
    player.trail.forEach((t,i)=>{if(t.life<=0||t.realm!==player.realm)return;ctx.globalAlpha=Math.max(0,t.life)*.28;ctx.fillStyle=REALMS[t.realm].color;const s=2+i/player.trail.length*3;ctx.fillRect(t.x-s/2,t.y-s/2,s,s);});ctx.globalAlpha=1;
  }

  function drawPlayer() {
    const realm=REALMS[player.realm],p=palette(),hopY=Math.sin(player.hop*Math.PI)*10;
    ctx.save();ctx.translate(player.x,player.y-hopY);const squash=1-player.hop*.14;ctx.scale(1+player.hop*.08,squash);
    if(player.invincible>0&&Math.floor(state.elapsed*12)%2===0)ctx.globalAlpha=.35;
    if(player.shifting>0){ctx.strokeStyle=realm.color;ctx.globalAlpha=.5;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,22+player.shifting*15,0,7);ctx.stroke();ctx.globalAlpha=1;}
    ctx.fillStyle=p.shadow;drawFrogShape(11,13,realm.color,true);
    drawFrogShape(0,0,realm.color,false);
    if(state.power){ctx.strokeStyle=POWER_INFO[state.power].color;ctx.lineWidth=2;ctx.globalAlpha=.55+.3*Math.sin(state.elapsed*6);ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.stroke();ctx.globalAlpha=1;}
    ctx.restore();
  }

  function drawFrogShape(ox,oy,color,shadow) {
    ctx.save();ctx.translate(ox,oy);
    ctx.fillStyle=shadow?'rgba(0,0,0,.7)':color;
    ctx.beginPath();ctx.ellipse(0,4,15,12,0,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(-11,-6,7,8,0,0,7);ctx.ellipse(11,-6,7,8,0,0,7);ctx.fill();
    ctx.beginPath();ctx.ellipse(-16,11,8,4,-.35,0,7);ctx.ellipse(16,11,8,4,.35,0,7);ctx.fill();
    if(!shadow){ctx.fillStyle='#f4f5d9';ctx.beginPath();ctx.arc(-11,-7,3,0,7);ctx.arc(11,-7,3,0,7);ctx.fill();ctx.fillStyle='#102217';ctx.fillRect(-12,-8,2,3);ctx.fillRect(10,-8,2,3);ctx.strokeStyle='rgba(8,29,14,.6)';ctx.beginPath();ctx.arc(0,3,7,0,Math.PI);ctx.stroke();ctx.fillStyle='rgba(255,255,255,.28)';ctx.beginPath();ctx.ellipse(-5,-1,3,6,-.7,0,7);ctx.fill();}
    ctx.restore();
  }

  function drawBoardChampion(x,y,c,i) {
    ctx.save();ctx.translate(x,y);ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(6,7,9,3,0,0,7);ctx.fill();
    ctx.fillStyle=c.color;ctx.beginPath();ctx.ellipse(0,0,7,6,0,0,7);ctx.arc(-5,-5,3,0,7);ctx.arc(5,-5,3,0,7);ctx.fill();
    ctx.fillStyle=c.accent;if(i%3===0){ctx.fillRect(-7,-11,14,2);ctx.fillRect(-4,-14,2,4);ctx.fillRect(2,-14,2,4);}else if(i%3===1){ctx.beginPath();ctx.arc(0,-9,3,0,7);ctx.fill();}else{ctx.fillRect(-8,-10,16,2);}ctx.restore();
  }

  function drawParticles(){state.particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);});ctx.globalAlpha=1;}

  function drawPause(){ctx.fillStyle='rgba(1,8,7,.66)';ctx.fillRect(0,0,view.w,view.h);ctx.fillStyle='#eef8e7';ctx.textAlign='center';ctx.font='400 44px Georgia';ctx.fillText('Crossing Paused',view.w/2,view.h/2-10);ctx.fillStyle='#baf452';ctx.font='800 9px system-ui';ctx.fillText('PRESS P TO CONTINUE',view.w/2,view.h/2+23);}

  function hardRect(x,y,w,h,shadow,ox=10,oy=12){ctx.fillStyle=shadow;ctx.fillRect(x+ox,y+oy,w,h);}
  function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`;}
  function roundRect(x,y,w,h,r){const rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);ctx.beginPath();ctx.roundRect(x,y,w,h,rr);}

  function updateUI() {
    UI.score.textContent=String(Math.floor(state.score)).padStart(6,'0');UI.level.textContent=`${String(state.level+1).padStart(2,'0')} / 10`;
    UI.combo.textContent=`×${state.combo.toFixed(1)}`;UI.lives.textContent=Array.from({length:Math.max(0,state.lives)},()=> '●').join(' ');
    UI.levelName.textContent=LEVELS[state.level].name;UI.missionCopy.textContent=LEVELS[state.level].blurb;UI.modeLabel.textContent=MODES[state.mode].name;
    $('weather-tag').textContent=LEVELS[state.level].weather;$('rule-tag').textContent=LEVELS[state.level].rule;
    const pct=Math.max(0,state.time/state.maxTime*100);UI.timerFill.style.width=`${pct}%`;UI.timerFill.style.background=pct<25?'#ff665d':'var(--lime)';UI.timerText.textContent=Math.ceil(state.time);
    const info=state.power&&POWER_INFO[state.power];UI.powerStatus.innerHTML=`<span>POWER</span><strong>${info?`${info.label} ${Math.ceil(state.powerTime)}s`:'NONE'}</strong>`;
    $('shift-fill').style.width=`${state.shiftEnergy*100}%`;$('shift-text').textContent=state.shiftEnergy>=.34?'READY':`${Math.ceil(state.shiftEnergy/.34*100)}%`;
    const dashPct=state.dashCharges>=2?100:state.dashCharges*50+Math.min(50,state.dashRegen/5.5*50);$('dash-fill').style.width=`${dashPct}%`;$('dash-text').textContent=`${state.dashCharges} / 2`;
    $('best-score').textContent=`BEST ${String(state.records.bestScore).padStart(6,'0')}`;
    setRealmUI();
  }

  function setRealmUI() {
    document.querySelectorAll('.realm-button').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.realm)===player.realm));
    UI.depthIndicator.style.top=player.realm===1?'7px':player.realm===0?'67px':'135px';
  }

  function buildRuneUI(){UI.runeRow.innerHTML='';state.world.runes.forEach((r,i)=>{const chip=document.createElement('div');chip.className=`rune-chip${r.collected?' collected':''}`;chip.dataset.realm=r.realm;chip.title=`Rune ${i+1}: ${REALMS[r.realm].name}`;chip.textContent=r.collected?'✓':REALMS[r.realm].name[0];UI.runeRow.appendChild(chip);});}
  function buildLevelDots(){UI.levelDots.innerHTML='';LEVELS.forEach((_,i)=>{const d=document.createElement('div'),medal=state.records.medals[i];d.className=`level-dot${i<state.completed?' done':''}${i===state.level?' current':''}${medal?` medal-${medal.toLowerCase()}`:''}`;d.textContent=i<state.completed?'✓':i+1;d.title=medal?`Level ${i+1}: ${medal} medal`:`Level ${i+1}`;UI.levelDots.appendChild(d);});}
  function updateChampions(){UI.champCount.textContent=`${state.completed} / 10`;UI.championStrip.innerHTML='';if(!state.completed){UI.championStrip.innerHTML='<div class="empty-crown">♕</div><p>Your cheering squad grows with every realm conquered.</p>';return;}CHAMPIONS.slice(0,state.completed).forEach(c=>{const el=document.createElement('div');el.className='mini-champ';el.style.setProperty('--frog',c.color);el.style.setProperty('--accent',c.accent);el.title=`${c.name} — ${c.motto}`;el.innerHTML=`<em>${c.accessory}</em><i></i><b>${c.name.toUpperCase()}</b>`;UI.championStrip.appendChild(el);});}

  function initAudio(){if(state.audio)return;try{state.audio=new (window.AudioContext||window.webkitAudioContext)();}catch(_){}}
  function tone(freq,duration,type='sine',volume=.035){if(!state.audio||state.muted)return;const now=state.audio.currentTime,o=state.audio.createOscillator(),g=state.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(volume,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(state.audio.destination);o.start(now);o.stop(now+duration);}
  function fanfare(){[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,.22,'triangle',.045),i*100));}

  function togglePause(){if(!state.running||state.transitioning)return;state.paused=!state.paused;tone(state.paused?160:340,.08,'square');}

  function setDaypart(day){state.daypart=day;document.body.dataset.daypart=day;document.querySelectorAll('.day-btn').forEach(b=>b.classList.toggle('active',b.dataset.daypart===day));tone(day==='night'?260:day==='afternoon'?410:520,.08,'triangle');}

  function loadRecords(){try{const saved=JSON.parse(localStorage.getItem('realmHopper.v2')||'{}');state.records={bestScore:Number(saved.bestScore)||0,bestLevel:Number(saved.bestLevel)||0,medals:Array.isArray(saved.medals)?saved.medals:[]};state.muted=Boolean(saved.muted);}catch(_){state.records={bestScore:0,bestLevel:0,medals:[]};}}
  function saveRecords(){try{localStorage.setItem('realmHopper.v2',JSON.stringify({...state.records,muted:state.muted}));}catch(_){}}

  window.addEventListener('keydown',e=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    const k=e.key.toLowerCase();
    if(k==='p'||e.key==='Escape'){togglePause();return;}
    if(k==='1'||k==='2'||k==='3'){setDaypart(k==='1'?'morning':k==='2'?'afternoon':'night');return;}
    if(state.paused)return;
    if(k==='q'){shiftRealm(-1);return;}if(k==='e'){shiftRealm(1);return;}
    if(e.code==='Space'){movePlayer(0,1,true);return;}
    if(k==='w'||e.key==='ArrowUp')movePlayer(0,1);else if(k==='s'||e.key==='ArrowDown')movePlayer(0,-1);else if(k==='a'||e.key==='ArrowLeft')movePlayer(-1,0);else if(k==='d'||e.key==='ArrowRight')movePlayer(1,0);
  });

  document.querySelectorAll('.mode-card').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.mode-card').forEach(b=>b.classList.remove('selected'));btn.classList.add('selected');state.mode=btn.dataset.mode;tone(380,.05,'square');}));
  document.querySelectorAll('.day-btn').forEach(btn=>btn.addEventListener('click',()=>setDaypart(btn.dataset.daypart)));
  document.querySelectorAll('.realm-button').forEach(btn=>btn.addEventListener('click',()=>{const target=Number(btn.dataset.realm);if(target>player.realm)shiftRealm(1);else if(target<player.realm)shiftRealm(-1);}));
  $('sound-button').addEventListener('click',()=>{state.muted=!state.muted;$('sound-button').classList.toggle('muted',state.muted);$('sound-button').textContent=state.muted?'×':'♪';saveRecords();if(!state.muted){initAudio();tone(520,.08,'triangle');}});
  $('reset-button').addEventListener('click',()=>{state.records={bestScore:0,bestLevel:0,medals:[]};state.completed=0;saveRecords();buildLevelDots();updateChampions();updateUI();showToast('LOCAL RECORDS RESET',view.w/2,view.h*.82,true);});
  $('start-button').addEventListener('click',startGame);$('continue-button').addEventListener('click',()=>{if(state.finished&&state.lives<=0){UI.messageScreen.classList.remove('visible');UI.startScreen.classList.add('visible');state.running=false;state.transitioning=false;}else continueGame();});
  window.addEventListener('resize',resize);

  function frame(now){const dt=Math.min(.04,(now-state.lastTime)/1000||0);state.lastTime=now;update(dt);draw();requestAnimationFrame(frame);}
  loadRecords();resize();
  const previewLevel=Math.max(0,Math.min(9,(Number(new URLSearchParams(location.search).get('previewLevel'))||1)-1));
  state.world=buildWorld(previewLevel);state.level=previewLevel;state.maxTime=state.time=Math.round((50+LEVELS[previewLevel].lanes*3.15)*MODES[state.mode].time);state.lives=3;
  if(new URLSearchParams(location.search).has('previewLevel')){state.running=true;state.completed=previewLevel;UI.startScreen.classList.remove('visible');}
  syncPlayerTarget(true);$('sound-button').classList.toggle('muted',state.muted);$('sound-button').textContent=state.muted?'×':'♪';updateUI();buildRuneUI();buildLevelDots();updateChampions();requestAnimationFrame(frame);
})();
