"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const frame = document.querySelector(".game-frame");

const ui = {
  score: document.getElementById("scoreValue"),
  level: document.getElementById("levelValue"),
  lives: document.getElementById("livesValue"),
  highScore: document.getElementById("highScoreValue"),
  finalScore: document.getElementById("finalScore"),
  highScoreNote: document.getElementById("highScoreNote"),
  resultKicker: document.getElementById("resultKicker"),
  resultTitle: document.getElementById("resultTitle"),
  liveStatus: document.getElementById("liveStatus"),
  startOverlay: document.getElementById("startOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  resultOverlay: document.getElementById("resultOverlay"),
  start: document.getElementById("startButton"),
  pause: document.getElementById("pauseButton"),
  resume: document.getElementById("resumeButton"),
  retry: document.getElementById("retryButton"),
  sound: document.getElementById("soundButton"),
  connection: document.getElementById("connectionStatus")
};

const WORLD = { width: 720, height: 1080 };
const COLORS = ["#51e7ff", "#6d9cff", "#9b7bff", "#ff5dba", "#ff9c66"];
const IDOL_COUNT = 8;
const STORAGE_KEY = "neon-break-high-score";
const SOUND_KEY = "neon-break-sound";
const idolFaces = new Image();
idolFaces.decoding = "async";
idolFaces.addEventListener("load", () => {
  draw();
});
idolFaces.src = "./assets/idol-faces.jpg";

const state = {
  mode: "ready",
  score: 0,
  level: 1,
  lives: 3,
  highScore: readNumber(STORAGE_KEY),
  sound: localStorage.getItem(SOUND_KEY) === "on",
  lastTime: 0,
  accumulator: 0,
  keys: { left: false, right: false },
  pointerActive: false,
  shake: 0,
  particles: [],
  bricks: []
};

const paddle = {
  x: WORLD.width / 2,
  y: WORLD.height - 98,
  width: 150,
  height: 22,
  speed: 690
};

const ball = {
  x: WORLD.width / 2,
  y: paddle.y - 22,
  radius: 12,
  vx: 0,
  vy: 0,
  stuck: true,
  trail: []
};

let audioContext = null;

function readNumber(key) {
  const value = Number.parseInt(localStorage.getItem(key) || "0", 10);
  return Number.isFinite(value) ? value : 0;
}

function formatScore(value) {
  return Math.max(0, value).toString().padStart(6, "0");
}

function announce(message) {
  ui.liveStatus.textContent = "";
  window.setTimeout(() => {
    ui.liveStatus.textContent = message;
  }, 30);
}

function updateUI() {
  ui.score.textContent = formatScore(state.score);
  ui.level.textContent = state.level.toString().padStart(2, "0");
  ui.lives.textContent = Array.from({ length: state.lives }, () => "●").join(" ");
  ui.lives.setAttribute("aria-label", `${state.lives}`);
  ui.highScore.textContent = formatScore(state.highScore);
  ui.pause.disabled = state.mode !== "playing";
}

function setOverlay(element, visible) {
  element.classList.toggle("hidden", !visible);
}

function configureLevel() {
  const columns = 8;
  const rows = Math.min(5 + state.level, 9);
  const gap = 10;
  const side = 42;
  const width = (WORLD.width - side * 2 - gap * (columns - 1)) / columns;
  const height = 37;
  const startY = 145;
  state.bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const patternHole = state.level > 1 && (row + column + state.level) % 11 === 0;
      if (patternHole) continue;
      const strength = state.level >= 3 && row < Math.min(2, Math.floor(state.level / 2)) ? 2 : 1;
      state.bricks.push({
        x: side + column * (width + gap),
        y: startY + row * (height + gap),
        width,
        height,
        strength,
        maxStrength: strength,
        color: COLORS[(row + state.level - 1) % COLORS.length],
        idol: (row * 3 + column + state.level - 1) % IDOL_COUNT,
        alive: true
      });
    }
  }
}

function resetPaddleAndBall() {
  paddle.width = Math.max(104, 150 - (state.level - 1) * 5);
  paddle.x = WORLD.width / 2;
  ball.x = paddle.x;
  ball.y = paddle.y - ball.radius - 4;
  ball.vx = 0;
  ball.vy = 0;
  ball.stuck = true;
  ball.trail.length = 0;
}

function launchBall() {
  if (!ball.stuck || state.mode !== "playing") return;
  const speed = Math.min(590, 420 + state.level * 23);
  const direction = Math.random() < 0.5 ? -1 : 1;
  ball.vx = speed * 0.48 * direction;
  ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
  ball.stuck = false;
  beep(520, 0.05, "sine", 0.04);
}

