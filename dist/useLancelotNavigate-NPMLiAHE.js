import { r as getStandaloneNavigateHook, t as getIsPortalMode } from "./mode-flag-DcZ3AbRu.js";
import { useCallback, useContext } from "react";
import { ToolContext } from "@portneuf/portal-framework";
//#region src/hooks/useLancelotNavigate.ts
/**
* Dual-mode navigation hook.
*
* In standalone mode: delegates to a registered React Router hook
*   (injected by standalone-entry.tsx to avoid pulling react-router
*   into the library build).
* In portal mode: uses the framework's navigateToView() from ToolContext.
*
* The mode is determined by getIsPortalMode(), set once before React renders.
*/ function usePortalNavigate() {
	const toolCtx = useContext(ToolContext);
	return useCallback((viewKey) => {
		toolCtx?.navigateToView(viewKey);
	}, [toolCtx]);
}
function useLancelotNavigate() {
	if (getIsPortalMode()) return usePortalNavigate();
	const hook = getStandaloneNavigateHook();
	if (!hook) throw new Error("Navigation not initialized. In standalone mode, registerStandaloneNavigateHook() must be called before React renders.");
	return hook();
}
//#endregion
export { useLancelotNavigate as t };

//# sourceMappingURL=useLancelotNavigate-NPMLiAHE.js.map