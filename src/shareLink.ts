import { useShellStore } from './store/useShellStore';
import {
  SEAM_POSITIONS,
  SHAPE_TYPES,
  SPEC_TYPES,
  type ShellParameters,
} from './features/calculator/types';

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
/**
 * Versions of the payload this build can restore. The shell stamps the version
 * into the link, so older links have to keep working: new parameters are always
 * added as optional and fall back to the defaults when absent.
 */
const SUPPORTED_SCHEMA_VERSIONS = [1, 2];
const UPDATE_DEBOUNCE_MS = 300;

/** Every input parameter is shared — the payload is exactly ShellParameters. */
export type SharedParams = ShellParameters;

type ShellStore = ReturnType<typeof useShellStore.getState>;
type ParamApplier = (value: unknown, store: ShellStore) => void;

const numeric = (apply: (store: ShellStore, value: number) => void): ParamApplier =>
  (value, store) => {
    if (typeof value === 'number' && Number.isFinite(value)) apply(store, value);
  };

const flag = (apply: (store: ShellStore, value: boolean) => void): ParamApplier =>
  (value, store) => {
    if (typeof value === 'boolean') apply(store, value);
  };

const oneOf = <T extends string>(
  allowed: readonly T[],
  apply: (store: ShellStore, value: T) => void,
): ParamApplier =>
  (value, store) => {
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
      apply(store, value as T);
    }
  };

/**
 * How each shared parameter is validated and written back.
 *
 * Keying this by `keyof ShellParameters` is what keeps the protocol honest: a
 * new input parameter fails to compile until it is wired in here, and the
 * allowed values come from the same tuples the unions are built from. Both are
 * deliberate — the eccentric cone mode was initially unreachable from a shared
 * link because a hand-written allow-list still only listed cylinder and cone.
 *
 * Insertion order is the apply order, and `mode` has to come first: the store
 * recalculates on every setter, and the remaining values are only meaningful
 * once the shape is known.
 */
const PARAM_APPLIERS: Record<keyof ShellParameters, ParamApplier> = {
  mode: oneOf(SHAPE_TYPES, (store, value) => store.setMode(value)),
  specType: oneOf(SPEC_TYPES, (store, value) => store.setSpecType(value)),
  d1: numeric((store, value) => store.setD1(value)),
  d2: numeric((store, value) => store.setD2(value)),
  h: numeric((store, value) => store.setHeight(value)),
  thickness: numeric((store, value) => store.setThickness(value)),
  kFactor: numeric((store, value) => store.setKFactor(value)),
  gap: numeric((store, value) => store.setGap(value)),
  bendLinesEnabled: flag((store, value) => store.setBendLinesEnabled(value)),
  bendLinesCount: numeric((store, value) => store.setBendLinesCount(value)),
  eccentricity: numeric((store, value) => store.setEccentricity(value)),
  seamPosition: oneOf(SEAM_POSITIONS, (store, value) => store.setSeamPosition(value)),
  seamAngleDeg: numeric((store, value) => store.setSeamAngle(value)),
  stationCount: numeric((store, value) => store.setStationCount(value)),
  density: numeric((store, value) => store.setDensity(value)),
  bendDimensionsEnabled: flag((store, value) => store.setBendDimensionsEnabled(value)),
  bendDimensionOffset: numeric((store, value) => store.setBendDimensionOffset(value)),
};

const PARAM_KEYS = Object.keys(PARAM_APPLIERS) as Array<keyof ShellParameters>;

export function collectParams(): SharedParams {
  const state = useShellStore.getState();
  const params = {} as Record<string, unknown>;

  for (const key of PARAM_KEYS) {
    params[key] = state[key];
  }

  // Safe by construction: PARAM_KEYS is exactly `keyof ShellParameters`.
  return params as unknown as SharedParams;
}

/**
 * Applies a restored state through the store's sanitizing setters, so every
 * value passes the same clamping as manual input. Unknown keys, missing keys
 * and invalid values are ignored — a hand-edited or older link degrades to the
 * defaults per field instead of failing as a whole.
 *
 * Exported for testing; the runtime entry point is {@link initShareLink}.
 */
export function applySharedState(state: unknown): void {
  if (!state || typeof state !== 'object') return;

  const raw = state as Record<string, unknown>;
  const store = useShellStore.getState();

  for (const key of PARAM_KEYS) {
    if (!(key in raw)) continue;
    PARAM_APPLIERS[key](raw[key], store);
  }
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
    if (
      message.type === MESSAGE_RESTORE &&
      typeof message.version === 'number' &&
      SUPPORTED_SCHEMA_VERSIONS.includes(message.version)
    ) {
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