function startGame() {
  state.score = 0;
  state.level = 1;
  state.lives = 3;
  state.particles.length = 0;
  configureLevel();
  resetPaddleAndBall();
  state.mode = "playing";
  state.lastTime = performance.now();
  setOverlay(ui.startOverlay, false);
  setOverlay(ui.pauseOverlay, false);
  setOverlay(ui.resultOverlay, false);
  updateUI();
  canvas.focus({ preventScroll: true });
  announce("ゲーム開始。ボールを発射します。");
  window.setTimeout(launchBall, 550);
}

function togglePause(forceResume = false) {
  if (state.mode === "playing" && !forceResume) {
    state.mode = "paused";
    setOverlay(ui.pauseOverlay, true);
    ui.resume.focus();
    announce("一時停止しました。");
  } else if (state.mode === "paused") {
    state.mode = "playing";
    state.lastTime = performance.now();
    setOverlay(ui.pauseOverlay, false);
    canvas.focus({ preventScroll: true });
    announce("ゲームを再開しました。");
  }
  updateUI();
}

function endGame(cleared = false) {
  state.mode = "ended";
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
    ui.highScoreNote.textContent = `NEW BEST! ${formatScore(state.highScore)}`;
  } else {
    ui.highScoreNote.textContent = `ベストスコア ${formatScore(state.highScore)}`;
  }
  ui.resultKicker.textContent = cleared ? "ALL CLEAR" : "GAME OVER";
  ui.resultTitle.textContent = cleared ? "完全制覇！" : "もう一度、挑戦。";
  ui.finalScore.textContent = formatScore(state.score);
  setOverlay(ui.resultOverlay, true);
  updateUI();
  ui.retry.focus();
  announce(`${cleared ? "全レベルクリア" : "ゲームオーバー"}。スコア${state.score}点。`);
}

function nextLevel() {
  state.level += 1;
  state.score += 500 * state.level;
  if (state.level > 12) {
    endGame(true);
    return;
  }
  configureLevel();
  resetPaddleAndBall();
  updateUI();
  announce(`レベル${state.level}。`);
  beep(660, 0.09, "triangle", 0.05);
  window.setTimeout(launchBall, 700);
}

function loseLife() {
  state.lives -= 1;
  state.shake = 10;
  beep(120, 0.18, "sawtooth", 0.05);
  if (navigator.vibrate) navigator.vibrate(45);
  updateUI();
  if (state.lives <= 0) {
    endGame(false);
  } else {
    resetPaddleAndBall();
    announce(`ミス。残りライフ${state.lives}。`);
    window.setTimeout(launchBall, 700);
  }
}

function circleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function spawnParticles(x, y, color, count = 9) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      maxLife: 0.7,
      color,
      size: 2 + Math.random() * 5
    });
  }
}

