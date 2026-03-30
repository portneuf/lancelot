//#region src/i18n/mode-flag.ts
/**
* Module-level flag for portal vs standalone mode.
*
* Set once before React renders (in entry points).
* Used by hooks that need to branch without violating rules-of-hooks.
*/ var _portalMode = false;
function setPortalMode(value) {
	_portalMode = value;
}
function getIsPortalMode() {
	return _portalMode;
}
//#endregion
export { setPortalMode as n, getIsPortalMode as t };

//# sourceMappingURL=mode-flag-BCQ2AIxi.js.map