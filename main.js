import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

/* ════════════════════════════════
   화면 전환
════════════════════════════════ */
const mainScreen   = document.getElementById('main-screen');
const gameScreen   = document.getElementById('game-screen');
const marketScreen = document.getElementById('market-screen');
const statScreen   = document.getElementById('stat-screen');

function showScreen(target) {
  [mainScreen, gameScreen, marketScreen, statScreen].forEach(s => s.classList.add('hidden'));
  target.classList.remove('hidden');
}

document.getElementById('btn-game').addEventListener('click', () => {
  showScreen(gameScreen);
  initGame();
});
document.getElementById('btn-market').addEventListener('click', () => showScreen(marketScreen));
document.getElementById('btn-stat').addEventListener('click',   () => { updateStatPointUI(); showScreen(statScreen); });
document.getElementById('btn-back').addEventListener('click',   () => { exitGame(); showScreen(mainScreen); });
document.getElementById('btn-market-back').addEventListener('click', () => showScreen(mainScreen));
document.getElementById('btn-stat-back').addEventListener('click',   () => showScreen(mainScreen));

const STAT_POINT_KEY  = 'hanako-nana-stat-points';
const ENHANCE_KEY     = 'hanako-nana-enhancements';
let statPoints        = Number(localStorage.getItem(STAT_POINT_KEY) || 0);
let enhancements      = JSON.parse(localStorage.getItem(ENHANCE_KEY) || '{}');

/* ── 강화 스킬 정의 ── */
const ENHANCE_SKILLS = {
  reload_speed: {
    maxLevel: 3,
    description: '강화할 때마다 장전 시간이 0.002초 단축됩니다.',
    levels: [
      { cost: 2,  desc: '장전 속도 -0.002초', reloadDelta: 0.002 },
      { cost: 2,  desc: '장전 속도 -0.004초', reloadDelta: 0.004 },
      { cost: 2,  desc: '장전 속도 -0.006초', reloadDelta: 0.006 },
    ]
  },
  magazine: {
    maxLevel: 3,
    description: '강화할 때마다 총알 수가 1발 증가합니다.',
    levels: [
      { cost: 5,  desc: '탄창 +1발',  mag: 1 },
      { cost: 5,  desc: '탄창 +2발',  mag: 2 },
      { cost: 5,  desc: '탄창 +3발',  mag: 3 },
    ]
  },
  fire_rate: {
    maxLevel: 3,
    description: '강화할 때마다 발사 쿨다운이 0.002초 단축됩니다.',
    levels: [
      { cost: 3,  desc: '발사속도 -0.002초', fireDelta: 0.002 },
      { cost: 3,  desc: '발사속도 -0.004초', fireDelta: 0.004 },
      { cost: 3,  desc: '발사속도 -0.006초', fireDelta: 0.006 },
    ]
  },
  triple_a: {
    maxLevel: 1,
    description: 'A키로 사용합니다. 5초 동안 자동으로 목표물에 에임됩니다. 쿨타임 25초.',
    levels: [
      { cost: 30, desc: 'A키: 5초 자동에임 (쿨타임 25초)' }
    ]
  },
  cliche: {
    maxLevel: 1,
    description: '1번키로 사용합니다. 10초 동안 노란색 블록 3개가 생성되고, 1개 파괴 시 코인 +10. 쿨타임 45초.',
    levels: [
      { cost: 55, desc: '1키: 10초간 노란 블록 3개 (코인+10/개) (쿨타임 45초)' }
    ]
  }
};

function getSkillLevel(id) {
  return enhancements[id] || 0;
}

function getAgentStats() {
  const stats = { reloadDelta: 0, fireDelta: 0, magBonus: 0, damage: 1 };
  const reloadLv = getSkillLevel('reload_speed');
  const fireLv   = getSkillLevel('fire_rate');
  const magLv    = getSkillLevel('magazine');
  if (reloadLv > 0) stats.reloadDelta = ENHANCE_SKILLS.reload_speed.levels[reloadLv - 1].reloadDelta;
  if (fireLv   > 0) stats.fireDelta   = ENHANCE_SKILLS.fire_rate.levels[fireLv - 1].fireDelta;
  if (magLv    > 0) stats.magBonus    = ENHANCE_SKILLS.magazine.levels[magLv - 1].mag;
  return stats;
}

function getMaxAmmo() {
  return 15 + getAgentStats().magBonus;
}

