import { KeyDefinition } from '../types/keyboard';

interface KeySpec {
  id: string;
  label: string;
  subLabel?: string;
  uWidth: number;
  gridX: number;
  ledIndex: number;
  code: string;
}

const ROW_0: KeySpec[] = [
  { id: 'esc', label: 'ESC', subLabel: '` ~', uWidth: 1.0, gridX: 0, ledIndex: 1, code: 'Escape' },
  { id: 'num_1', label: '1', subLabel: 'F1', uWidth: 1.0, gridX: 1, ledIndex: 9, code: 'Digit1' },
  { id: 'num_2', label: '2', subLabel: 'F2', uWidth: 1.0, gridX: 2, ledIndex: 17, code: 'Digit2' },
  { id: 'num_3', label: '3', subLabel: 'F3', uWidth: 1.0, gridX: 3, ledIndex: 25, code: 'Digit3' },
  { id: 'num_4', label: '4', subLabel: 'F4', uWidth: 1.0, gridX: 4, ledIndex: 33, code: 'Digit4' },
  { id: 'num_5', label: '5', subLabel: 'F5', uWidth: 1.0, gridX: 5, ledIndex: 41, code: 'Digit5' },
  { id: 'num_6', label: '6', subLabel: 'F6', uWidth: 1.0, gridX: 6, ledIndex: 49, code: 'Digit6' },
  { id: 'num_7', label: '7', subLabel: 'F7', uWidth: 1.0, gridX: 7, ledIndex: 57, code: 'Digit7' },
  { id: 'num_8', label: '8', subLabel: 'F8', uWidth: 1.0, gridX: 8, ledIndex: 65, code: 'Digit8' },
  { id: 'num_9', label: '9', subLabel: 'F9', uWidth: 1.0, gridX: 9, ledIndex: 73, code: 'Digit9' },
  { id: 'num_0', label: '0', subLabel: 'F10', uWidth: 1.0, gridX: 10, ledIndex: 81, code: 'Digit0' },
  { id: 'minus', label: '-', subLabel: 'F11', uWidth: 1.0, gridX: 11, ledIndex: 89, code: 'Minus' },
  { id: 'equal', label: '=', subLabel: 'F12', uWidth: 1.0, gridX: 12, ledIndex: 97, code: 'Equal' },
  { id: 'backspace', label: 'BACKSPACE', uWidth: 2.0, gridX: 13, ledIndex: 105, code: 'Backspace' },
];

const ROW_1: KeySpec[] = [
  { id: 'tab', label: 'TAB', uWidth: 1.5, gridX: 0, ledIndex: 2, code: 'Tab' },
  { id: 'q', label: 'Q', uWidth: 1.0, gridX: 1, ledIndex: 10, code: 'KeyQ' },
  { id: 'w', label: 'W', subLabel: '▲', uWidth: 1.0, gridX: 2, ledIndex: 18, code: 'KeyW' },
  { id: 'e', label: 'E', uWidth: 1.0, gridX: 3, ledIndex: 26, code: 'KeyE' },
  { id: 'r', label: 'R', uWidth: 1.0, gridX: 4, ledIndex: 34, code: 'KeyR' },
  { id: 't', label: 'T', uWidth: 1.0, gridX: 5, ledIndex: 42, code: 'KeyT' },
  { id: 'y', label: 'Y', uWidth: 1.0, gridX: 6, ledIndex: 50, code: 'KeyY' },
  { id: 'u', label: 'U', uWidth: 1.0, gridX: 7, ledIndex: 58, code: 'KeyU' },
  { id: 'i', label: 'I', subLabel: 'PRT', uWidth: 1.0, gridX: 8, ledIndex: 66, code: 'KeyI' },
  { id: 'o', label: 'O', subLabel: 'SCR', uWidth: 1.0, gridX: 9, ledIndex: 74, code: 'KeyO' },
  { id: 'p', label: 'P', subLabel: 'PAU', uWidth: 1.0, gridX: 10, ledIndex: 82, code: 'KeyP' },
  { id: 'bracket_l', label: '[', uWidth: 1.0, gridX: 11, ledIndex: 90, code: 'BracketLeft' },
  { id: 'bracket_r', label: ']', uWidth: 1.0, gridX: 12, ledIndex: 98, code: 'BracketRight' },
  { id: 'backslash', label: '\\', uWidth: 1.5, gridX: 13, ledIndex: 106, code: 'Backslash' },
];

