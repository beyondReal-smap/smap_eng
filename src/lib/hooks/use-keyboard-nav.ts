'use client';

import { useEffect } from 'react';

export type KeyHandler = (event: KeyboardEvent) => void;

export interface KeyBindings {
  [key: string]: KeyHandler | undefined;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * bindings 맵에서 해당 키 이벤트의 핸들러를 찾는다.
 *
 * IME/한영 모드가 한글인 경우 `e.key`가 한글 자모("ㅏ", "ㅈ" …)로 들어와
 * 영문 기반 바인딩이 매칭되지 않는다. 이를 막기 위해 물리 키 위치를 담은
 * `e.code`("KeyK", "Digit1" …)를 폴백으로 사용한다.
 *
 * 우선순위: bindings[e.key] → bindings[letter] → bindings[digit]
 */
function resolveHandler(
  bindings: KeyBindings,
  e: KeyboardEvent,
): KeyHandler | undefined {
  if (bindings[e.key]) return bindings[e.key];
  const code = e.code;
  if (!code) return undefined;

  if (code.startsWith('Key') && code.length === 4) {
    // 물리 문자키. Shift 상태에 맞춰 대/소문자 후보를 순차 시도.
    const upper = code.charAt(3);
    const lower = upper.toLowerCase();
    if (e.shiftKey && bindings[upper]) return bindings[upper];
    if (bindings[lower]) return bindings[lower];
    if (bindings[upper]) return bindings[upper];
  }
  if (code.startsWith('Digit') && code.length === 6) {
    const digit = code.charAt(5);
    if (bindings[digit]) return bindings[digit];
  }
  return undefined;
}

// 전역 keydown 리스너를 걸고 바인딩 맵의 키에 해당하는 핸들러를 실행.
// 입력 요소(input/textarea/contenteditable)에 포커스가 있을 때는 무시하여 타이핑을 막지 않음.
export function useKeyboardNav(bindings: KeyBindings, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const handler = resolveHandler(bindings, e);
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings, enabled]);
}
