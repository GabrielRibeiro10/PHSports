import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Cena Three.js da camisa da HERO.
 * A camisa é gerada em código (sem .glb): silhueta 2D → malha "estofada"
 * com frente e costas, gola em tubo, texturas pintadas em canvas.
 * Tudo é criado uma única vez; o loop só renderiza.
 */

const BRAND_RED = "#cf1f2b";
const DEEP_RED = "#8f1119";
const INK = "#0d0d0d";

export type ShirtScene = {
  canvas: HTMLCanvasElement;
  /** Grupo animado pelo GSAP (posição, escala e rotação). */
  shirtGroup: THREE.Group;
  /** Largura/altura da camisa com escala 1 (altura = 1 unidade). */
  shirtAspect: number;
  /** Tamanho visível do plano z=0 em unidades do mundo. */
  viewSize: () => { w: number; h: number };
  /** Ajusta renderer e câmera ao tamanho atual do canvas. */
  resize: () => void;
  renderOnce: () => void;
  dispose: () => void;
};

/* ---------- Silhueta ---------- */

function shirtShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.13, 0.47);
  s.quadraticCurveTo(0, 0.33, 0.13, 0.47); // gola (frente)
  s.quadraticCurveTo(0.22, 0.465, 0.31, 0.43); // ombro
  s.quadraticCurveTo(0.45, 0.37, 0.56, 0.19); // manga (topo)
  s.lineTo(0.42, 0.065); // punho
  s.quadraticCurveTo(0.34, 0.12, 0.3, 0.14); // axila
  s.quadraticCurveTo(0.28, -0.12, 0.31, -0.47); // lateral
  s.quadraticCurveTo(0.31, -0.51, 0.27, -0.51);
  s.quadraticCurveTo(0, -0.535, -0.27, -0.51); // barra
  s.quadraticCurveTo(-0.31, -0.51, -0.31, -0.47);
  s.quadraticCurveTo(-0.28, -0.12, -0.3, 0.14);
  s.quadraticCurveTo(-0.34, 0.12, -0.42, 0.065);
  s.lineTo(-0.56, 0.19);
  s.quadraticCurveTo(-0.45, 0.37, -0.31, 0.43);
  s.quadraticCurveTo(-0.22, 0.465, -0.13, 0.47);
  return s;
}

type Vec = { x: number; y: number };