const ROW_2: KeySpec[] = [
  { id: 'caps', label: 'CAPS', uWidth: 1.75, gridX: 0, ledIndex: 3, code: 'CapsLock' },
  { id: 'a', label: 'A', subLabel: '◄', uWidth: 1.0, gridX: 1, ledIndex: 11, code: 'KeyA' },
  { id: 's', label: 'S', subLabel: '▼', uWidth: 1.0, gridX: 2, ledIndex: 19, code: 'KeyS' },
  { id: 'd', label: 'D', subLabel: '►', uWidth: 1.0, gridX: 3, ledIndex: 27, code: 'KeyD' },
  { id: 'f', label: 'F', uWidth: 1.0, gridX: 4, ledIndex: 35, code: 'KeyF' },
  { id: 'g', label: 'G', uWidth: 1.0, gridX: 5, ledIndex: 43, code: 'KeyG' },
  { id: 'h', label: 'H', uWidth: 1.0, gridX: 6, ledIndex: 51, code: 'KeyH' },
  { id: 'j', label: 'J', subLabel: 'INS', uWidth: 1.0, gridX: 7, ledIndex: 59, code: 'KeyJ' },
  { id: 'k', label: 'K', subLabel: 'HOM', uWidth: 1.0, gridX: 8, ledIndex: 67, code: 'KeyK' },
  { id: 'l', label: 'L', subLabel: 'PGU', uWidth: 1.0, gridX: 9, ledIndex: 75, code: 'KeyL' },
  { id: 'semicolon', label: ';', uWidth: 1.0, gridX: 10, ledIndex: 83, code: 'Semicolon' },
  { id: 'quote', label: '\'', uWidth: 1.0, gridX: 11, ledIndex: 91, code: 'Quote' },
  { id: 'enter', label: 'ENTER', uWidth: 2.25, gridX: 13, ledIndex: 107, code: 'Enter' },
];

const ROW_3: KeySpec[] = [
  { id: 'shift_l', label: 'SHIFT', uWidth: 2.25, gridX: 0, ledIndex: 4, code: 'ShiftLeft' },
  { id: 'z', label: 'Z', uWidth: 1.0, gridX: 2, ledIndex: 20, code: 'KeyZ' },
  { id: 'x', label: 'X', uWidth: 1.0, gridX: 3, ledIndex: 28, code: 'KeyX' },
  { id: 'c', label: 'C', uWidth: 1.0, gridX: 4, ledIndex: 36, code: 'KeyC' },
  { id: 'v', label: 'V', uWidth: 1.0, gridX: 5, ledIndex: 44, code: 'KeyV' },
  { id: 'b', label: 'B', uWidth: 1.0, gridX: 6, ledIndex: 52, code: 'KeyB' },
  { id: 'n', label: 'N', subLabel: 'DEL', uWidth: 1.0, gridX: 7, ledIndex: 60, code: 'KeyN' },
  { id: 'm', label: 'M', subLabel: 'END', uWidth: 1.0, gridX: 8, ledIndex: 68, code: 'KeyM' },
  { id: 'comma', label: ',', subLabel: 'PGD', uWidth: 1.0, gridX: 9, ledIndex: 76, code: 'Comma' },
  { id: 'period', label: '.', uWidth: 1.0, gridX: 10, ledIndex: 84, code: 'Period' },
  { id: 'slash', label: '/', subLabel: '▲', uWidth: 1.0, gridX: 11, ledIndex: 92, code: 'Slash' },
  { id: 'shift_r', label: 'SHIFT', uWidth: 2.75, gridX: 13, ledIndex: 108, code: 'ShiftRight' },
];