function renderEnhanceUI() {
  const ptEl = document.getElementById('stat-point-value');
  if (ptEl) ptEl.textContent = statPoints;

  Object.keys(ENHANCE_SKILLS).forEach(id => {
    const skill  = ENHANCE_SKILLS[id];
    const level  = getSkillLevel(id);
    const maxed  = level >= skill.maxLevel;

    const descEl = document.getElementById(`desc-${id}`);
    const statEl = document.getElementById(`stat-${id}`);
    const costEl = document.getElementById(`cost-${id}`);
    const btnEl  = document.getElementById(`btn-${id}`);
    // 세로 카드(.v-card) 우선, 없으면 레거시(.enhance-card)
    const card = document.querySelector(`.v-card[data-skill="${id}"]`)
               || document.querySelector(`.enhance-card[data-skill="${id}"]`);

    if (descEl) descEl.textContent = skill.description;
    if (statEl) {
      const status = maxed ? 'MAX' : `NEXT ${skill.levels[level].cost}P`;
      const effect = level > 0 ? skill.levels[level - 1].desc : skill.levels[0].desc;
      statEl.textContent = `${effect} / ${status}`;
    }

    if (costEl) costEl.textContent = maxed ? 'MAX' : skill.levels[level].cost + 'P';

    if (btnEl) {
      if (maxed) {
        btnEl.textContent = '완료';
        btnEl.disabled    = true;
        btnEl.classList.add('btn-maxed');
        btnEl.classList.remove('btn-disabled');
      } else {
        const canAfford = statPoints >= skill.levels[level].cost;
        btnEl.textContent = '강화';
        btnEl.disabled    = !canAfford;
        btnEl.classList.toggle('btn-disabled', !canAfford);
        btnEl.classList.remove('btn-maxed');
      }
    }

    // 레벨 도트 업데이트
    document.querySelectorAll(`.level-dot[data-skill="${id}"]`).forEach(dot => {
      dot.classList.toggle('dot-active', parseInt(dot.dataset.lv) <= level);
    });

    if (card) card.classList.toggle('card-maxed', maxed);
  });

  // 스킬 HUD 표시 (게임 중)
  updateSkillHud();
}

function upgradeSkill(id) {
  const skill = ENHANCE_SKILLS[id];
  const level = getSkillLevel(id);
  if (level >= skill.maxLevel) return;
  const cost = skill.levels[level].cost;
  if (statPoints < cost) return;
  statPoints -= cost;
  enhancements[id] = level + 1;
  localStorage.setItem(STAT_POINT_KEY, String(statPoints));
  localStorage.setItem(ENHANCE_KEY, JSON.stringify(enhancements));
  renderEnhanceUI();
}

// 강화 버튼 이벤트
Object.keys(ENHANCE_SKILLS).forEach(id => {
  const btn = document.getElementById(`btn-${id}`);
  if (btn) btn.addEventListener('click', () => upgradeSkill(id));
});

function addStatPoints(amount) {
  statPoints += amount;
  localStorage.setItem(STAT_POINT_KEY, String(statPoints));
  renderEnhanceUI();
}

function updateStatPointUI() {
  renderEnhanceUI();
}
updateStatPointUI();

/* ════════════════════════════════
   스킬 시스템 — 트리플A & 클리셰
════════════════════════════════ */
const TRIPLE_A_DURATION = 5;
const TRIPLE_A_COOLDOWN = 25;
const CLICHE_DURATION   = 10;
const CLICHE_COOLDOWN   = 45;

let tripleAActive = false;
let tripleACooldownLeft = 0;
let tripleATimeLeft = 0;

let clicheActive = false;
let clicheCooldownLeft = 0;
let clicheTimeLeft = 0;
let clicheBlocks = [];

function updateSkillHud() {
  const hudEl = document.getElementById('skill-hud');
  if (!hudEl) return;
  const hasTripleA = getSkillLevel('triple_a') > 0;
  const hasCliche  = getSkillLevel('cliche') > 0;
  if (!hasTripleA && !hasCliche) { hudEl.classList.add('hidden'); return; }
  hudEl.classList.remove('hidden');
  const slotA = document.getElementById('slot-triple-a');
  const slot1 = document.getElementById('slot-cliche');
  if (slotA) slotA.style.display = hasTripleA ? 'flex' : 'none';
  if (slot1) slot1.style.display = hasCliche  ? 'flex' : 'none';
}

function updateSkillCooldownUI(delta) {
  if (tripleAActive) {
    tripleATimeLeft -= delta;
    if (tripleATimeLeft <= 0) { tripleAActive = false; tripleACooldownLeft = TRIPLE_A_COOLDOWN; }
  } else if (tripleACooldownLeft > 0) {
    tripleACooldownLeft = Math.max(0, tripleACooldownLeft - delta);
  }
  const cdA = document.getElementById('cd-triple-a');
  if (cdA) {
    const pct = tripleACooldownLeft > 0 ? (tripleACooldownLeft / TRIPLE_A_COOLDOWN) * 100 : 0;
    cdA.style.height = pct + '%';
  }
  if (clicheActive) {
    clicheTimeLeft -= delta;
    if (clicheTimeLeft <= 0) { clicheActive = false; clicheCooldownLeft = CLICHE_COOLDOWN; removeClicheBlocks(); }
  } else if (clicheCooldownLeft > 0) {
    clicheCooldownLeft = Math.max(0, clicheCooldownLeft - delta);
  }
  const cd1 = document.getElementById('cd-cliche');
  if (cd1) {
    const pct = clicheCooldownLeft > 0 ? (clicheCooldownLeft / CLICHE_COOLDOWN) * 100 : 0;
    cd1.style.height = pct + '%';
  }
}