function update(dt) {
  const direction = Number(state.keys.right) - Number(state.keys.left);
  if (!state.pointerActive && direction !== 0) {
    paddle.x += direction * paddle.speed * dt;
  }
  paddle.x = Math.max(paddle.width / 2 + 18, Math.min(WORLD.width - paddle.width / 2 - 18, paddle.x));

  if (ball.stuck) {
    ball.x = paddle.x;
    ball.y = paddle.y - ball.radius - 4;
  } else {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.trail.unshift({ x: ball.x, y: ball.y });
    if (ball.trail.length > 8) ball.trail.pop();

    if (ball.x - ball.radius <= 18 && ball.vx < 0) {
      ball.x = 18 + ball.radius;
      ball.vx *= -1;
      beep(250, 0.025, "sine", 0.018);
    } else if (ball.x + ball.radius >= WORLD.width - 18 && ball.vx > 0) {
      ball.x = WORLD.width - 18 - ball.radius;
      ball.vx *= -1;
      beep(250, 0.025, "sine", 0.018);
    }

    if (ball.y - ball.radius <= 18 && ball.vy < 0) {
      ball.y = 18 + ball.radius;
      ball.vy *= -1;
    }

    const paddleRect = {
      x: paddle.x - paddle.width / 2,
      y: paddle.y,
      width: paddle.width,
      height: paddle.height
    };
    if (ball.vy > 0 && circleRectCollision(ball, paddleRect)) {
      ball.y = paddle.y - ball.radius;
      const offset = (ball.x - paddle.x) / (paddle.width / 2);
      const speed = Math.min(650, Math.hypot(ball.vx, ball.vy) * 1.012);
      const angle = offset * 1.05;
      ball.vx = Math.sin(angle) * speed;
      ball.vy = -Math.max(230, Math.cos(angle) * speed);
      beep(420, 0.035, "square", 0.025);
    }

    for (const brick of state.bricks) {
      if (!brick.alive || !circleRectCollision(ball, brick)) continue;
      const overlapLeft = ball.x + ball.radius - brick.x;
      const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
      const overlapTop = ball.y + ball.radius - brick.y;
      const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
      if (Math.min(overlapLeft, overlapRight) < Math.min(overlapTop, overlapBottom)) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }

      brick.strength -= 1;
      state.score += 50 * state.level;
      if (brick.strength <= 0) {
        brick.alive = false;
        state.score += 50 * state.level;
        spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
      } else {
        spawnParticles(ball.x, ball.y, brick.color, 4);
      }
      beep(300 + (brick.y % 240), 0.035, "triangle", 0.025);
      updateUI();
      break;
    }

    if (ball.y - ball.radius > WORLD.height) loseLife();
    if (state.bricks.length > 0 && state.bricks.every((brick) => !brick.alive)) nextLevel();
  }

  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 320 * dt;
    if (particle.life <= 0) state.particles.splice(index, 1);
  }
  state.shake = Math.max(0, state.shake - 40 * dt);
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, "#101c35");
  gradient.addColorStop(0.55, "#091221");
  gradient.addColorStop(1, "#070c16");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(92, 137, 205, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 30; x < WORLD.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD.height);
    ctx.stroke();
  }
  for (let y = 30; y < WORLD.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD.width, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(WORLD.width / 2, 300, 10, WORLD.width / 2, 300, 440);
  glow.addColorStop(0, "rgba(90, 113, 255, 0.1)");
  glow.addColorStop(1, "rgba(90, 113, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WORLD.width, 740);
}

function drawBricks() {
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    drawIdolBrick(brick);
  }
}

function drawIdolBrick(brick) {
  const damaged = brick.strength < brick.maxStrength;

  ctx.save();
  ctx.globalAlpha = damaged ? 0.7 : 1;
  ctx.shadowColor = brick.color;
  ctx.shadowBlur = damaged ? 7 : 13;
  roundedRect(brick.x, brick.y, brick.width, brick.height, 10);
  ctx.clip();
  ctx.fillStyle = "#18233c";
  ctx.fill();

  if (idolFaces.complete && idolFaces.naturalWidth > 0) {
    const sourceWidth = idolFaces.naturalWidth / 4;
    const sourceHeight = idolFaces.naturalHeight / 2;
    const sourceX = (brick.idol % 4) * sourceWidth;
    const sourceY = Math.floor(brick.idol / 4) * sourceHeight;
    ctx.drawImage(
      idolFaces,
      sourceX,
      sourceY + sourceHeight * 0.08,
      sourceWidth,
      sourceHeight * 0.62,
      brick.x,
      brick.y,
      brick.width,
      brick.height
    );
  }

  const shade = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
  shade.addColorStop(0, "rgba(255,255,255,0.12)");
  shade.addColorStop(0.55, "rgba(0,0,0,0)");
  shade.addColorStop(1, damaged ? "rgba(115,0,22,0.58)" : "rgba(6,10,22,0.25)");
  ctx.fillStyle = shade;
  ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

  if (damaged) {
    ctx.strokeStyle = "rgba(255, 88, 125, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(brick.x + brick.width * 0.45, brick.y);
    ctx.lineTo(brick.x + brick.width * 0.53, brick.y + brick.height * 0.35);
    ctx.lineTo(brick.x + brick.width * 0.42, brick.y + brick.height * 0.58);
    ctx.lineTo(brick.x + brick.width * 0.58, brick.y + brick.height);
    ctx.stroke();
  }

  ctx.restore();
  ctx.save();
  ctx.shadowColor = brick.color;
  ctx.shadowBlur = damaged ? 6 : 12;
  ctx.lineWidth = damaged ? 2.5 : 1.5;
  ctx.strokeStyle = damaged ? "rgba(255, 88, 125, 0.95)" : "rgba(255,255,255,0.72)";
  roundedRect(brick.x, brick.y, brick.width, brick.height, 10);
  ctx.stroke();
  ctx.restore();
}

