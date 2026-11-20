// Track remappable keyboard actions and drag-look without locking the pointer.
export const DEFAULT_BINDINGS = Object.freeze({
  forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD',
  sprint: 'ShiftLeft', jump: 'Space', vault: 'KeyE', help: 'KeyH',
  rain: 'KeyR', time: 'KeyN', interact: 'KeyE', horn: 'KeyQ', handbrake: 'Space',
  pause: 'Escape', phone: 'KeyP', radioNext: 'KeyC',
  weapon1: 'Digit1', weapon2: 'Digit2', weapon3: 'Digit3',
});

export function labelFor(code) {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Shift')) return 'Shift';
  return code.replace(/^(Arrow|Digit)/, '');
}

export function createInputManager(canvas) {
  const bindings = { ...DEFAULT_BINDINGS };
  const pressed = new Set();
  const justPressed = new Set();
  let pendingAction = null;
  let lookX = 0;
  let lookY = 0;
  let dragging = false;
  const cleanup = [];

  const keydown = (event) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName) && !pendingAction && event.code !== 'Escape') return;
    if (pendingAction) {
      event.preventDefault();
      bindings[pendingAction] = event.code;
      pendingAction = null;
      window.dispatchEvent(new CustomEvent('controls-updated'));
      return;
    }
    // Shared keys deliberately activate both contracts (vault/interact, jump/handbrake).
    for (const action of Object.keys(bindings).filter(name => bindings[name] === event.code)) {
      if (!pressed.has(action) && !event.repeat) justPressed.add(action);
      pressed.add(action);
      if (!['help', 'rain', 'time', 'pause'].includes(action)) event.preventDefault();
    }
  };
  const keyup = (event) => {
    Object.keys(bindings).forEach((action) => {
      if (bindings[action] === event.code) pressed.delete(action);
    });
  };
  const blur = () => { pressed.clear(); justPressed.clear(); };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  const reset = () => { Object.assign(bindings, DEFAULT_BINDINGS); blur(); window.dispatchEvent(new CustomEvent('controls-updated')); };
  window.addEventListener('controls-reset', reset);
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    lookX += event.movementX;
    lookY += event.movementY;
  });
  canvas.addEventListener('wheel', (event) => {
    lookY += event.deltaY * 0.035;
    event.preventDefault();
  }, { passive: false });

  document.querySelectorAll('[data-bind]').forEach((button) => {
    const action = button.dataset.bind;
    const update = () => { button.textContent = labelFor(bindings[action]); };
    button.addEventListener('click', () => {
      pendingAction = action;
      button.textContent = 'Press a key…';
    });
    window.addEventListener('controls-updated', update);
    cleanup.push(() => window.removeEventListener('controls-updated', update));
    update();
  });

  return {
    dispose() { window.removeEventListener('keydown', keydown);window.removeEventListener('keyup', keyup);window.removeEventListener('blur', blur);window.removeEventListener('controls-reset', reset);cleanup.forEach(fn=>fn());blur(); },
    down(action) { return pressed.has(action); },
    consumePress(action) {
      const active = justPressed.has(action);
      justPressed.delete(action);
      return active;
    },
    consumeLook() {
      const look = { x: lookX, y: lookY };
      lookX = 0;
      lookY = 0;
      return look;
    },
    bindings,
    beginBinding(action) { pendingAction = action; },
  };
}