function removeClicheBlocks() {
  clicheBlocks.forEach(b => { if (b.parent) b.parent.remove(b); });
  clicheBlocks = [];
}

/* ════════════════════════════════
   전역 게임 상태
════════════════════════════════ */
let gameInited    = false;
let gameRunning   = false;
let countdownDone = false;

const MAX_AMMO    = 15;  // 기본값 (실제는 getMaxAmmo() 사용)
let ammo          = MAX_AMMO;
let reloading     = false;
let reloadTimer   = 0;
const BASE_RELOAD_TIME   = 2.8;
const BASE_FIRE_COOLDOWN = 180;
const BASE_AMMO          = 15;

let isAiming      = false;
let aimProgress   = 0;

let yaw   = 0;
let pitch = 0;
const SENSITIVITY = 0.0018;

let recoilY = 0;
let recoilZ = 0;
let pitchRecoil = 0; // 카메라 반동 누적 (연사 시 위로 올라감)

// 장전 애니메이션
// phase: 0=idle, 1=lower(내리기), 2=tilt(눕히기), 3=mag-out(탄창제거),
//        4=mag-in(탄창삽입), 5=tilt-back(세우기), 6=raise(올리기)
let reloadPhase    = 0;
let reloadPhaseT   = 0; // 현재 페이즈 내 경과 시간
let magMesh        = null; // 탄창 3D 메시 (장전 중 표시)

let blocks       = [];
let redIndex     = -1;
let targetIndex  = -1;
let targetType   = 'red';
let score        = 0;
let totalShots   = 0;
let bulletTrails = [];
let hitEffects   = [];
let pointerLocked = false;

