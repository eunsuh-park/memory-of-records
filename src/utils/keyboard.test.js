import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isJukeboxStepKey, isNewNoteShortcut } from './keyboard.js';

test('isJukeboxStepKey는 수식어 없는 좌우 화살표만 받는다', () => {
  assert.equal(isJukeboxStepKey({ key: 'ArrowLeft' }), true);
  assert.equal(isJukeboxStepKey({ key: 'ArrowRight' }), true);
  assert.equal(isJukeboxStepKey({ key: 'ArrowLeft', repeat: true }), false);
  assert.equal(isJukeboxStepKey({ key: 'ArrowRight', shiftKey: true }), false);
  assert.equal(isJukeboxStepKey({ key: 'ArrowLeft', ctrlKey: true }), false);
  assert.equal(isJukeboxStepKey({ key: 'Enter' }), false);
});

test('isNewNoteShortcut는 Ctrl/Cmd+Shift+N만 받는다', () => {
  assert.equal(isNewNoteShortcut({ key: 'N', ctrlKey: true, shiftKey: true }), true);
  assert.equal(isNewNoteShortcut({ key: 'n', metaKey: true, shiftKey: true }), true);
  assert.equal(isNewNoteShortcut({ key: 'n', ctrlKey: true }), false);
  assert.equal(isNewNoteShortcut({ key: 'n', ctrlKey: true, shiftKey: true, altKey: true }), false);
  assert.equal(isNewNoteShortcut({ key: 'n', ctrlKey: true, shiftKey: true, repeat: true }), false);
});
