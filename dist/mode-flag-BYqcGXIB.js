//#region src/i18n/mode-flag.ts
/**
* Module-level flag for portal vs standalone mode.
*
* Set once before React renders (in entry points).
* Used by hooks that need to branch without violating rules-of-hooks.
*/ var _portalMode = false;
var _standaloneHook = null;
function setPortalMode(value) {
	_portalMode = value;
}
function getIsPortalMode() {
	return _portalMode;
}
function getStandaloneHook() {
	return _standaloneHook;
}
//#endregion
export { getStandaloneHook as n, setPortalMode as r, getIsPortalMode as t };

//# sourceMappingURL=mode-flag-BYqcGXIB.js.map