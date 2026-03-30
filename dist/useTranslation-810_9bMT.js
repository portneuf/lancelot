import { t as getIsPortalMode } from "./mode-flag-BCQ2AIxi.js";
import { useMemo } from "react";
import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react";
import { useTranslation } from "@portneuf/i18n";
//#region src/i18n/useTranslation.ts
/**
* Dual-mode translation hook.
*
* In standalone mode: delegates to LinguiJS (useLingui).
* In portal mode: delegates to @portneuf/i18n, prefixing keys with 'lancelot.'.
*
* The mode is determined by a module-level flag set once before React renders,
* so the same branch always executes — no rules-of-hooks violation.
*/ function useStandaloneTranslation() {
	const { i18n: _i18n } = useLingui();
	return {
		t: useMemo(() => {
			return (key) => {
				const msg = i18n.messages[key];
				if (typeof msg === "string") return msg;
				return key;
			};
		}, [_i18n.locale]),
		locale: _i18n.locale
	};
}
function usePortalTranslation() {
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
	return useStandaloneTranslation();
}
//#endregion
export { useTranslation$1 as t };

//# sourceMappingURL=useTranslation-810_9bMT.js.map