function drawPaddle() {
  ctx.save();
  ctx.shadowColor = "#51e7ff";
  ctx.shadowBlur = 24;
  const gradient = ctx.createLinearGradient(paddle.x - paddle.width / 2, 0, paddle.x + paddle.width / 2, 0);
  gradient.addColorStop(0, "#48baf8");
  gradient.addColorStop(0.5, "#d8ffff");
  gradient.addColorStop(1, "#9b7bff");
  ctx.fillStyle = gradient;
  roundedRect(paddle.x - paddle.width / 2, paddle.y, paddle.width, paddle.height, 11);
  ctx.fill();
  ctx.restore();
}

function drawBall() {
  ctx.save();
  ball.trail.forEach((point, index) => {
    ctx.globalAlpha = (1 - index / ball.trail.length) * 0.18;
    ctx.fillStyle = "#51e7ff";
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.radius * (1 - index * 0.07), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowColor = "#8af2ff";
  ctx.shadowBlur = 24;
  const gradient = ctx.createRadialGradient(ball.x - 4, ball.y - 5, 1, ball.x, ball.y, ball.radius);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#b9fbff");
  gradient.addColorStop(1, "#51e7ff");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  const scaleX = canvas.width / WORLD.width;
  const scaleY = canvas.height / WORLD.height;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  drawBackground();
  drawBricks();
  drawParticles();
  drawPaddle();
  drawBall();
  ctx.restore();
}

function loop(time) {
  const elapsed = Math.min(0.05, (time - state.lastTime) / 1000 || 0);
  state.lastTime = time;
  if (state.mode === "playing") {
    state.accumulator += elapsed;
    const fixedStep = 1 / 120;
    while (state.accumulator >= fixedStep) {
      update(fixedStep);
      state.accumulator -= fixedStep;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  const rect = frame.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
}

function movePaddleFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  paddle.x = ((event.clientX - rect.left) / rect.width) * WORLD.width;
  paddle.x = Math.max(paddle.width / 2 + 18, Math.min(WORLD.width - paddle.width / 2 - 18, paddle.x));
  if (ball.stuck) {
    ball.x = paddle.x;
  }
}

function beep(frequency, duration, type, volume) {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    state.sound = false;
  }
}

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode !== "playing") return;
  state.pointerActive = true;
  canvas.setPointerCapture(event.pointerId);
  movePaddleFromPointer(event);
  launchBall();
});

canvas.addEventListener("pointermove", (event) => {
  if (state.pointerActive && state.mode === "playing") movePaddleFromPointer(event);
});

canvas.addEventListener("pointerup", (event) => {
  state.pointerActive = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("pointercancel", () => {
  state.pointerActive = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    state.keys.left = true;
    event.preventDefault();
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    state.keys.right = true;
    event.preventDefault();
  }
  if (event.code === "Space") {
    if (state.mode === "ready" || state.mode === "ended") startGame();
    else if (state.mode === "paused") togglePause(true);
    else launchBall();
    event.preventDefault();
  }
  if (event.key.toLowerCase() === "p" || event.key === "Escape") {
    if (state.mode === "playing" || state.mode === "paused") togglePause();
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") state.keys.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") state.keys.right = false;
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.mode === "playing") togglePause();
});

ui.start.addEventListener("click", startGame);
ui.retry.addEventListener("click", startGame);
ui.pause.addEventListener("click", () => togglePause());
ui.resume.addEventListener("click", () => togglePause(true));
ui.sound.addEventListener("click", () => {
  state.sound = !state.sound;
  localStorage.setItem(SOUND_KEY, state.sound ? "on" : "off");
  ui.sound.setAttribute("aria-pressed", String(state.sound));
  ui.sound.setAttribute("aria-label", state.sound ? "サウンドをオフにする" : "サウンドをオンにする");
  if (state.sound) beep(600, 0.07, "sine", 0.04);
});

window.addEventListener("resize", resizeCanvas);
new ResizeObserver(resizeCanvas).observe(frame);

ui.sound.setAttribute("aria-pressed", String(state.sound));
ui.sound.setAttribute("aria-label", state.sound ? "サウンドをオフにする" : "サウンドをオンにする");
updateUI();
configureLevel();
resetPaddleAndBall();
resizeCanvas();
requestAnimationFrame(loop);

function setConnectionStatus(label, stateName) {
  ui.connection.textContent = label;
  ui.connection.dataset.state = stateName;
}

function updateConnectionStatus() {
  setConnectionStatus(navigator.onLine ? "オンライン" : "オフライン", navigator.onLine ? "online" : "offline");
}

window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
updateConnectionStatus();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          setConnectionStatus("更新中", "updating");
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "activated") updateConnectionStatus();
          });
        });
      })
      .catch(() => {
        setConnectionStatus("オフライン準備失敗", "error");
        announce("オフライン機能を準備できませんでした。");
      });
  });
}
