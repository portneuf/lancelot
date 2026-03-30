/**
 * Module-level flag for portal vs standalone mode.
 *
 * Set once before React renders (in entry points).
 * Used by hooks that need to branch without violating rules-of-hooks.
 */

let _portalMode = false;

export function setPortalMode(value: boolean): void {
  _portalMode = value;
}

export function getIsPortalMode(): boolean {
  return _portalMode;
}