function exitGame() {
  gameRunning   = false;
  countdownDone = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

/* ════════════════════════════════
   게임 초기화 (딱 1회)
════════════════════════════════ */
function initGame() {
  if (gameInited) {
    if (!gameRunning) startCountdown();
    return;
  }
  gameInited = true;

  const canvas     = document.getElementById('c');
  const crosshair  = document.getElementById('crosshair');
  const aimOverlay = document.getElementById('aim-overlay');

  const raycaster           = new THREE.Raycaster();
  const aimPoint            = new THREE.Vector2(0, 0);
  const forward             = new THREE.Vector3();
  const upVector            = new THREE.Vector3(0, 1, 0);
  const tempVecA            = new THREE.Vector3();
  const tempVecB            = new THREE.Vector3();
  const bulletTrailGeometry = new THREE.CylinderGeometry(0.012, 0.018, 0.22, 5);
  const bulletTrailMaterial = new THREE.MeshBasicMaterial({ color: 0xffee44, transparent: true, opacity: 0.85 });
  const clicheBlockGeo      = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const clicheBlockMat      = new THREE.MeshStandardMaterial({ color: 0xffe000, emissive: 0xffe000, emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.5 });
  const effectRingGeometry  = new THREE.RingGeometry(0.45, 0.5, 12);

  /* ── 렌더러 ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = false;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  /* ── 씬 ── */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06080e);
  scene.fog        = new THREE.FogExp2(0x06080e, 0.018);

  /* ── 카메라 ── */
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 200);
  camera.position.set(0, 1.6, 0);
  scene.add(camera); // 씬에 추가해야 자식 객체(gunPivot)가 렌더됨

  /* ── 조명 ── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const keyLight = new THREE.DirectionalLight(0xff6ba8, 2.0);
  keyLight.position.set(3, 4, 5);
    keyLight.castShadow = false;
  const rimLight = new THREE.DirectionalLight(0x5de0f5, 0.8);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(0, -2, 3);
  scene.add(fillLight);

  /* ── 바닥 ── */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0d0f1a, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = false;
  scene.add(floor);

  /* ── 배경 파티클 ── */
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(220 * 3);
  for (let i = 0; i < 220 * 3; i++) pPos[i] = (Math.random() - .5) * 60;
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo,
    new THREE.PointsMaterial({ color: 0xff2d7a, size: 0.06, opacity: .32, transparent: true })));

  /* ══════════════════════════════
     3×3 블럭 — 높이 올림
  ══════════════════════════════ */
  const BLOCK_DIST = 10;   // 플레이어와의 거리
  const BLOCK_SIZE = 0.9;
  const BLOCK_GAP  = 1.15;
  const BLOCK_BASE_Y = 2.1; // ← 높이 조정 (카메라 1.6 + 여유)

  blocks = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE),
        new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.5, metalness: 0.3 })
      );
      mesh.castShadow = false;
      mesh.position.set(
        (col - 1) * BLOCK_GAP,
        BLOCK_BASE_Y + (1 - row) * BLOCK_GAP,  // row 0 = 위, row 2 = 아래
        -BLOCK_DIST
      );
      mesh.userData.isBlock  = true;
      mesh.userData.blockIdx = row * 3 + col;
      mesh.userData.isRed    = false;
      mesh.userData.isBlue   = false;
      mesh.userData.isTarget = false;
      scene.add(mesh);
      blocks.push(mesh);
    }
  }

  function setTargetBlock(idx, type) {
    blocks.forEach((b, i) => {
      const active = (i === idx);
      const blue = active && type === 'blue';
      const red = active && type === 'red';
      b.userData.isTarget = active;
      b.userData.isRed = red;
      b.userData.isBlue = blue;
      b.material.color.set(blue ? 0x249dff : red ? 0xff2d2d : 0x555566);
      b.material.emissive = new THREE.Color(blue ? 0x1c8dff : red ? 0xff0000 : 0x000000);
      b.material.emissiveIntensity = active ? 0.5 : 0;
    });
    redIndex = idx;
    targetIndex = idx;
    targetType = type;
  }

  function pickNewTarget() {
    let next;
    do { next = Math.floor(Math.random() * 9); } while (next === targetIndex);
    setTargetBlock(next, Math.random() < 0.1 ? 'blue' : 'red');
  }

  function spawnBlockHitEffect(block, color) {
    const burst = new THREE.Group();
    const origin = block.position.clone();
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.10,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });
    const count = 18;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      tempVecA.set(
        Math.random() - 0.5,
        Math.random() - 0.25,
        Math.random() - 0.5
      ).normalize();
      velocities.push(tempVecA.multiplyScalar(2.2 + Math.random() * 2.2).clone());
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, mat);
    burst.add(points);

    const ring = new THREE.Mesh(
      effectRingGeometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.position.copy(origin);
    ring.quaternion.copy(camera.quaternion);
    burst.add(ring);

    scene.add(burst);
    hitEffects.push({ burst, points, ring, velocities, life: 0.55, maxLife: 0.55 });
  }

  /* ══════════════════════════════
     총기 피벗 — 카메라 자식으로!
  ══════════════════════════════ */
  const gunPivot = new THREE.Object3D();
  camera.add(gunPivot); // ← 카메라에 붙임. 카메라 로컬좌표 사용

  // 카메라 로컬 좌표: z 음수 = 앞, x 양수 = 오른쪽, y 음수 = 아래
  const GUN_REST = { x:  0.28, y: -0.22, z: -0.55 };
  const GUN_AIM  = { x:  0.00, y: -0.12, z: -0.50 };
  const GUN_FOV_REST = 60;
  const GUN_FOV_AIM  = 42;

  let model = null;
  let mixer = null;

  /* ── FBX 로드 ── */
  const loader = new FBXLoader();
  loader.load('model/lod.fbx', (fbx) => {
    model = fbx;

    const texLoader = new THREE.TextureLoader();
    const tryTex = (path, srgb) => {
      const t = texLoader.load(path, undefined, undefined, () => {});
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
      return t;
    };

    const pbrMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.35 });
    try {
      pbrMat.map          = tryTex('model/texture_diffuse.png',   true);
      pbrMat.metalnessMap = tryTex('model/texture_metallic.png',  false);
      pbrMat.normalMap    = tryTex('model/texture_normal.png',    false);
      pbrMat.roughnessMap = tryTex('model/texture_roughness.png', false);
      pbrMat.normalScale  = new THREE.Vector2(1, 1);
      pbrMat.metalness = 1.0; pbrMat.roughness = 1.0;
    } catch(e) {}

    fbx.traverse(child => {
      if (!child.isMesh) return;
      child.material = pbrMat;
      child.castShadow = false;
      child.receiveShadow = false;
    });

    if (fbx.animations?.length > 0) {
      mixer = new THREE.AnimationMixer(fbx);
      mixer.clipAction(fbx.animations[0]).play();
    }

    const box = new THREE.Box3().setFromObject(fbx);
    const center = new THREE.Vector3(), size = new THREE.Vector3();
    box.getCenter(center); box.getSize(size);
    const scale = 0.25 / Math.max(size.x, size.y, size.z);
    fbx.scale.setScalar(scale);
    fbx.position.sub(center.multiplyScalar(scale));
    fbx.rotation.y = Math.PI;

    gunPivot.add(fbx);
    gunPivot.position.set(GUN_REST.x, GUN_REST.y, GUN_REST.z);
    document.getElementById('error-banner').classList.remove('show');
  }, undefined, () => {
    createPlaceholderGun(gunPivot);
    document.getElementById('error-banner').style.display = 'none';
  });

  /* ── 플레이스홀더 총기 ── */
  function createPlaceholderGun(parent) {
    const mat       = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: .9,  roughness: .2 });
    const matDark   = new THREE.MeshStandardMaterial({ color: 0x111116, metalness: .95, roughness: .15 });
    const matAccent = new THREE.MeshStandardMaterial({ color: 0xff2d7a, metalness: .5,  roughness: .3,
                                                       emissive: 0xff2d7a, emissiveIntensity: .3 });
    const g = new THREE.Group();

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.38, 8), matDark);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.01, 0.14); g.add(barrel);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.3), matDark);
    rail.position.set(0, -0.022, 0.1); g.add(rail);

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.28), mat);
    slide.position.set(0, 0.015, 0.05); g.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.12, 0.065), mat);
    grip.position.set(0, -0.068, -0.06); grip.rotation.x = 0.12; g.add(grip);

    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12, Math.PI), matDark);
    guard.rotation.x = Math.PI / 2; guard.rotation.z = Math.PI; guard.position.set(0, -0.025, -0.02); g.add(guard);

    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.004, 0.28), matAccent);
    accent.position.set(0, -0.01, 0.05); g.add(accent);

    const sightF = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.014, 0.006), matAccent);
    sightF.position.set(0, 0.048, 0.17); g.add(sightF);

    const sightR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.006), matDark);
    sightR.position.set(0, 0.046, -0.06); g.add(sightR);

    g.rotation.y = -0.05;
    parent.add(g);
    parent.position.set(GUN_REST.x, GUN_REST.y, GUN_REST.z);
    model = g;
  }

  /* ── 총알 궤도 ── */
  function spawnBulletTrail(from, direction) {
    const mesh = new THREE.Mesh(bulletTrailGeometry, bulletTrailMaterial.clone());
    mesh.position.copy(from);
    tempVecB.copy(direction).normalize();
    mesh.quaternion.setFromUnitVectors(upVector, tempVecB);
    scene.add(mesh);
    bulletTrails.push({ mesh, velocity: tempVecB.clone().multiplyScalar(55), life: 1.0, gravity: -4 });
  }

  /* ── 포인터 락 & 마우스 룩 ── */
  canvas.addEventListener('click', () => {
    if (!countdownDone) return;
    if (!pointerLocked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = (document.pointerLockElement === canvas);
  });

  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked || !countdownDone) return;
    yaw   -= e.movementX * SENSITIVITY;
    pitch -= e.movementY * SENSITIVITY;
    pitch  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  });

  /* ── 조준 (우클릭) ── */
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ── 스킬 키 입력 ── */
  document.addEventListener('keydown', (e) => {
    if (!countdownDone || !pointerLocked) return;

    // A키 — 트리플A 건전지 (자동에임)
    if ((e.key === 'a' || e.key === 'A') && getSkillLevel('triple_a') > 0) {
      if (!tripleAActive && tripleACooldownLeft <= 0) {
        tripleAActive  = true;
        tripleATimeLeft = TRIPLE_A_DURATION;
      }
    }

    // 1키 — 클리셰 (노란 블록 3개)
    if (e.key === '1' && getSkillLevel('cliche') > 0) {
      if (!clicheActive && clicheCooldownLeft <= 0) {
        clicheActive  = true;
        clicheTimeLeft = CLICHE_DURATION;
        spawnClicheBlocks();
      }
    }
  });

  /* ── 클리셰 블록 생성 ── */
  function spawnClicheBlocks() {
    removeClicheBlocks();
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(clicheBlockGeo, clicheBlockMat.clone());
      const px = (Math.random() - 0.5) * 12;
      const pz = 4 + Math.random() * 8;
      mesh.position.set(px, 1.4 + (Math.random() - 0.5) * 2, -pz);
      mesh.castShadow = false;
      mesh.userData.isCliche = true;
      mesh.userData.isTarget = true;
      mesh.userData.isYellow = true;
      scene.add(mesh);
      clicheBlocks.push(mesh);
    }
  }


  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2 && countdownDone && !reloading) {
      isAiming = true;
      crosshair.classList.add('aiming');
      aimOverlay.classList.add('active');
    }
  });
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
      isAiming = false;
      crosshair.classList.remove('aiming');
      aimOverlay.classList.remove('active');
    }
  });

  /* ── 발사 (좌클릭) ── */
  let lastFireAt = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !countdownDone || !isAiming || reloading || ammo <= 0 || !pointerLocked) return;

    const agentStats = getAgentStats();
    const fireCooldown = Math.max(60, BASE_FIRE_COOLDOWN - agentStats.fireDelta * 1000);
    const now = performance.now();
    if (now - lastFireAt < fireCooldown) return;
    lastFireAt = now;

    ammo--;
    totalShots++;
    updateAmmoUI();

    // 반동 (총기 로컬)
    recoilY =  0.06;
    recoilZ =  0.05;

    // 카메라 반동 — pitchRecoil에 누적, 연사할수록 조금씩 위로
    pitchRecoil   += 0.008;
    screenShakeTime = 0.10;

    // 총구 방향
    camera.getWorldDirection(forward);
    tempVecB.copy(camera.position).addScaledVector(forward, 0.4);
    spawnBulletTrail(tempVecB, forward);

    // 레이캐스트 히트 판정
    raycaster.setFromCamera(aimPoint, camera);
    const hits = raycaster.intersectObjects(blocks.concat(clicheBlocks), false);
    if (hits.length > 0) {
      const hit = hits[0].object;
      if (hit.userData.isYellow && clicheBlocks.includes(hit)) {
        addStatPoints(10);
        spawnBlockHitEffect(hit, 0xffe000);
        scene.remove(hit);
        clicheBlocks = clicheBlocks.filter(b => b !== hit);
      } else if (hit.userData.isTarget) {
        score += agentStats.damage;
        updateScoreUI();
        const isBlue = hit.userData.isBlue;
        hit.userData.isTarget = false;
        if (isBlue) addStatPoints(2);
        spawnBlockHitEffect(hit, isBlue ? 0x249dff : 0xff2d7a);
        hit.material.emissiveIntensity = isBlue ? 2.7 : 2.0;
        setTimeout(() => { if (hit.material) hit.material.emissiveIntensity = 0.5; }, 80);
        setTimeout(() => pickNewTarget(), 120);
      }
    }

    if (ammo <= 0) startReload();
  });

  /* ── 장전 ── */
  function startReload() {
    reloading = true;
    isAiming  = false;
    crosshair.classList.remove('aiming');
    aimOverlay.classList.remove('active');
    const reloadDuration = Math.max(0.5, BASE_RELOAD_TIME - getAgentStats().reloadDelta);
    updateReloadUI(true, reloadDuration);
    reloadTimer  = reloadDuration;
    reloadPhase  = 1;   // phase 1: 총 내리기
    reloadPhaseT = 0;

    // 탄창 메시 생성 (아직 안 보이게)
    if (!magMesh) {
      const magGeo = new THREE.BoxGeometry(0.024, 0.090, 0.024);
      const magMat = new THREE.MeshStandardMaterial({ color: 0xff2d7a, metalness: 0.5, roughness: 0.3, emissive: 0xff2d7a, emissiveIntensity: 0.15 });
      magMesh = new THREE.Mesh(magGeo, magMat);
      magMesh.visible = false;
      gunPivot.add(magMesh); // gunPivot 기준 로컬 좌표로 제어
    }
    magMesh.visible = false;
  }

  function finishReload() {
    reloading    = false;
    reloadPhase  = 0;
    reloadPhaseT = 0;
    ammo = getMaxAmmo();
    if (magMesh) magMesh.visible = false;
    updateAmmoUI();
    updateReloadUI(false);
  }

  /* ── UI ── */
  function updateAmmoUI() {
    const el = document.getElementById('ammo-display');
    if (el) el.textContent = ammo + ' / ' + getMaxAmmo();
  }
  function updateScoreUI() {
    const el = document.getElementById('score-display');
    if (el) el.textContent = 'SCORE ' + score;
  }
  function updateReloadUI(on, duration = BASE_RELOAD_TIME) {
    const el  = document.getElementById('reload-indicator');
    const bar = document.getElementById('reload-bar');
    if (el) el.style.opacity = on ? '1' : '0';
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '0%';
      if (on) {
        requestAnimationFrame(() => {
          bar.style.transition = `width ${duration}s linear`;
          bar.style.width = '100%';
        });
      }
    }
  }

  /* ── 리사이즈 ── */
  function onResize() {
    const w = gameScreen.clientWidth;
    const h = gameScreen.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(onResize).observe(gameScreen);
  onResize();

  /* ── 스웨이용 마우스 속도 ── */
  let swayTime       = 0;
  let mouseVelX      = 0;
  let mouseVelY      = 0;
  let screenShakeTime = 0; // 발사 시 화면 진동 타이머

  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked) return;
    mouseVelX = e.movementX * 0.001;
    mouseVelY = e.movementY * 0.001;
  });

  /* ════════════════════════════════
     렌더 루프
  ════════════════════════════════ */
  let lastTime = performance.now();
  let frames   = 0;
  const clock  = new THREE.Clock();

  function tick(now) {
    requestAnimationFrame(tick);

    const delta = clock.getDelta();

    // 게임 미시작이어도 총은 렌더
    if (gameRunning) {
      swayTime += delta;

      // 스킬 쿨다운
      updateSkillCooldownUI(delta);

      // 트리플A 자동에임: 가장 가까운 블록 방향으로 yaw/pitch 조정
      if (tripleAActive && countdownDone) {
        let closest = null, minDist = Infinity;
        blocks.forEach(b => {
          if (!b.visible) return;
          const dir = b.position.clone().sub(camera.position);
          const dist = dir.length();
          if (dist < minDist) { minDist = dist; closest = b; }
        });
        if (closest) {
          const dir = closest.position.clone().sub(camera.position).normalize();
          const targetYaw   = Math.atan2(-dir.x, -dir.z);
          const targetPitch = Math.asin(dir.y);
          yaw   += (targetYaw   - yaw)   * 0.08;
          pitch += (targetPitch - pitch) * 0.08;
        }
      }

      // 장전 타이머
      if (reloading) {
        reloadTimer -= delta;
        if (reloadTimer <= 0) finishReload();
      }

      // 믹서
      if (mixer) mixer.update(delta);

      // 조준 lerp
      const targetAim = (isAiming && !reloading) ? 1 : 0;
      aimProgress += (targetAim - aimProgress) * 0.12;

      // 반동 감쇠
      recoilY *= 0.72;
      recoilZ *= 0.72;

      // 화면 진동 처리
      let shakeOffsetX = 0, shakeOffsetY = 0;
      if (screenShakeTime > 0) {
        screenShakeTime -= delta;
        const mag = (screenShakeTime / 0.10) * 0.006;
        shakeOffsetX = (Math.random() - 0.5) * mag;
        shakeOffsetY = (Math.random() - 0.5) * mag;
      }

      // pitchRecoil 감쇠 (발사 안 하면 천천히 원위치)
      pitchRecoil *= Math.pow(0.04, delta); // 빠르게 복귀

      // 카메라 회전 (pitchRecoil은 pitch에 더해서 위로만 올림)
      camera.quaternion.setFromEuler(new THREE.Euler(pitch - pitchRecoil + shakeOffsetY, yaw + shakeOffsetX, 0, 'YXZ'));

      // FOV lerp
      camera.fov = GUN_FOV_REST + (GUN_FOV_AIM - GUN_FOV_REST) * aimProgress;
      camera.updateProjectionMatrix();

      // ── 총기 위치 & 장전 모션 ──
      const swayScale = 1 - aimProgress * 0.7;
      const tx = GUN_REST.x + (GUN_AIM.x - GUN_REST.x) * aimProgress;
      const ty = GUN_REST.y + (GUN_AIM.y - GUN_REST.y) * aimProgress;
      const tz = GUN_REST.z + (GUN_AIM.z - GUN_REST.z) * aimProgress;

      const breathX = Math.sin(swayTime * 0.9) * 0.004 * swayScale;
      const breathY = Math.sin(swayTime * 1.3) * 0.003 * swayScale;

      // 기본 포지션 (반동, 스웨이 포함)
      let gx = tx + breathX - mouseVelX * 0.04 * swayScale;
      let gy = ty + breathY - mouseVelY * 0.04 * swayScale + recoilY;
      let gz = tz + recoilZ;
      // 총기 회전 오프셋 (장전 시 사용)
      let gRotX = 0, gRotZ = 0;

      /* ── 장전 페이즈 애니메이션 ──
         총 시간 2.8s 배분:
         phase1 lower   0.0~0.4s  (총 내리기)
         phase2 tilt    0.4~0.85s (옆으로 눕히기)
         phase3 mag-out 0.85~1.1s (탄창 분리 — magMesh 아래로)
         phase4 mag-in  1.1~1.7s  (새 탄창 삽입 — magMesh 아래서 올라옴)
         phase5 tilt-bk 1.7~2.2s  (총 다시 세우기)
         phase6 raise   2.2~2.8s  (총 올리기)
      ── */
      const PHASE_DUR = [0, 0.4, 0.45, 0.25, 0.6, 0.5, 0.6]; // index = phase

      if (reloading && reloadPhase > 0) {
        reloadPhaseT += delta;
        const dur = PHASE_DUR[reloadPhase];
        const t   = Math.min(reloadPhaseT / dur, 1.0);
        // ease in-out
        const ease = t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

        if (reloadPhase === 1) {
          // 총 아래로 내리기
          gy  += ease * 0.22;
          gz  += ease * 0.08;

        } else if (reloadPhase === 2) {
          // 총 옆으로 눕히기 (반대 방향 — z축 음수)
          gy     += 0.22;
          gRotZ   = -ease * (Math.PI * 0.38);
          gRotX   = ease * 0.12;

        } else if (reloadPhase === 3) {
          // 탄창 분리: magMesh를 총 아래서 꺼냄
          gy    += 0.22;
          gRotZ  = -(Math.PI * 0.38);
          gRotX  = 0.12;
          if (magMesh) {
            magMesh.visible = true;
            magMesh.position.set(0, -0.07 - ease * 0.12, 0.082);
            magMesh.rotation.set(0, 0, 0);
          }

        } else if (reloadPhase === 4) {
          // 새 탄창 삽입: magMesh가 아래서 올라와 딸깍
          gy    += 0.22;
          gRotZ  = -(Math.PI * 0.38);
          gRotX  = 0.12;
          if (magMesh) {
            magMesh.visible = true;
            const insertY = -0.19 + ease * 0.12;
            magMesh.position.set(0, insertY, 0.082);
          }

        } else if (reloadPhase === 5) {
          // 총 다시 세우기
          gy    += 0.22 * (1 - ease);
          gRotZ  = -(Math.PI * 0.38) * (1 - ease);
          gRotX  = 0.12 * (1 - ease);
          if (magMesh) {
            magMesh.visible = true;
            magMesh.position.set(0, -0.07, 0.082);
          }

        } else if (reloadPhase === 6) {
          // 총 올리기 (원래 위치로)
          gy += 0.22 * (1 - ease);
          gz += 0.08 * (1 - ease);
          if (magMesh) magMesh.visible = false;
        }

        // 페이즈 전환
        if (t >= 1.0) {
          reloadPhase++;
          reloadPhaseT = 0;
          if (reloadPhase > 6) reloadPhase = 6; // finishReload가 처리
        }
      } else if (!reloading && magMesh) {
        magMesh.visible = false;
      }

      gunPivot.position.set(gx, gy, gz);
      gunPivot.rotation.set(gRotX, 0, gRotZ);

      mouseVelX *= 0.85;
      mouseVelY *= 0.85;

      // 총알 궤도
      bulletTrails = bulletTrails.filter(t => {
        t.life -= delta * 2.5;
        t.velocity.y += t.gravity * delta;
        t.mesh.position.addScaledVector(t.velocity, delta);
        t.mesh.material.opacity = Math.max(0, t.life * 0.85);
        if (t.life <= 0) {
          scene.remove(t.mesh);
          return false;
        }
        return true;
      });

      hitEffects = hitEffects.filter(effect => {
        effect.life -= delta;
        const elapsed = effect.maxLife - effect.life;
        const positions = effect.points.geometry.attributes.position.array;

        effect.velocities.forEach((velocity, i) => {
          positions[i * 3] += velocity.x * delta;
          positions[i * 3 + 1] += velocity.y * delta;
          positions[i * 3 + 2] += velocity.z * delta;
        });

        effect.points.geometry.attributes.position.needsUpdate = true;
        effect.points.material.opacity = Math.max(0, effect.life / effect.maxLife);
        effect.ring.scale.setScalar(1 + elapsed * 4.2);
        effect.ring.material.opacity = Math.max(0, effect.life / effect.maxLife) * 0.75;

        if (effect.life <= 0) {
          scene.remove(effect.burst);
          effect.points.geometry.dispose();
          effect.points.material.dispose();
          effect.ring.material.dispose();
          return false;
        }
        return true;
      });
    }

    renderer.render(scene, camera);

    // FPS 카운터
    frames++;
    if (now - lastTime >= 600) {
      const fps = Math.round(frames / ((now - lastTime) / 1000));
      const el  = document.getElementById('hdr-fps');
      if (el) el.textContent = fps + ' FPS';
      frames   = 0;
      lastTime = now;
    }
  }
  requestAnimationFrame(tick);

  /* ── 카운트다운 ── */
  startCountdown();

  function startCountdown() {
    gameRunning   = true;
    countdownDone = false;
    ammo          = getMaxAmmo();
    reloading     = false;
    score         = 0;
    totalShots    = 0;
    recoilY = recoilZ = 0;
    pitchRecoil = 0;
    aimProgress = 0;
    reloadPhase = 0;
    reloadPhaseT = 0;
    if (magMesh) magMesh.visible = false;
    updateAmmoUI();
    updateScoreUI();
    updateReloadUI(false);

    blocks.forEach(b => {
      b.userData.isRed = false;
      b.userData.isBlue = false;
      b.userData.isTarget = false;
      b.material.color.set(0x555566);
      b.material.emissive          = new THREE.Color(0x000000);
      b.material.emissiveIntensity = 0;
    });
    redIndex = -1;
    targetIndex = -1;
    targetType = 'red';

    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    const cdNum = overlay.querySelector('.cd-num');
    const nums  = ['3', '2', '1', 'SHOT!'];
    let i = 0;

    const show = () => {
      cdNum.textContent = nums[i];
      cdNum.classList.remove('cd-pop');
      void cdNum.offsetWidth;
      cdNum.classList.add('cd-pop');
    };
    show();

    const interval = setInterval(() => {
      i++;
      if (i >= nums.length) {
        clearInterval(interval);
        overlay.style.display = 'none';
        countdownDone = true;
        pickNewTarget();
        canvas.requestPointerLock();
        return;
      }
      show();
    }, 900);
  }
}