const ROW_4: KeySpec[] = [
  { id: 'ctrl_l', label: 'CTRL', uWidth: 1.25, gridX: 0, ledIndex: 5, code: 'ControlLeft' },
  { id: 'win', label: 'WIN', uWidth: 1.25, gridX: 1, ledIndex: 13, code: 'MetaLeft' },
  { id: 'alt_l', label: 'ALT', uWidth: 1.25, gridX: 2, ledIndex: 21, code: 'AltLeft' },
  { id: 'space', label: '', uWidth: 6.25, gridX: 6, ledIndex: 45, code: 'Space' },
  { id: 'alt_r', label: 'ALT', subLabel: '◄', uWidth: 1.25, gridX: 10, ledIndex: 77, code: 'AltRight' },
  { id: 'fn', label: 'FN', subLabel: '▼', uWidth: 1.25, gridX: 11, ledIndex: 85, code: 'Fn' },
  { id: 'menu', label: 'MENU', subLabel: '►', uWidth: 1.25, gridX: 12, ledIndex: 93, code: 'ContextMenu' },
  { id: 'ctrl_r', label: 'CTRL', uWidth: 1.25, gridX: 13, ledIndex: 101, code: 'ControlRight' },
];

const ROWS_DEF: KeySpec[][] = [ROW_0, ROW_1, ROW_2, ROW_3, ROW_4];

export const TOTAL_U_WIDTH = 15.0;
export const TOTAL_U_HEIGHT = 5.0;

function buildK630Layout(): KeyDefinition[] {
  const result: KeyDefinition[] = [];

  ROWS_DEF.forEach((rowKeys, rowIndex) => {
    let currentX = 0;
    rowKeys.forEach((spec, colIndex) => {
      const centerX = currentX + spec.uWidth / 2;
      const centerY = rowIndex + 0.5;

      result.push({
        id: spec.id,
        label: spec.label,
        subLabel: spec.subLabel,
        row: rowIndex,
        col: colIndex,
        uWidth: spec.uWidth,
        x: currentX,
        y: rowIndex,
        normX: centerX / TOTAL_U_WIDTH,
        normY: centerY / TOTAL_U_HEIGHT,
        gridX: spec.gridX,
        gridY: rowIndex,
        ledIndex: spec.ledIndex,
        code: spec.code,
      });

      currentX += spec.uWidth;
    });
  });

  return result;
}

export const K630_LAYOUT: KeyDefinition[] = buildK630Layout();

export const KEY_BY_ID: Record<string, KeyDefinition> = Object.fromEntries(
  K630_LAYOUT.map((k) => [k.id, k])
);

export const KEY_BY_CODE: Record<string, KeyDefinition> = Object.fromEntries(
  K630_LAYOUT.map((k) => [k.code, k])
);

export const KEY_BY_LED_INDEX: Record<number, KeyDefinition> = Object.fromEntries(
  K630_LAYOUT.map((k) => [k.ledIndex, k])
);

export function getKeyCenter(key: KeyDefinition): { x: number; y: number } {
  return {
    x: key.x + key.uWidth / 2,
    y: key.y + 0.5,
  };
}

export function getKeyDistance(k1: KeyDefinition, k2: KeyDefinition): number {
  const c1 = getKeyCenter(k1);
  const c2 = getKeyCenter(k2);
  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildPhysicalAdjacency(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const k1 of K630_LAYOUT) {
    const neighbors: { id: string; dist: number }[] = [];
    for (const k2 of K630_LAYOUT) {
      if (k1.id === k2.id) continue;
      const d = getKeyDistance(k1, k2);

      // Also compute physical bounding-box edge distance for wide keycaps (e.g. 6.25u spacebar, shift, enter)
      const dxBox = Math.max(0, Math.max(k1.x - (k2.x + k2.uWidth), k2.x - (k1.x + k1.uWidth)));
      const dyBox = Math.abs(k1.row - k2.row);
      const dBox = Math.sqrt(dxBox * dxBox + dyBox * dyBox);

      // Key centers within 1.85 units OR bounding boxes touching within 1.15 units
      if (d <= 1.85 || dBox <= 1.15) {
        neighbors.push({ id: k2.id, dist: Math.min(d, dBox) });
      }
    }
    neighbors.sort((a, b) => a.dist - b.dist);
    result[k1.id] = neighbors.map((n) => n.id);
  }
  return result;
}

export const PHYSICAL_ADJACENCY: Record<string, string[]> = buildPhysicalAdjacency();
