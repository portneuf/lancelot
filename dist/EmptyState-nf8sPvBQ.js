import { t as cn } from "./cn-Dhwb6-BZ.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/shared/EmptyState.tsx
function EmptyState({ icon: Icon, title, description, className, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cn("flex flex-col items-center justify-center gap-4 p-8 text-center", className),
		children: [
			/* @__PURE__ */ jsx(Icon, { className: "h-12 w-12 text-muted-foreground/50" }),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col gap-1",
				children: [/* @__PURE__ */ jsx("h3", {
					className: "text-lg font-semibold text-foreground",
					children: title
				}), description && /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted-foreground",
					children: description
				})]
			}),
			children
		]
	});
}
//#endregion
export { EmptyState as t };

//# sourceMappingURL=EmptyState-nf8sPvBQ.js.map