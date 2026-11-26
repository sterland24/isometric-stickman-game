import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM stand-ins so the input manager can attach its listeners in Node.
globalThis.window ??= new EventTarget();
globalThis.document ??= Object.assign(new EventTarget(), { hidden: false });

const { createInputManager } = await import('../src/input/inputManager.js');

function setup() {
  const input = createInputManager(new EventTarget(), () => ({ W: 800, H: 600 }), { x: 0, y: 0 }, { x: 0, y: 0 });
  const send = (type, code) => {
    const e = new Event(type, { cancelable: true });
    e.code = code;
    window.dispatchEvent(e);
  };
  return { input, send };
}

test('releasing one bound key keeps the action while another bound key is held', () => {
  const pairs = [
    ['KeyW', 'ArrowUp', 'up'],
    ['KeyS', 'ArrowDown', 'down'],
    ['KeyA', 'ArrowLeft', 'left'],
    ['KeyD', 'ArrowRight', 'right'],
    ['ShiftLeft', 'ShiftRight', 'run'],
  ];
  for (const [a, b, action] of pairs) {
    const { input, send } = setup();
    send('keydown', a);
    send('keydown', b);
    send('keyup', b);
    assert.equal(input.keys[action], true, `${action} should stay held via ${a}`);
    send('keyup', a);
    assert.equal(input.keys[action], false, `${action} should clear after both keys release`);
  }
});

test('window blur clears held keys so they do not stick afterwards', () => {
  const { input, send } = setup();
  send('keydown', 'KeyW');
  send('keydown', 'ArrowUp');
  window.dispatchEvent(new Event('blur'));
  assert.equal(input.keys.up, false);

  // A later press/release of one key must not be kept alive by stale state.
  send('keydown', 'ArrowUp');
  send('keyup', 'ArrowUp');
  assert.equal(input.keys.up, false);
});
