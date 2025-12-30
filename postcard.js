import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js";

/* ---------------- Scene / Camera / Renderer ---------------- */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = 0;
document.body.appendChild(renderer.domElement);

/* ---------------- Background ---------------- */
const loader = new THREE.TextureLoader();
loader.load("/background.jpg", tex => {
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
});

/* ---------------- Back Texture (Paper + Text + Stamp) ---------------- */
function createBackTexture() {
  const canvas = document.createElement("canvas");
  const postcardWidth = 2;
  const postcardHeight = 1.3;
  const canvasWidth = 1024;
  const canvasHeight = Math.round(canvasWidth * (postcardHeight / postcardWidth));
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const paper = new Image();
  paper.src = "/paper.jpg";

  const stamp = new Image();
  stamp.src = "/stamp.png";

  let loaded = 0;
  const onLoad = () => {
    loaded++;
    if (loaded < 2) return;

    // ---- Background paper ----
    ctx.drawImage(paper, 0, 0, canvas.width, canvas.height);

    // ---- Message on left side ----
    ctx.font = `${Math.round(canvasHeight * 0.06)}px Oliver`;
    ctx.fillStyle = "#2f2f2f";
    ctx.textBaseline = "top";

    const messageLines = [
      "Dear Hil,",
      "you are cute!",
      "as cute as this raccoo",
      "n!!! Merry Kristmas n",
      "Happy New Years",
      "",
      "From,",
      "Mork"
    ];

    const messageX = canvasWidth * 0.05;
    const messageY = canvasHeight * 0.1;
    const lineHeight = canvasHeight * 0.1;

    messageLines.forEach((line, i) => {
      ctx.fillText(line, messageX, messageY + i * lineHeight);
    });

    // ---- Right side: address in lower third ----
    ctx.font = `${Math.round(canvasHeight * 0.045)}px Winkle`;
    ctx.textAlign = "left";

    const addressLines = [
      "Ms. Hil da Racoon",
      "123 Forest Lane",
      "Raccoonville, BC V5A 1S6",
      "Kanada"
    ];

    const dividerX = canvasWidth * 0.5;
    const addressX = dividerX + canvasWidth * 0.05; // inset from divider
    const lineLength = canvasWidth * 0.4; // constant line length
    const totalAddressHeight = addressLines.length * (canvasHeight * 0.08 + 10);

    // Position starting in lower third
    const lowerThirdY = canvasHeight * (2 / 3);
    let addressStartY = lowerThirdY - totalAddressHeight / 2;

    addressLines.forEach((line) => {
      ctx.fillText(line, addressX, addressStartY);

      // Draw underline of constant length
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(addressX, addressStartY + canvasHeight * 0.045 + 5);
      ctx.lineTo(addressX + lineLength, addressStartY + canvasHeight * 0.045 + 5);
      ctx.stroke();

      addressStartY += canvasHeight * 0.08 + 10;
    });

    // ---- Divider line ----
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(dividerX, canvasHeight * 0.05);
    ctx.lineTo(dividerX, canvasHeight * 0.95);
    ctx.stroke();

    // ---- Stamp (top-right corner) ----
    const margin = canvasWidth * 0.06;
    const stampMaxHeight = canvasHeight * 0.22;
    const stampAspect = stamp.naturalWidth / stamp.naturalHeight;
    const stampHeight = stampMaxHeight;
    const stampWidth = stampHeight * stampAspect;

    ctx.drawImage(
      stamp,
      canvasWidth - stampWidth - margin,
      margin,
      stampWidth,
      stampHeight
    );

    texture.needsUpdate = true;
  };

  paper.onload = onLoad;
  stamp.onload = onLoad;

  return texture;
}

/* ---------------- Postcard ---------------- */
const front = loader.load("/front_raccoon.jpg");
front.colorSpace = THREE.SRGBColorSpace;

const transparent = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });

const postcard = new THREE.Mesh(
  new THREE.BoxGeometry(2, 1.3, 0.03),
  [
    transparent, transparent, transparent, transparent,
    new THREE.MeshBasicMaterial({ map: front }),
    new THREE.MeshBasicMaterial({ map: createBackTexture() })
  ]
);

