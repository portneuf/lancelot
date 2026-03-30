import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useTranslation } from "./useTranslation-BwMUUKr-.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { useMemo } from "react";
import { Tags } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/features/inspection/classes.tsx
var numberFormatter = new Intl.NumberFormat();
/**
* Build a map from class number to the count of defects with that class.
*/ function buildDefectCountMap(defects) {
	const counts = /* @__PURE__ */ new Map();
	for (const defect of defects) if (defect.classNumber !== void 0) counts.set(defect.classNumber, (counts.get(defect.classNumber) ?? 0) + 1);
	return counts;
}
function ClassesPage() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const { t } = useTranslation();
	const file = activeFileId ? files.get(activeFileId) : void 0;
	const rows = useMemo(() => {
		if (!file) return [];
		const countMap = buildDefectCountMap(file.defects);
		return file.classLookup.map((entry) => ({
			entry,
			defectCount: countMap.get(entry.classNumber) ?? 0
		}));
	}, [file]);
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Tags,
			title: t("common.noData"),
			description: t("classes.openFileToView")
		})
	});
	const classCount = file.classLookup.length;
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "text-sm font-semibold",
				children: t("classes.classLookup")
			}), /* @__PURE__ */ jsxs("span", {
				className: "text-xs text-muted-foreground",
				children: [
					numberFormatter.format(classCount),
					" class",
					classCount !== 1 ? "es" : ""
				]
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "min-h-0 flex-1 overflow-auto",
			children: rows.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "flex h-full items-center justify-center",
				children: /* @__PURE__ */ jsx(EmptyState, {
					icon: Tags,
					title: t("classes.noClasses"),
					description: t("classes.noClassesDescription")
				})
			}) : /* @__PURE__ */ jsxs("table", {
				className: "w-full border-collapse text-xs",
				children: [/* @__PURE__ */ jsx("thead", {
					className: "sticky top-0 z-10 bg-muted/95 backdrop-blur-sm",
					children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", {
							className: "whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground",
							children: t("classes.classNumber")
						}),
						/* @__PURE__ */ jsx("th", {
							className: "whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground",
							children: t("classes.className")
						}),
						/* @__PURE__ */ jsx("th", {
							className: "whitespace-nowrap border-b border-border px-4 py-2 text-left font-semibold text-muted-foreground",
							children: t("classes.classCode")
						}),
						/* @__PURE__ */ jsx("th", {
							className: "whitespace-nowrap border-b border-border px-4 py-2 text-right font-semibold text-muted-foreground",
							children: t("classes.defectCount")
						})
					] })
				}), /* @__PURE__ */ jsx("tbody", { children: rows.map((row, idx) => /* @__PURE__ */ jsxs("tr", {
					className: cn("transition-colors hover:bg-accent/50", idx % 2 === 0 ? "bg-background" : "bg-muted/30"),
					children: [
						/* @__PURE__ */ jsx("td", {
							className: "whitespace-nowrap border-b border-border/50 px-4 py-2 tabular-nums",
							children: row.entry.classNumber
						}),
						/* @__PURE__ */ jsx("td", {
							className: "whitespace-nowrap border-b border-border/50 px-4 py-2",
							children: row.entry.className
						}),
						/* @__PURE__ */ jsx("td", {
							className: "whitespace-nowrap border-b border-border/50 px-4 py-2 text-muted-foreground",
							children: row.entry.classCode ?? "—"
						}),
						/* @__PURE__ */ jsx("td", {
							className: "whitespace-nowrap border-b border-border/50 px-4 py-2 text-right tabular-nums",
							children: numberFormatter.format(row.defectCount)
						})
					]
				}, row.entry.classNumber)) })]
			})
		})]
	});
}
//#endregion
export { ClassesPage as default };

//# sourceMappingURL=classes-BcIQuaKI.js.map