function insidePolygon(p: Vec, poly: Vec[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}

function nearestOnPolygon(p: Vec, poly: Vec[]) {
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    const qx = a.x + dx * t;
    const qy = a.y + dy * t;
    const d2 = (p.x - qx) ** 2 + (p.y - qy) ** 2;
    if (d2 < best) {
      best = d2;
      bx = qx;
      by = qy;
    }
  }
  return { d: Math.sqrt(best), x: bx, y: by };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Malha fechada e arredondada a partir da silhueta: uma grade é recortada
 * pelo contorno; vértices da borda encostam no contorno (z = 0) e o miolo
 * ganha volume, na frente (+z) e nas costas (−z). Os vértices da borda são
 * compartilhados, então as normais ficam suaves na costura.
 */
function buildShirtGeometry(
  poly: Vec[],
  bounds: { minX: number; minY: number; w: number; h: number },
) {
  const ROWS = 150;
  const step = bounds.h / ROWS;
  const cols = Math.ceil(bounds.w / step) + 2;
  const rows = ROWS + 2;
  const x0 = bounds.minX - step;
  const y0 = bounds.minY - step;

  const ROUND = 0.05;
  const THICK = 0.034;
  const BULGE = 0.045;
  const height = (d: number) => {
    const r = Math.min(d / ROUND, 1);
    return THICK * Math.sqrt(1 - (1 - r) * (1 - r)) + BULGE * smoothstep(0.02, 0.32, d);
  };

  const nx = cols + 1;
  const ny = rows + 1;
  const px = new Float32Array(nx * ny);
  const py = new Float32Array(nx * ny);
  const pz = new Float32Array(nx * ny);
  const inside = new Uint8Array(nx * ny);
  const onEdge = new Uint8Array(nx * ny);

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const p = { x: x0 + i * step, y: y0 + j * step };
      const near = nearestOnPolygon(p, poly);
      const isIn = insidePolygon(p, poly);
      inside[k] = isIn ? 1 : 0;
      if (!isIn || near.d < step * 0.3) {
        px[k] = near.x;
        py[k] = near.y;
        pz[k] = 0;
        onEdge[k] = 1;
      } else {
        px[k] = p.x;
        py[k] = p.y;
        pz[k] = height(near.d);
      }
    }
  }

  const positions: number[] = [];
  const uvs: number[] = [];
  const frontIdx = new Int32Array(nx * ny).fill(-1);
  const backIdx = new Int32Array(nx * ny).fill(-1);
  const push = (k: number, sign: number) => {
    positions.push(px[k], py[k], pz[k] * sign);
    uvs.push((px[k] - bounds.minX) / bounds.w, (py[k] - bounds.minY) / bounds.h);
    return positions.length / 3 - 1;
  };
  const vFront = (k: number) => (frontIdx[k] >= 0 ? frontIdx[k] : (frontIdx[k] = push(k, 1)));
  const vBack = (k: number) =>
    onEdge[k] ? vFront(k) : backIdx[k] >= 0 ? backIdx[k] : (backIdx[k] = push(k, -1));

  const front: number[] = [];
  const back: number[] = [];
  const area = (a: number, b: number, c: number) =>
    Math.abs((px[b] - px[a]) * (py[c] - py[a]) - (px[c] - px[a]) * (py[b] - py[a]));

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = a + nx;
      for (const [t0, t1, t2] of [
        [a, b, c],
        [a, c, d],
      ]) {
        if (!(inside[t0] || inside[t1] || inside[t2])) continue;
        if (area(t0, t1, t2) < 1e-7) continue;
        front.push(vFront(t0), vFront(t1), vFront(t2));
        back.push(vBack(t0), vBack(t2), vBack(t1));
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex([...front, ...back]);
  geo.addGroup(0, front.length, 0);
  geo.addGroup(front.length, back.length, 1);
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Texturas pintadas ---------- */

const TEX = 1024;

function paintBase(
  ctx: CanvasRenderingContext2D,
  b: { minX: number; minY: number; w: number; h: number },
  shape: THREE.Shape,
) {
  // Desenha em unidades da silhueta (y para cima).
  ctx.setTransform(TEX / b.w, 0, 0, -TEX / b.h, (-b.minX * TEX) / b.w, TEX + (b.minY * TEX) / b.h);
  ctx.fillStyle = INK;
  ctx.fillRect(b.minX, b.minY, b.w, b.h);

  // Listras verticais vermelhas, com leve variação de tom (trama)
  const stripe = 0.078;
  for (let x = -0.3; x < 0.3; x += stripe * 2) {
    const g = ctx.createLinearGradient(x, 0, x + stripe, 0);
    g.addColorStop(0, DEEP_RED);
    g.addColorStop(0.18, BRAND_RED);
    g.addColorStop(0.82, BRAND_RED);
    g.addColorStop(1, DEEP_RED);
    ctx.fillStyle = g;
    ctx.fillRect(x, -0.6, stripe, 1.2);
  }

  // Laterais e mangas pretas
  ctx.fillStyle = INK;
  ctx.fillRect(0.27, -0.6, 0.4, 1.2);
  ctx.fillRect(-0.67, -0.6, 0.4, 1.2);

  // Punhos: faixa vermelha fina
  ctx.lineWidth = 0.018;
  ctx.strokeStyle = BRAND_RED;
  for (const sx of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(sx * 0.535, 0.165);
    ctx.lineTo(sx * 0.405, 0.05);
    ctx.stroke();
  }

  // Barra: leve escurecido
  const hem = ctx.createLinearGradient(0, -0.55, 0, -0.4);
  hem.addColorStop(0, "rgba(0,0,0,0.55)");
  hem.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hem;
  ctx.fillRect(-0.6, -0.6, 1.2, 0.2);

  // Trama do tecido: micro-linhas diagonais muito sutis
  ctx.save();
  ctx.clip(new Path2D(shapeToPath(shape)));
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.0012;
  for (let x = -1; x < 1; x += 0.006) {
    ctx.beginPath();
    ctx.moveTo(x, -0.6);
    ctx.lineTo(x + 0.3, 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function shapeToPath(shape: THREE.Shape) {
  const pts = shape.getPoints(24);
  return "M" + pts.map((p) => `${p.x} ${p.y}`).join("L") + "Z";
}

function makeFrontTexture(
  b: { minX: number; minY: number; w: number; h: number },
  shape: THREE.Shape,
) {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  const ctx = c.getContext("2d")!;
  paintBase(ctx, b, shape);

  // Gola: faixa preta + filete vermelho
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.moveTo(-0.14, 0.475);
  ctx.quadraticCurveTo(0, 0.33, 0.14, 0.475);
  ctx.stroke();
  ctx.strokeStyle = BRAND_RED;
  ctx.lineWidth = 0.008;
  ctx.beginPath();
  ctx.moveTo(-0.155, 0.45);
  ctx.quadraticCurveTo(0, 0.3, 0.155, 0.45);
  ctx.stroke();

  // Escudo PH (peito esquerdo de quem veste = direita de quem olha)
  const toPx = (x: number, y: number) => [
    ((x - b.minX) / b.w) * TEX,
    (1 - (y - b.minY) / b.h) * TEX,
  ];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const [cx, cy] = toPx(0.15, 0.25);
  const r = (0.058 / b.w) * TEX;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${r * 0.9}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PH", cx, cy + r * 0.05);

  // Chevrons da marca (peito oposto), ecoando o fundo
  const [kx, ky] = toPx(-0.15, 0.25);
  const k = r * 0.5;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = r * 0.16;
  ctx.lineJoin = "miter";
  for (let i = 0; i < 3; i++) {
    const ox = kx - k * 1.4 + i * k * 0.9;
    ctx.beginPath();
    ctx.moveTo(ox, ky - k);
    ctx.lineTo(ox + k * 0.8, ky);
    ctx.lineTo(ox, ky + k);
    ctx.stroke();
  }

  // Assinatura discreta abaixo do escudo
  ctx.font = `800 ${r * 0.34}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("PH SPORTS", cx, cy + r * 1.55);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBackTexture(
  b: { minX: number; minY: number; w: number; h: number },
  shape: THREE.Shape,
) {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  const ctx = c.getContext("2d")!;
  paintBase(ctx, b, shape);

  // Gola traseira (mais alta)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.moveTo(-0.14, 0.47);
  ctx.quadraticCurveTo(0, 0.43, 0.14, 0.47);
  ctx.stroke();

  // Nome e número, espelhados para lerem corretamente pelas costas
  ctx.setTransform(-1, 0, 0, 1, TEX, 0);
  const toPx = (x: number, y: number) => [
    ((x - b.minX) / b.w) * TEX,
    (1 - (y - b.minY) / b.h) * TEX,
  ];
  const [nx, ny] = toPx(0, 0.3);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${TEX * 0.052}px Inter, system-ui, sans-serif`;
  ctx.fillText("P H   S P O R T S", nx, ny);
  const [mx, my] = toPx(0, 0.02);
  ctx.font = `900 ${TEX * 0.3}px Inter, system-ui, sans-serif`;
  ctx.lineWidth = TEX * 0.012;
  ctx.strokeStyle = INK;
  ctx.strokeText("10", mx, my);
  ctx.fillText("10", mx, my);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeKnitBump() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#5a5a5a";
  for (let y = 0; y < 64; y += 8) {
    for (let x = (y / 8) % 2 ? 4 : 0; x < 64; x += 8) {
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  return tex;
}

function makeShadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.45, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/* ---------- Cena ---------- */

export function createShirtScene(canvas: HTMLCanvasElement): ShirtScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  // Luzes suaves: preenchimento, principal e recorte
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1a1a, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2dc, 1.6);
  rim.position.set(4, 2, -4);
  scene.add(rim);

  // Modelo
  const shape = shirtShape();
  const poly = shape.getPoints(24).map((p) => ({ x: p.x, y: p.y }));
  const minX = Math.min(...poly.map((p) => p.x));
  const maxX = Math.max(...poly.map((p) => p.x));
  const minY = Math.min(...poly.map((p) => p.y));
  const maxY = Math.max(...poly.map((p) => p.y));
  const bounds = { minX, minY, w: maxX - minX, h: maxY - minY };

  const geometry = buildShirtGeometry(poly, bounds);
  const bump = makeKnitBump();
  const fabric = (map: THREE.Texture) =>
    new THREE.MeshPhysicalMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.6,
      roughness: 0.78,
      metalness: 0,
      sheen: 0.25,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color("#ffffff"),
    });
  const frontTex = makeFrontTexture(bounds, shape);
  const backTex = makeBackTexture(bounds, shape);
  const materials = [fabric(frontTex), fabric(backTex)];
  const body = new THREE.Mesh(geometry, materials);

  // Gola em tubo (frente mais funda, costas mais alta)
  const collarPath = new THREE.CurvePath<THREE.Vector3>();
  collarPath.add(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.13, 0.47, 0),
      new THREE.Vector3(0, 0.33, 0.012),
      new THREE.Vector3(0.13, 0.47, 0),
    ),
  );
  collarPath.add(
    new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.13, 0.47, 0),
      new THREE.Vector3(0, 0.45, -0.03),
      new THREE.Vector3(-0.13, 0.47, 0),
    ),
  );
  const collarGeo = new THREE.TubeGeometry(
    collarPath as unknown as THREE.Curve<THREE.Vector3>,
    96,
    0.016,
    12,
    true,
  );
  const collarMat = new THREE.MeshPhysicalMaterial({
    color: INK,
    roughness: 0.6,
    sheen: 0.5,
    sheenColor: new THREE.Color(BRAND_RED),
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);

  const model = new THREE.Group();
  model.add(body, collar);
  model.position.set(-(minX + maxX) / 2, -(minY + maxY) / 2, 0);

  const shirtGroup = new THREE.Group();
  shirtGroup.name = "ShirtGroup";
  shirtGroup.add(model);
  shirtGroup.rotation.set(0.04, -0.32, 0); // ângulo fixo para mostrar volume; sem girar na entrada
  scene.add(shirtGroup);

  // Sombra de contato sutil (não gira junto)
  const shadowTex = makeShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.renderOrder = -1;
  scene.add(shadow);

  const shirtAspect = bounds.w / bounds.h;

  const viewSize = () => {
    const h = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return { w: h * camera.aspect, h };
  };

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 768 ? 1.75 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const renderOnce = () => {
    const s = shirtGroup.scale.y;
    shadow.position.set(shirtGroup.position.x, shirtGroup.position.y - 0.56 * s, -0.35 * s);
    shadow.scale.set(0.95 * s * shirtAspect, 0.16 * s, 1);
    renderer.render(scene, camera);
  };

  // Loop com requestAnimationFrame; pausa fora da tela ou com a aba oculta.
  let raf = 0;
  let onScreen = true;
  const loop = () => {
    raf = 0;
    if (!onScreen || document.hidden) return;
    renderOnce();
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    kick();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", kick);

  resize();
  kick();

  const dispose = () => {
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener("visibilitychange", kick);
    geometry.dispose();
    collarGeo.dispose();
    shadowGeo.dispose();
    for (const m of [...materials, collarMat, shadowMat]) m.dispose();
    for (const t of [frontTex, backTex, bump, shadowTex, envTex]) t.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return { canvas, shirtGroup, shirtAspect, viewSize, resize, renderOnce, dispose };
}
