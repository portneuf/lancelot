/**
 * Module-level flag for portal vs standalone mode.
 *
 * Set once before React renders (in entry points).
 * Used by hooks that need to branch without violating rules-of-hooks.
 */
export declare function setPortalMode(value: boolean): void;
export declare function getIsPortalMode(): boolean;
