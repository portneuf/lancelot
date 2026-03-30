import { n as getStandaloneHook, t as getIsPortalMode } from "./mode-flag-BYqcGXIB.js";
import { useMemo } from "react";
import { useTranslation } from "@portneuf/i18n";
//#region src/i18n/useTranslation.ts
/**
* Dual-mode translation hook.
*
* In standalone mode: delegates to a registered LinguiJS hook (injected by standalone-entry).
* In portal mode: delegates to @portneuf/i18n, prefixing keys with 'lancelot.'.
*
* The mode is determined by a module-level flag set once before React renders,
* so the same branch always executes — no rules-of-hooks violation.
*
* @lingui/core and @lingui/react are NOT imported here — they live in
* useStandaloneTranslation.ts, which is only referenced from standalone-entry.tsx.
* This ensures the library build (portal) never pulls in LinguiJS.
*/ function usePortalTranslation() {
	const { t: portalT, locale } = useTranslation();
	return {
		t: useMemo(() => {
			return (key) => portalT(`lancelot.${key}`);
		}, [portalT]),
		locale
	};
}
function useTranslation$1() {
	if (getIsPortalMode()) return usePortalTranslation();
	const hook = getStandaloneHook();
	if (!hook) throw new Error("Translation not initialized. In standalone mode, registerStandaloneHook() must be called before React renders.");
	return hook();
}
//#endregion
export { useTranslation$1 as t };

//# sourceMappingURL=useTranslation-BwMUUKr-.js.map