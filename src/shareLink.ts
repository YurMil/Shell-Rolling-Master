import { useShellStore } from './store/useShellStore';
import type { ShapeType, SpecType } from './features/calculator/types';

/**
 * Share-link protocol (cadautoscript.com issue #113).
 *
 * When embedded in the utility shell, the app announces support, streams its
 * input parameters (debounced), and restores state from a shared `?calc=` URL
 * forwarded by the shell. See dev-plans/utility-share-protocol.md in the main
 * site repo for the contract. Only inputs are serialized — results are always
 * recomputed after restore.
 */

const MESSAGE_SUPPORT = 'cas:share-support';
const MESSAGE_RESTORE = 'cas:restore-state';
const MESSAGE_UPDATE = 'cas:state-update';
const SCHEMA_VERSION = 1;
const UPDATE_DEBOUNCE_MS = 300;

type SharedParams = {
  mode: ShapeType;
  specType: SpecType;
  d1: number;
  d2: number;
  h: number;
  thickness: number;
  kFactor: number;
  gap: number;
  bendLinesEnabled: boolean;
  bendLinesCount: number;
};

function collectParams(): SharedParams {
  const s = useShellStore.getState();
  return {
    mode: s.mode,
    specType: s.specType,
    d1: s.d1,
    d2: s.d2,
    h: s.h,
    thickness: s.thickness,
    kFactor: s.kFactor,
    gap: s.gap,
    bendLinesEnabled: s.bendLinesEnabled,
    bendLinesCount: s.bendLinesCount,
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Applies a restored state through the store's sanitizing setters, so every
 * value passes the same clamping as manual input. Unknown keys and invalid
 * values are ignored — a hand-edited link degrades to defaults per field.
 */
function applySharedState(state: unknown): void {
  if (!state || typeof state !== 'object') return;
  const raw = state as Record<string, unknown>;
  const store = useShellStore.getState();

  if (raw.mode === 'cylinder' || raw.mode === 'cone') store.setMode(raw.mode);
  if (raw.specType === 'OD' || raw.specType === 'ID') store.setSpecType(raw.specType);

  const d1 = finiteNumber(raw.d1);
  if (d1 !== undefined) store.setD1(d1);
  const d2 = finiteNumber(raw.d2);
  if (d2 !== undefined) store.setD2(d2);
  const h = finiteNumber(raw.h);
  if (h !== undefined) store.setHeight(h);
  const thickness = finiteNumber(raw.thickness);
  if (thickness !== undefined) store.setThickness(thickness);
  const kFactor = finiteNumber(raw.kFactor);
  if (kFactor !== undefined) store.setKFactor(kFactor);
  const gap = finiteNumber(raw.gap);
  if (gap !== undefined) store.setGap(gap);
  if (typeof raw.bendLinesEnabled === 'boolean') store.setBendLinesEnabled(raw.bendLinesEnabled);
  const bendLinesCount = finiteNumber(raw.bendLinesCount);
  if (bendLinesCount !== undefined) store.setBendLinesCount(bendLinesCount);
}

let initialized = false;

export function initShareLink(): void {
  if (initialized || typeof window === 'undefined' || window.parent === window) return;
  initialized = true;

  const origin = window.location.origin;

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== origin) return;
    const data: unknown = event.data;
    if (!data || typeof data !== 'object') return;
    const message = data as { type?: unknown; version?: unknown; state?: unknown };
    if (message.type === MESSAGE_RESTORE && message.version === SCHEMA_VERSION) {
      applySharedState(message.state);
    }
  });

  let timer: number | undefined;
  useShellStore.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      window.parent.postMessage({ type: MESSAGE_UPDATE, state: collectParams() }, origin);
    }, UPDATE_DEBOUNCE_MS);
  });

  window.parent.postMessage({ type: MESSAGE_SUPPORT }, origin);
}