/* ---------------- Envelope ---------------- */
const envelopeTex = loader.load("/envelope.png");
envelopeTex.colorSpace = THREE.SRGBColorSpace;

const envelope = new THREE.Mesh(
  new THREE.PlaneGeometry(2.05, 1.35),
  new THREE.MeshBasicMaterial({ map: envelopeTex, transparent: true })
);
envelope.position.z = 0.04;

/* ---------------- Card Group ---------------- */
const cardGroup = new THREE.Group();
cardGroup.add(postcard);
cardGroup.add(envelope);
scene.add(cardGroup);

/* ---------------- Snow ---------------- */
const snowCanvas = document.createElement("canvas");
snowCanvas.width = 32;
snowCanvas.height = 32;
const sctx = snowCanvas.getContext("2d");
const grad = sctx.createRadialGradient(16, 16, 2, 16, 16, 16);
grad.addColorStop(0, "white");
grad.addColorStop(1, "rgba(255,255,255,0)");
sctx.fillStyle = grad;
sctx.fillRect(0, 0, 32, 32);
const snowTexture = new THREE.CanvasTexture(snowCanvas);

const SNOW_COUNT = 1200;
let snow, snowGeometry, snowWidth, snowHeight;

function computeSnowBounds() {
  const vFOV = camera.fov * Math.PI / 180;
  snowHeight = 2 * Math.tan(vFOV / 2) * Math.abs(-1.7 - camera.position.z);
  snowWidth = snowHeight * camera.aspect;
}

function initSnow() {
  computeSnowBounds();
  const positions = new Float32Array(SNOW_COUNT * 3);
  const sizes = new Float32Array(SNOW_COUNT);

  for (let i = 0; i < SNOW_COUNT; i++) {
    positions[i * 3] = THREE.MathUtils.randFloat(-snowWidth / 2, snowWidth / 2);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(-snowHeight / 2, snowHeight / 2 + 5);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(-2.2, -1.2);
    sizes[i] = THREE.MathUtils.randFloat(0.08, 0.4);
  }

  snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  snowGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { map: { value: snowTexture } },
    vertexShader: `
      attribute float size;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      void main() {
        vec4 c = texture2D(map, gl_PointCoord);
        if (c.a < 0.1) discard;
        gl_FragColor = vec4(c.rgb, c.a * 0.7);
      }
    `,
    transparent: true,
    depthWrite: false
  });

  if (snow) scene.remove(snow);
  snow = new THREE.Points(snowGeometry, material);
  scene.add(snow);
}

initSnow();

/* ---------------- Interaction ---------------- */
let mouseX = 0, mouseY = 0;
let flipRotation = 0;
let envelopeOpening = false;
let envelopeProgress = 0;

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 0.3;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
});

document.addEventListener("click", () => {
  if (!envelopeOpening && envelopeProgress === 0) {
    envelopeOpening = true;
  } else if (envelopeProgress >= 1) {
    flipRotation += Math.PI;
  }
});

/* ---------------- Animation ---------------- */
function animate() {
  requestAnimationFrame(animate);

  // Mouse + flip
  cardGroup.rotation.y += (flipRotation + mouseX - cardGroup.rotation.y) * 0.05;
  cardGroup.rotation.x += (mouseY - cardGroup.rotation.x) * 0.05;

  // Envelope animation
  if (envelopeOpening && envelopeProgress < 1) {
    envelopeProgress += 0.04;
    envelope.position.y = envelopeProgress * 1.6;
    envelope.material.opacity = 1 - envelopeProgress;
  }

  // Snow movement
  const pos = snowGeometry.attributes.position.array;
  for (let i = 0; i < SNOW_COUNT; i++) {
    const i3 = i * 3;
    pos[i3 + 1] -= 0.006;
    if (pos[i3 + 1] < -snowHeight / 2) {
      pos[i3 + 1] = snowHeight / 2 + 5;
      pos[i3] = THREE.MathUtils.randFloat(-snowWidth / 2, snowWidth / 2);
    }
  }
  snowGeometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

animate();

/* ---------------- Resize ---------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  initSnow();
});
