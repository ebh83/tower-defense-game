import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 16;
const ROWS = 11;
const TICK_RATE = 50;

// "Fill screen" sizing (viewport-based, clamped)
const MIN_CELL = 32;
const MAX_CELL = 56;

const PATH = [
  { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
  { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 3, y: 3 }, { x: 3, y: 2 },
  { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
  { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 }, { x: 7, y: 7 }, { x: 7, y: 8 },
  { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 },
  { x: 11, y: 7 }, { x: 11, y: 6 }, { x: 11, y: 5 }, { x: 11, y: 4 },
  { x: 12, y: 4 }, { x: 13, y: 4 }, { x: 14, y: 4 }, { x: 15, y: 4 }
];

const TOWER_TYPES = {
  blaster: {
    name: 'Blaster', cost: 50, damage: 12, range: 2.5, fireRate: 400, color: '#00ff88', icon: '●', description: 'Rapid fire energy bolts',
    upgrades: [{ cost: 60, damageBonus: 8, rangeBonus: 0.3 }, { cost: 120, damageBonus: 15, rangeBonus: 0.5 }, { cost: 240, damageBonus: 30, rangeBonus: 0.7 }]
  },
  cannon: {
    name: 'Cannon', cost: 100, damage: 45, range: 2.2, fireRate: 1100, color: '#ff6b00', icon: '■', description: 'Heavy plasma rounds',
    upgrades: [{ cost: 100, damageBonus: 25, rangeBonus: 0.2 }, { cost: 200, damageBonus: 50, rangeBonus: 0.4 }, { cost: 400, damageBonus: 100, rangeBonus: 0.6 }]
  },
  frost: {
    name: 'Frost', cost: 75, damage: 8, range: 2.0, fireRate: 600, color: '#00d4ff', icon: '✦', description: 'Slows enemy movement', slow: 0.4,
    upgrades: [{ cost: 75, damageBonus: 5, rangeBonus: 0.3, slowBonus: 0.1 }, { cost: 150, damageBonus: 10, rangeBonus: 0.5, slowBonus: 0.15 }, { cost: 300, damageBonus: 20, rangeBonus: 0.7, slowBonus: 0.2 }]
  },
  rocket: {
    name: 'Rocket', cost: 150, damage: 60, range: 3.5, fireRate: 1800, color: '#ff0066', icon: '▲', description: 'Area damage missiles', splash: 1.2,
    upgrades: [{ cost: 150, damageBonus: 30, rangeBonus: 0.4, splashBonus: 0.3 }, { cost: 300, damageBonus: 60, rangeBonus: 0.6, splashBonus: 0.5 }, { cost: 600, damageBonus: 120, rangeBonus: 1, splashBonus: 0.8 }]
  },
  shock: {
    name: 'Shock', cost: 200, damage: 30, range: 2.3, fireRate: 500, color: '#ffdd00', icon: '⚡', description: 'Chains to nearby foes', chain: 3,
    upgrades: [{ cost: 200, damageBonus: 18, rangeBonus: 0.2, chainBonus: 1 }, { cost: 400, damageBonus: 35, rangeBonus: 0.4, chainBonus: 2 }, { cost: 800, damageBonus: 70, rangeBonus: 0.6, chainBonus: 3 }]
  }
};

const ENEMY_TYPES = {
  grunt: { name: 'Grunt', health: 40, speed: 0.06, reward: 10, color: '#88ff88', size: 0.55 },
  runner: { name: 'Runner', health: 25, speed: 0.12, reward: 15, color: '#ff88ff', size: 0.45 },
  brute: { name: 'Brute', health: 150, speed: 0.035, reward: 25, color: '#ff8844', size: 0.75 },
  swarm: { name: 'Swarm', health: 15, speed: 0.09, reward: 5, color: '#88ffff', size: 0.35 },
  tank: { name: 'Tank', health: 300, speed: 0.025, reward: 50, armor: 8, color: '#ff4444', size: 0.85 },
  phantom: { name: 'Phantom', health: 60, speed: 0.1, reward: 30, color: '#aa88ff', size: 0.5 },
  boss: { name: 'BOSS', health: 1500, speed: 0.018, reward: 300, armor: 5, color: '#ffff00', size: 1.1 }
};

const WAVES = [
  { enemies: [{ type: 'grunt', count: 6, delay: 700 }] },
  { enemies: [{ type: 'grunt', count: 8, delay: 600 }, { type: 'runner', count: 3, delay: 400 }] },
  { enemies: [{ type: 'runner', count: 8, delay: 350 }, { type: 'grunt', count: 5, delay: 600 }] },
  { enemies: [{ type: 'brute', count: 3, delay: 1200 }, { type: 'grunt', count: 8, delay: 500 }] },
  { enemies: [{ type: 'swarm', count: 20, delay: 180 }] },
  { enemies: [{ type: 'phantom', count: 6, delay: 500 }, { type: 'runner', count: 6, delay: 400 }] },
  { enemies: [{ type: 'tank', count: 2, delay: 2000 }, { type: 'grunt', count: 10, delay: 400 }] },
  { enemies: [{ type: 'swarm', count: 25, delay: 150 }, { type: 'brute', count: 4, delay: 1000 }] },
  { enemies: [{ type: 'phantom', count: 10, delay: 400 }, { type: 'tank', count: 2, delay: 1500 }] },
  { enemies: [{ type: 'boss', count: 1, delay: 0 }, { type: 'grunt', count: 12, delay: 400 }] },
  { enemies: [{ type: 'runner', count: 15, delay: 250 }, { type: 'brute', count: 6, delay: 800 }] },
  { enemies: [{ type: 'tank', count: 4, delay: 1200 }, { type: 'phantom', count: 8, delay: 450 }] },
  { enemies: [{ type: 'swarm', count: 40, delay: 120 }, { type: 'tank', count: 3, delay: 1500 }] },
  { enemies: [{ type: 'boss', count: 2, delay: 4000 }, { type: 'brute', count: 5, delay: 900 }] },
  { enemies: [{ type: 'boss', count: 3, delay: 3000 }, { type: 'phantom', count: 12, delay: 350 }] }
];

const isOnPath = (x, y) => PATH.some(p => p.x === x && p.y === y);

export default function TowerDefense() {
  const [gameState, setGameState] = useState('menu');
  const [gold, setGold] = useState(200);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(0);
  const [score, setScore] = useState(0);
  const [towers, setTowers] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [effects, setEffects] = useState([]);
  const [selectedTowerType, setSelectedTowerType] = useState(null);
  const [selectedTower, setSelectedTower] = useState(null);
  const [waveInProgress, setWaveInProgress] = useState(false);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [showAllRanges, setShowAllRanges] = useState(false);

  // viewport-based cell size (fills screen-ish, not fully fluid)
  const [cellSize, setCellSize] = useState(44);
const [shake, setShake] = useState({ x: 0, y: 0, t: 0 });
const shakeRef = useRef(0);

const doShake = useCallback((power = 6) => {
  // throttle so it doesn't go insane
  const now = Date.now();
  if (now - shakeRef.current < 60) return;
  shakeRef.current = now;

  const ang = Math.random() * Math.PI * 2;
  setShake({ x: Math.cos(ang) * power, y: Math.sin(ang) * power, t: 90 });
}, []);
useEffect(() => {
  if (shake.t <= 0) return;
  const id = setInterval(() => {
    setShake(s => {
      const nt = s.t - 16;
      if (nt <= 0) return { x: 0, y: 0, t: 0 };
      return { x: s.x * 0.75, y: s.y * 0.75, t: nt };
    });
  }, 16);
  return () => clearInterval(id);
}, [shake.t]);

  useEffect(() => {
    const update = () => {
      // leave room for HUD + side panel
      const usableW = window.innerWidth - 360;  // side panel + padding
      const usableH = window.innerHeight - 200; // HUD + margins

      const size = Math.floor(Math.min(usableW / GRID_SIZE, usableH / ROWS));
      setCellSize(Math.max(MIN_CELL, Math.min(MAX_CELL, size)));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const boardW = GRID_SIZE * cellSize;
  const boardH = ROWS * cellSize;

  const projR = Math.max(4, Math.round(cellSize * 0.11)); // projectile radius-ish

  const idRef = useRef({ enemy: 0, projectile: 0, effect: 0 });
  const lastFireRef = useRef({});
  const spawnedRef = useRef(false);

  const startGame = () => {
    setGameState('playing');
    setGold(200);
    setLives(20);
    setWave(0);
    setScore(0);
    setTowers([]);
    setEnemies([]);
    setProjectiles([]);
    setEffects([]);
    setSelectedTowerType(null);
    setSelectedTower(null);
    setWaveInProgress(false);
    lastFireRef.current = {};
    spawnedRef.current = false;
  };

  const spawnWave = useCallback(() => {
    if (wave >= WAVES.length || spawnedRef.current) return;
    spawnedRef.current = true;
    setWaveInProgress(true);

    const waveData = WAVES[wave];
    let totalDelay = 0;

    waveData.enemies.forEach(group => {
      const baseEnemy = ENEMY_TYPES[group.type];
      for (let i = 0; i < group.count; i++) {
        setTimeout(() => {
          const multiplier = 1 + wave * 0.12;
          setEnemies(prev => [...prev, {
            id: idRef.current.enemy++,
            type: group.type,
            ...baseEnemy,
            health: Math.floor(baseEnemy.health * multiplier),
            maxHealth: Math.floor(baseEnemy.health * multiplier),
            pathIndex: 0,
            progress: 0,
            slowTimer: 0,
            slowAmount: 1
          }]);
        }, totalDelay + i * group.delay);
      }
      totalDelay += group.count * group.delay + 400;
    });
  }, [wave]);

  const placeTower = (x, y) => {
    if (!selectedTowerType || isOnPath(x, y)) return;
    if (towers.some(t => t.x === x && t.y === y)) return;

    const towerType = TOWER_TYPES[selectedTowerType];
    if (gold < towerType.cost) return;

    setGold(g => g - towerType.cost);
    const newTower = { id: Date.now(), x, y, type: selectedTowerType, ...towerType, level: 0 };
    setTowers(prev => [...prev, newTower]);
    lastFireRef.current[newTower.id] = 0;
    setSelectedTowerType(null);
  };

  const upgradeTower = (tower) => {
    const towerType = TOWER_TYPES[tower.type];
    if (tower.level >= 3) return;
    const upgrade = towerType.upgrades[tower.level];
    if (gold < upgrade.cost) return;

    setGold(g => g - upgrade.cost);
    setTowers(prev => prev.map(t => {
      if (t.id !== tower.id) return t;
      const u = { ...t, level: t.level + 1, damage: t.damage + upgrade.damageBonus, range: t.range + upgrade.rangeBonus };
      if (t.slow && upgrade.slowBonus) u.slow = t.slow + upgrade.slowBonus;
      if (t.splash && upgrade.splashBonus) u.splash = t.splash + upgrade.splashBonus;
      if (t.chain && upgrade.chainBonus) u.chain = t.chain + upgrade.chainBonus;
      return u;
    }));
    setSelectedTower(prev =>
      prev?.id === tower.id
        ? { ...prev, level: prev.level + 1, damage: prev.damage + upgrade.damageBonus, range: prev.range + upgrade.rangeBonus }
        : prev
    );
  };

  const sellTower = (tower) => {
    const towerType = TOWER_TYPES[tower.type];
    let total = towerType.cost;
    for (let i = 0; i < tower.level; i++) total += towerType.upgrades[i].cost;
    setGold(g => g + Math.floor(total * 0.6));
    setTowers(prev => prev.filter(t => t.id !== tower.id));
    delete lastFireRef.current[tower.id];
    setSelectedTower(null);
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const loop = setInterval(() => {
      const now = Date.now();

      setEnemies(prev => {
        let escaped = 0;
        const updated = prev.map(e => {
          let { pathIndex, progress, slowTimer, slowAmount } = e;
          if (slowTimer > 0) { slowTimer -= TICK_RATE; if (slowTimer <= 0) slowAmount = 1; }
          progress += e.speed * slowAmount;
          if (progress >= 1) { progress = 0; pathIndex++; }
          return { ...e, pathIndex, progress, slowTimer, slowAmount };
        });

        const alive = updated.filter(e => {
          if (e.pathIndex >= PATH.length) { escaped++; return false; }
          return e.health > 0;
        });

        if (escaped > 0) setLives(l => { const n = l - escaped; if (n <= 0) setGameState('defeat'); return Math.max(0, n); });
        return alive;
      });

      // Tower shooting
      setEnemies(currentEnemies => {
        setTowers(currentTowers => {
          currentTowers.forEach(tower => {
            const lastFire = lastFireRef.current[tower.id] || 0;
            if (now - lastFire < tower.fireRate) return;

            let target = null, targetDist = Infinity, targetPos = null;

            currentEnemies.forEach(enemy => {
              if (enemy.pathIndex >= PATH.length || enemy.health <= 0) return;
              const cur = PATH[enemy.pathIndex], nxt = PATH[Math.min(enemy.pathIndex + 1, PATH.length - 1)];
              const pos = { x: cur.x + (nxt.x - cur.x) * enemy.progress + 0.5, y: cur.y + (nxt.y - cur.y) * enemy.progress + 0.5 };
              const dist = Math.sqrt((tower.x + 0.5 - pos.x) ** 2 + (tower.y + 0.5 - pos.y) ** 2);
              if (dist <= tower.range && dist < targetDist) { targetDist = dist; target = enemy; targetPos = pos; }
            });

            if (target && targetPos) {
              lastFireRef.current[tower.id] = now;
              setProjectiles(p => [...p, {
                id: idRef.current.projectile++,
                x: tower.x + 0.5, y: tower.y + 0.5,
                targetX: targetPos.x, targetY: targetPos.y, targetId: target.id,
                damage: tower.damage, color: tower.color, type: tower.type,
                slow: tower.slow, splash: tower.splash, chain: tower.chain, speed: 0.35
              }]);
            }
          });
          return currentTowers;
        });
        return currentEnemies;
      });

      // Update projectiles
      setProjectiles(prev => {
        const remaining = [];
        prev.forEach(proj => {
          const dx = proj.targetX - proj.x, dy = proj.targetY - proj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < proj.speed) {
            setEnemies(enemies => {
              let hitIds = [];

              if (proj.splash) {
                enemies.forEach(e => {
                  const cur = PATH[e.pathIndex], nxt = PATH[Math.min(e.pathIndex + 1, PATH.length - 1)];
                  const pos = { x: cur.x + (nxt.x - cur.x) * e.progress + 0.5, y: cur.y + (nxt.y - cur.y) * e.progress + 0.5 };
                  if (Math.sqrt((proj.targetX - pos.x) ** 2 + (proj.targetY - pos.y) ** 2) <= proj.splash) hitIds.push(e.id);
                });
                setEffects(eff => [...eff, { id: idRef.current.effect++, type: 'explosion', x: proj.targetX, y: proj.targetY, radius: proj.splash, color: proj.color, timer: 300 }]);
              } else if (proj.chain) {
                hitIds = [proj.targetId];
                let lastPos = { x: proj.targetX, y: proj.targetY };
                for (let i = 0; i < proj.chain; i++) {
                  let closest = null, closestDist = 2.5, closestPos = null;
                  enemies.forEach(e => {
                    if (hitIds.includes(e.id)) return;
                    const cur = PATH[e.pathIndex], nxt = PATH[Math.min(e.pathIndex + 1, PATH.length - 1)];
                    const pos = { x: cur.x + (nxt.x - cur.x) * e.progress + 0.5, y: cur.y + (nxt.y - cur.y) * e.progress + 0.5 };
                    const d = Math.sqrt((lastPos.x - pos.x) ** 2 + (lastPos.y - pos.y) ** 2);
                    if (d < closestDist) { closestDist = d; closest = e; closestPos = pos; }
                  });
                  if (closest && closestPos) {
                    hitIds.push(closest.id);
                    setEffects(eff => [...eff, { id: idRef.current.effect++, type: 'lightning', x1: lastPos.x, y1: lastPos.y, x2: closestPos.x, y2: closestPos.y, color: proj.color, timer: 180 }]);
                    lastPos = closestPos;
                  }
                }
              } else {
                hitIds = [proj.targetId];
              }

              return enemies.map(e => {
                if (!hitIds.includes(e.id)) return e;
                const armor = e.armor || 0, dmg = Math.max(1, proj.damage - armor), newHealth = e.health - dmg;
                if (newHealth <= 0) {
                  setGold(g => g + e.reward);
                  setScore(s => s + e.reward * 10);
                  setEffects(eff => [...eff, { id: idRef.current.effect++, type: 'death', x: proj.targetX, y: proj.targetY, color: e.color, timer: 350 }]);
                }
                return { ...e, health: newHealth, slowAmount: proj.slow ? (1 - proj.slow) : e.slowAmount, slowTimer: proj.slow ? 2000 : e.slowTimer };
              }).filter(e => e.health > 0);
            });
          } else {
            remaining.push({ ...proj, x: proj.x + (dx / dist) * proj.speed, y: proj.y + (dy / dist) * proj.speed });
          }
        });
        return remaining;
      });

      setEffects(prev => prev.map(e => ({ ...e, timer: e.timer - TICK_RATE })).filter(e => e.timer > 0));
    }, TICK_RATE);

    return () => clearInterval(loop);
  }, [gameState]);

  // Wave completion check
  useEffect(() => {
    if (gameState !== 'playing' || !waveInProgress) return;
    if (enemies.length === 0 && spawnedRef.current) {
      const t = setTimeout(() => {
        setWaveInProgress(false);
        spawnedRef.current = false;
        setWave(w => w + 1);
        setGold(g => g + 50 + wave * 15);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [enemies.length, waveInProgress, gameState, wave]);

  // Check victory
  useEffect(() => {
    if (wave >= WAVES.length && !waveInProgress && gameState === 'playing') {
      setGameState('victory');
    }
  }, [wave, waveInProgress, gameState]);

  if (gameState === 'menu') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,255,200,0.1) 0%, transparent 60%)', top: '10%', left: '5%', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,100,150,0.08) 0%, transparent 60%)', bottom: '10%', right: '10%', filter: 'blur(60px)' }} />

        <div style={{ zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#fff', marginBottom: 8 }}>
            <span style={{ color: '#00ffc8' }}>NEON</span> SIEGE
          </div>
          <div style={{ fontSize: '1rem', color: '#5a7a9a', letterSpacing: '0.5em', textTransform: 'uppercase', marginBottom: 50 }}>Tower Defense</div>

          <button onClick={startGame} style={{ padding: '20px 80px', fontSize: '1.2rem', fontWeight: 700, background: 'linear-gradient(135deg, #00ffc8, #00c9a0)', border: 'none', borderRadius: 50, color: '#0a0a1a', cursor: 'pointer', boxShadow: '0 0 50px rgba(0,255,200,0.3)', transition: 'all 0.3s' }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 0 70px rgba(0,255,200,0.5)'; }}
            onMouseLeave={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 0 50px rgba(0,255,200,0.3)'; }}>
            START GAME
          </button>

          <div style={{ marginTop: 60, display: 'flex', gap: 40, color: '#4a6a8a', fontSize: '0.9rem' }}>
            <div>● Build Towers</div><div>■ Upgrade Power</div><div>⚡ Stop the Horde</div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'victory' || gameState === 'defeat') {
    const win = gameState === 'victory';
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, background: `radial-gradient(circle, ${win ? 'rgba(0,255,200,0.15)' : 'rgba(255,80,80,0.15)'} 0%, transparent 60%)`, filter: 'blur(100px)' }} />
        <div style={{ fontSize: '4rem', fontWeight: 900, color: win ? '#00ffc8' : '#ff5050', textShadow: `0 0 60px ${win ? 'rgba(0,255,200,0.5)' : 'rgba(255,80,80,0.5)'}`, zIndex: 1 }}>{win ? 'VICTORY!' : 'DEFEATED'}</div>
        <div style={{ marginTop: 30, padding: '30px 60px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', zIndex: 1 }}>
          <div style={{ color: '#666', marginBottom: 8 }}>SCORE</div>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: '#fff' }}>{score.toLocaleString()}</div>
          <div style={{ color: '#555', marginTop: 10 }}>Wave {wave}/{WAVES.length}</div>
        </div>
        <button onClick={startGame} style={{ marginTop: 40, padding: '16px 50px', fontSize: '1rem', fontWeight: 600, background: 'transparent', border: '2px solid #00ffc8', borderRadius: 50, color: '#00ffc8', cursor: 'pointer', zIndex: 1 }}>PLAY AGAIN</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0a1a 0%, #0d1520 100%)', fontFamily: 'system-ui', color: '#fff', padding: 16 }}>
      {/* Path animation keyframes */}

      <style>{`
  @keyframes pathFlow {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 200%; }
  }

  @keyframes floatUp {
    0% { transform: translate(-50%, 0) scale(1); opacity: 0; }
    15% { opacity: 1; }
    100% { transform: translate(-50%, -22px) scale(1.05); opacity: 0; }
  }

  @keyframes pop {
    0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
    20% { opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.25); opacity: 0; }
  }

  @keyframes hitFlash {
    0% { opacity: 0.0; }
    25% { opacity: 0.9; }
    100% { opacity: 0.0; }
  }
`}</style>

      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '14px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', gap: 40 }}>
          {[
            { label: 'GOLD', value: gold, color: '#ffd700', icon: '◆' },
            { label: 'LIVES', value: lives, color: '#ff6080', icon: '♥' },
            { label: 'WAVE', value: `${wave + 1}/${WAVES.length}`, color: '#00ffc8', icon: '◎' },
            { label: 'SCORE', value: score.toLocaleString(), color: '#60a0ff', icon: '★' }
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '0.7rem', color: '#556', letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.icon} {s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#556', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAllRanges} onChange={e => setShowAllRanges(e.target.checked)} style={{ accentColor: '#00ffc8' }} />Show Ranges
          </label>
          {!waveInProgress && wave < WAVES.length && (
            <button onClick={spawnWave} style={{ padding: '12px 30px', fontSize: '0.95rem', fontWeight: 700, background: 'linear-gradient(135deg, #00ffc8, #00b090)', border: 'none', borderRadius: 30, color: '#0a0a1a', cursor: 'pointer', boxShadow: '0 0 25px rgba(0,255,200,0.3)' }}>▶ START WAVE</button>
          )}
          {waveInProgress && <div style={{ padding: '12px 30px', color: '#ff9050', border: '1px solid rgba(255,144,80,0.3)', borderRadius: 30 }}>⚔ WAVE IN PROGRESS</div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Game Board */}
        <div style={{ position: 'relative', width: boardW, height: boardH, background: '#0c1018', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',     transform: `translate(${shake.x}px, ${shake.y}px)`,
    transition: shake.t > 0 ? 'transform 0ms' : 'transform 120ms ease' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: `${cellSize}px ${cellSize}px`
          }} />

          {/* Path (more visible) */}
          {PATH.map((p, i) => (
            <div
              key={`path-${i}`}
              style={{
                position: 'absolute',
                left: p.x * cellSize,
                top: p.y * cellSize,
                width: cellSize,
                height: cellSize,
                background: 'linear-gradient(135deg, rgba(0,255,200,0.35), rgba(0,180,255,0.25))',
                backgroundSize: '200% 200%',
                animation: 'pathFlow 6s linear infinite',
                boxShadow: 'inset 0 0 0 1px rgba(0,255,200,0.55), 0 0 14px rgba(0,255,200,0.35)',
                borderRadius: 6,
                zIndex: 1
              }}
            />
          ))}

          {/* Clickable cells */}
          {[...Array(ROWS)].map((_, y) => [...Array(GRID_SIZE)].map((_, x) => {
            const onPath = isOnPath(x, y), hasTower = towers.some(t => t.x === x && t.y === y);
            const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
            const canPlace = selectedTowerType && !onPath && !hasTower && gold >= TOWER_TYPES[selectedTowerType].cost;
            return (
              <div
                key={`c-${x}-${y}`}
                onClick={() => {
                  if (selectedTowerType && !onPath && !hasTower) placeTower(x, y);
                  else if (hasTower) {
                    const t = towers.find(t => t.x === x && t.y === y);
                    setSelectedTower(selectedTower?.id === t.id ? null : t);
                    setSelectedTowerType(null);
                  } else setSelectedTower(null);
                }}
                onMouseEnter={() => setHoveredCell({ x, y })}
                onMouseLeave={() => setHoveredCell(null)}
                style={{
                  position: 'absolute',
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background:
                    isHovered && canPlace ? 'rgba(0,255,200,0.15)'
                      : isHovered && selectedTowerType && !canPlace ? 'rgba(255,80,80,0.15)'
                        : 'transparent',
                  cursor: (!onPath && (selectedTowerType || hasTower)) ? 'pointer' : 'default',
                  zIndex: 5
                }}
              />
            );
          }))}

          {/* Range circles */}
          {towers.map(tower => (showAllRanges || selectedTower?.id === tower.id) && (
            <div
              key={`r-${tower.id}`}
              style={{
                position: 'absolute',
                left: (tower.x + 0.5) * cellSize - tower.range * cellSize,
                top: (tower.y + 0.5) * cellSize - tower.range * cellSize,
                width: tower.range * 2 * cellSize,
                height: tower.range * 2 * cellSize,
                border: `2px solid ${tower.color}`,
                borderRadius: '50%',
                opacity: selectedTower?.id === tower.id ? 0.7 : 0.3,
                pointerEvents: 'none',
                zIndex: 2
              }}
            />
          ))}

          {/* Placement preview range */}
          {selectedTowerType && hoveredCell && !isOnPath(hoveredCell.x, hoveredCell.y) && !towers.some(t => t.x === hoveredCell.x && t.y === hoveredCell.y) && (
            <div
              style={{
                position: 'absolute',
                left: (hoveredCell.x + 0.5) * cellSize - TOWER_TYPES[selectedTowerType].range * cellSize,
                top: (hoveredCell.y + 0.5) * cellSize - TOWER_TYPES[selectedTowerType].range * cellSize,
                width: TOWER_TYPES[selectedTowerType].range * 2 * cellSize,
                height: TOWER_TYPES[selectedTowerType].range * 2 * cellSize,
                border: `2px dashed ${TOWER_TYPES[selectedTowerType].color}`,
                borderRadius: '50%',
                opacity: 0.6,
                pointerEvents: 'none',
                zIndex: 10
              }}
            />
          )}

          {/* Towers */}
          {towers.map(tower => (
            <div
              key={tower.id}
              onClick={() => setSelectedTower(selectedTower?.id === tower.id ? null : tower)}
              style={{
                position: 'absolute',
                left: tower.x * cellSize + 4,
                top: tower.y * cellSize + 4,
                width: cellSize - 8,
                height: cellSize - 8,
                background: `radial-gradient(circle at 30% 30%, ${tower.color}80, ${tower.color}40)`,
                border: `2px solid ${tower.color}`,
                borderRadius: tower.type === 'cannon' ? 6 : tower.type === 'rocket' ? '4px 4px 50% 50%' : '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${Math.max(18, Math.round(cellSize * 0.35))}px`,
                color: tower.color,
                boxShadow: `0 0 ${15 + tower.level * 8}px ${tower.color}60`,
                zIndex: 10,
                cursor: 'pointer'
              }}
            >
              {tower.icon}
              {tower.level > 0 && (
                <div style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  width: 16,
                  height: 16,
                  background: '#ffd700',
                  borderRadius: '50%',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {tower.level}
                </div>
              )}
            </div>
          ))}

          {/* Enemies */}
          {enemies.map(enemy => {
            if (enemy.pathIndex >= PATH.length) return null;
            const cur = PATH[enemy.pathIndex], nxt = PATH[Math.min(enemy.pathIndex + 1, PATH.length - 1)];
            const ex = (cur.x + (nxt.x - cur.x) * enemy.progress) * cellSize;
            const ey = (cur.y + (nxt.y - cur.y) * enemy.progress) * cellSize;
            return (
              <div
                key={enemy.id}
                style={{
                  position: 'absolute',
                  left: ex + cellSize * (0.5 - enemy.size / 2),
                  top: ey + cellSize * (0.5 - enemy.size / 2),
                  width: cellSize * enemy.size,
                  height: cellSize * enemy.size,
                  zIndex: 15
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `radial-gradient(circle at 35% 35%, ${enemy.color}, ${enemy.color}88)`,
                    borderRadius: enemy.type === 'tank' ? '25%' : enemy.type === 'brute' ? '30%' : '50%',
                    boxShadow: `0 0 16px ${enemy.color}, 0 0 4px #000`,
                    border: enemy.slowAmount < 1 ? '2px solid #00d4ff' : 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ position: 'absolute', top: -6, left: '10%', width: '80%', height: 3, background: '#222', borderRadius: 2 }}>
                  <div style={{
                    width: `${(enemy.health / enemy.maxHealth) * 100}%`,
                    height: '100%',
                    background: enemy.health > enemy.maxHealth * 0.6 ? '#00ff88' : enemy.health > enemy.maxHealth * 0.3 ? '#ffaa00' : '#ff4444',
                    borderRadius: 2
                  }} />
                </div>
              </div>
            );
          })}

          {/* Projectiles */}
          {projectiles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x * cellSize - projR,
                top: p.y * cellSize - projR,
                width: projR * 2,
                height: projR * 2,
                background: p.color,
                borderRadius: '50%',
                boxShadow: `0 0 12px ${p.color}`,
                zIndex: 20,
                pointerEvents: 'none'
              }}
            />
          ))}

          {/* Effects */}
          {effects.map(e => {
            if (e.type === 'explosion') return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.x * cellSize - e.radius * cellSize,
                  top: e.y * cellSize - e.radius * cellSize,
                  width: e.radius * 2 * cellSize,
                  height: e.radius * 2 * cellSize,
                  background: `radial-gradient(circle, ${e.color}60, transparent 70%)`,
                  borderRadius: '50%',
                  opacity: e.timer / 300,
                  zIndex: 25,
                  pointerEvents: 'none'
                }}
              />
            );
            if (e.type === 'lightning') return (
              <svg key={e.id} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 25, pointerEvents: 'none', opacity: e.timer / 180 }}>
                <line x1={e.x1 * cellSize} y1={e.y1 * cellSize} x2={e.x2 * cellSize} y2={e.y2 * cellSize} stroke={e.color} strokeWidth="3" style={{ filter: `drop-shadow(0 0 6px ${e.color})` }} />
              </svg>
            );
            if (e.type === 'death') return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.x * cellSize - 15,
                  top: e.y * cellSize - 15,
                  width: 30,
                  height: 30,
                  background: `radial-gradient(circle, ${e.color}, transparent)`,
                  borderRadius: '50%',
                  opacity: e.timer / 350,
                  transform: `scale(${1.5 - e.timer / 700})`,
                  zIndex: 25,
                  pointerEvents: 'none'
                }}
              />
            );
            return null;
          })}
        </div>

        {/* Side Panel */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: '#556', letterSpacing: '0.15em', marginBottom: 12 }}>BUILD TOWERS</div>
            {Object.entries(TOWER_TYPES).map(([key, tower]) => {
              const canAfford = gold >= tower.cost, isSel = selectedTowerType === key;
              return (
                <div key={key} onClick={() => canAfford && setSelectedTowerType(isSel ? null : key)} style={{ padding: '10px 12px', marginBottom: 6, background: isSel ? `linear-gradient(135deg, ${tower.color}25, ${tower.color}10)` : 'rgba(255,255,255,0.02)', border: isSel ? `1px solid ${tower.color}` : '1px solid transparent', borderRadius: 10, cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : 0.4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><span style={{ color: tower.color, marginRight: 8 }}>{tower.icon}</span>{tower.name}</span>
                    <span style={{ color: '#ffd700', fontWeight: 600 }}>◆{tower.cost}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#556', marginTop: 4 }}>{tower.description}</div>
                </div>
              );
            })}
          </div>

          {selectedTower && (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, border: `1px solid ${selectedTower.color}40` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ color: selectedTower.color, fontWeight: 600 }}>{selectedTower.icon} {selectedTower.name}</span>
                <span style={{ background: 'rgba(255,215,0,0.15)', color: '#ffd700', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>LV {selectedTower.level + 1}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#889', marginBottom: 14 }}>
                <div>Damage: {selectedTower.damage}</div>
                <div>Range: {selectedTower.range.toFixed(1)}</div>
                {selectedTower.slow && <div>Slow: {(selectedTower.slow * 100).toFixed(0)}%</div>}
                {selectedTower.splash && <div>Splash: {selectedTower.splash.toFixed(1)}</div>}
                {selectedTower.chain && <div>Chain: {selectedTower.chain}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedTower.level < 3 && (
                  <button onClick={() => upgradeTower(selectedTower)} disabled={gold < TOWER_TYPES[selectedTower.type].upgrades[selectedTower.level].cost} style={{ flex: 1, padding: '10px', background: gold >= TOWER_TYPES[selectedTower.type].upgrades[selectedTower.level].cost ? 'linear-gradient(135deg, #00ffc8, #00b090)' : '#333', border: 'none', borderRadius: 8, color: gold >= TOWER_TYPES[selectedTower.type].upgrades[selectedTower.level].cost ? '#0a0a1a' : '#666', fontWeight: 600, cursor: gold >= TOWER_TYPES[selectedTower.type].upgrades[selectedTower.level].cost ? 'pointer' : 'not-allowed' }}>
                    UPGRADE ◆{TOWER_TYPES[selectedTower.type].upgrades[selectedTower.level].cost}
                  </button>
                )}
                <button onClick={() => sellTower(selectedTower)} style={{ padding: '10px 16px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, color: '#ff5050', fontWeight: 600, cursor: 'pointer' }}>SELL</button>
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', color: '#556', letterSpacing: '0.15em', marginBottom: 10 }}>ENEMIES</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(ENEMY_TYPES).map(([key, e]) => (
                <div key={key} title={`HP: ${e.health} | Speed: ${e.speed} | Gold: ${e.reward}`} style={{ padding: '4px 10px', background: `${e.color}15`, borderRadius: 6, fontSize: '0.7rem', color: e.color, border: `1px solid ${e.color}30` }}>{e.name}</div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#556', lineHeight: 1.8 }}>
            <strong style={{ color: '#778' }}>How to Play</strong><br />
            • Select tower → Click grid to build<br />
            • Click tower → Upgrade or sell<br />
            • Don't let enemies reach the end!
          </div>
        </div>
      </div>
    </div>
  );
}
