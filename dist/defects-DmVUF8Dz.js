import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useInspectionStore } from "./inspection-store-B-pANMzv.js";
import { n as readField, t as useFilteredDefects } from "./useFilteredDefects-TnH5LHGk.js";
import { t as useTranslation } from "./useTranslation-B1_W7B7C.js";
import { t as EmptyState } from "./EmptyState-nf8sPvBQ.js";
import { useCallback, useMemo, useRef, useState } from "react";
import { Bug, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useVirtualizer } from "@tanstack/react-virtual";
//#region src/features/inspection/components/DefectTable.tsx
var ROW_HEIGHT = 32;
/**
* Core columns that are always displayed first, in this order.
* The `key` must match the DefectRecord property name exactly.
*/ var CORE_COLUMNS = [
	{
		key: "defectId",
		label: "DefectID",
		type: "int32"
	},
	{
		key: "xRel",
		label: "XRel",
		type: "float",
		unit: "um"
	},
	{
		key: "yRel",
		label: "YRel",
		type: "float",
		unit: "um"
	},
	{
		key: "xIndex",
		label: "XIndex",
		type: "int32"
	},
	{
		key: "yIndex",
		label: "YIndex",
		type: "int32"
	},
	{
		key: "size",
		label: "Size",
		type: "float",
		unit: "um"
	},
	{
		key: "classNumber",
		label: "Class",
		type: "int32"
	}
];
/** Set of core keys for fast membership tests. */ var CORE_KEY_SET = new Set(CORE_COLUMNS.map((c) => c.key));
var numberFormatter$1 = new Intl.NumberFormat(void 0, { maximumFractionDigits: 3 });
function formatValue(value, type) {
	if (value === void 0 || value === null) return "—";
	if (typeof value === "string") return value;
	if (type === "int32" || type === "float") return numberFormatter$1.format(value);
	return String(value);
}
function buildClassMap(classLookup) {
	const map = /* @__PURE__ */ new Map();
	for (const entry of classLookup) map.set(entry.classNumber, entry.className);
	return map;
}
function compareValues(a, b) {
	if (a === void 0 && b === void 0) return 0;
	if (a === void 0) return 1;
	if (b === void 0) return -1;
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b));
}
function SortIcon({ direction }) {
	if (direction === "asc") return /* @__PURE__ */ jsx("svg", {
		className: "ml-1 inline-block h-3 w-3",
		viewBox: "0 0 12 12",
		fill: "currentColor",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx("path", { d: "M6 2L10 8H2L6 2Z" })
	});
	if (direction === "desc") return /* @__PURE__ */ jsx("svg", {
		className: "ml-1 inline-block h-3 w-3",
		viewBox: "0 0 12 12",
		fill: "currentColor",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx("path", { d: "M6 10L2 4H10L6 10Z" })
	});
	return null;
}
function DefectTooltip({ defect, classMap, columns }) {
	return /* @__PURE__ */ jsx("div", {
		className: "pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg",
		children: /* @__PURE__ */ jsx("table", {
			className: "border-separate border-spacing-x-2 border-spacing-y-0.5",
			children: /* @__PURE__ */ jsx("tbody", { children: columns.map((col) => {
				let display;
				if (col.key === "classNumber") {
					const raw = defect.classNumber;
					const name = raw !== void 0 ? classMap.get(raw) : void 0;
					display = name !== void 0 && raw !== void 0 ? `${name} (${raw})` : formatValue(raw, col.type);
				} else display = formatValue(readField(defect, col.key), col.type);
				return /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsxs("td", {
					className: "pr-2 font-semibold text-muted-foreground whitespace-nowrap",
					children: [col.label, col.unit ? ` (${col.unit})` : ""]
				}), /* @__PURE__ */ jsx("td", {
					className: "whitespace-nowrap",
					children: display
				})] }, col.key);
			}) })
		})
	});
}
function DefectTable({ defects, defectSchema, classLookup }) {
	const parentRef = useRef(null);
	const selectedDefectIds = useInspectionStore((s) => s.selectedDefectIds);
	const selectDefects = useInspectionStore((s) => s.selectDefects);
	const [hoveredRowIndex, setHoveredRowIndex] = useState(null);
	const [sort, setSort] = useState({
		column: "",
		direction: null
	});
	const classMap = useMemo(() => buildClassMap(classLookup), [classLookup]);
	const columns = useMemo(() => {
		const extra = [];
		for (const col of defectSchema) {
			if (CORE_KEY_SET.has(col.name)) continue;
			extra.push({
				key: col.name,
				label: col.name,
				type: col.type,
				unit: col.unit
			});
		}
		return [...CORE_COLUMNS, ...extra];
	}, [defectSchema]);
	const sortedDefects = useMemo(() => {
		if (!sort.direction || !sort.column) return defects;
		const col = sort.column;
		const dir = sort.direction === "asc" ? 1 : -1;
		return [...defects].sort((a, b) => {
			return dir * compareValues(readField(a, col), readField(b, col));
		});
	}, [defects, sort]);
	const virtualizer = useVirtualizer({
		count: sortedDefects.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 20
	});
	const handleHeaderClick = useCallback((columnKey) => {
		setSort((prev) => {
			if (prev.column !== columnKey) return {
				column: columnKey,
				direction: "asc"
			};
			if (prev.direction === "asc") return {
				column: columnKey,
				direction: "desc"
			};
			if (prev.direction === "desc") return {
				column: "",
				direction: null
			};
			return {
				column: columnKey,
				direction: "asc"
			};
		});
	}, []);
	const handleRowClick = useCallback((defectId, event) => {
		if (event.ctrlKey || event.metaKey) {
			const current = new Set(selectedDefectIds);
			if (current.has(defectId)) current.delete(defectId);
			else current.add(defectId);
			selectDefects([...current]);
		} else selectDefects([defectId]);
	}, [selectedDefectIds, selectDefects]);
	const getCellDisplay = useCallback((defect, col) => {
		if (col.key === "classNumber") {
			const raw = defect.classNumber;
			return (raw !== void 0 ? classMap.get(raw) : void 0) ?? formatValue(raw, col.type);
		}
		return formatValue(readField(defect, col.key), col.type);
	}, [classMap]);
	return /* @__PURE__ */ jsxs("div", {
		ref: parentRef,
		className: "relative h-full overflow-auto",
		children: [/* @__PURE__ */ jsx("div", {
			className: "sticky top-0 z-10 flex bg-muted/95 backdrop-blur-sm border-b border-border",
			children: columns.map((col) => /* @__PURE__ */ jsxs("div", {
				role: "columnheader",
				className: "flex-shrink-0 cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground",
				style: { minWidth: 90 },
				onClick: () => handleHeaderClick(col.key),
				children: [
					col.label,
					col.unit ? /* @__PURE__ */ jsxs("span", {
						className: "ml-0.5 font-normal text-muted-foreground/70",
						children: [
							"(",
							col.unit,
							")"
						]
					}) : null,
					/* @__PURE__ */ jsx(SortIcon, { direction: sort.column === col.key ? sort.direction : null })
				]
			}, col.key))
		}), /* @__PURE__ */ jsx("div", {
			className: "relative w-full",
			style: { height: `${virtualizer.getTotalSize()}px` },
			children: virtualizer.getVirtualItems().map((virtualRow) => {
				const defect = sortedDefects[virtualRow.index];
				const isSelected = selectedDefectIds.has(defect.defectId);
				const isEven = virtualRow.index % 2 === 0;
				const isHovered = hoveredRowIndex === virtualRow.index;
				return /* @__PURE__ */ jsxs("div", {
					role: "row",
					className: cn("absolute left-0 flex w-full cursor-pointer items-center transition-colors", isEven ? "bg-background" : "bg-muted/30", isSelected && "bg-primary/15 hover:bg-primary/20", !isSelected && "hover:bg-accent/50"),
					style: {
						height: `${virtualRow.size}px`,
						transform: `translateY(${virtualRow.start}px)`
					},
					onClick: (e) => handleRowClick(defect.defectId, e),
					onMouseEnter: () => setHoveredRowIndex(virtualRow.index),
					onMouseLeave: () => setHoveredRowIndex(null),
					children: [columns.map((col) => /* @__PURE__ */ jsx("div", {
						role: "cell",
						className: "flex-shrink-0 truncate whitespace-nowrap px-3 text-xs",
						style: { minWidth: 90 },
						children: getCellDisplay(defect, col)
					}, col.key)), isHovered && /* @__PURE__ */ jsx("div", {
						className: "relative",
						children: /* @__PURE__ */ jsx(DefectTooltip, {
							defect,
							classMap,
							columns
						})
					})]
				}, defect.defectId);
			})
		})]
	});
}
//#endregion
//#region src/features/inspection/components/DefectDetailPanel.tsx
var numFmt = new Intl.NumberFormat(void 0, { maximumFractionDigits: 3 });
function DefectDetailPanel({ defects, classLookup }) {
	const highlightedId = useInspectionStore((s) => s.highlightedDefectId);
	const highlightDefect = useInspectionStore((s) => s.highlightDefect);
	const classMap = useMemo(() => new Map(classLookup.map((c) => [c.classNumber, c.className])), [classLookup]);
	const currentIndex = useMemo(() => defects.findIndex((d) => d.defectId === highlightedId), [defects, highlightedId]);
	const defect = currentIndex >= 0 ? defects[currentIndex] : null;
	const handlePrev = useCallback(() => {
		if (currentIndex > 0) highlightDefect(defects[currentIndex - 1].defectId);
	}, [
		currentIndex,
		defects,
		highlightDefect
	]);
	const handleNext = useCallback(() => {
		if (currentIndex < defects.length - 1) highlightDefect(defects[currentIndex + 1].defectId);
	}, [
		currentIndex,
		defects,
		highlightDefect
	]);
	const handleClose = useCallback(() => highlightDefect(null), [highlightDefect]);
	if (!defect) return null;
	const coreRows = [
		["Defect ID", String(defect.defectId)],
		["X Rel", numFmt.format(defect.xRel) + " um"],
		["Y Rel", numFmt.format(defect.yRel) + " um"],
		["X Index", String(defect.xIndex)],
		["Y Index", String(defect.yIndex)],
		["Size", defect.size != null ? numFmt.format(defect.size) + " um" : "-"],
		["Class", defect.classNumber != null ? `${classMap.get(defect.classNumber) ?? defect.classNumber} (#${defect.classNumber})` : "-"],
		["X Abs", numFmt.format(defect.xAbs) + " um"],
		["Y Abs", numFmt.format(defect.yAbs) + " um"]
	];
	const extraRows = Object.entries(defect.extra).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [k, typeof v === "number" ? numFmt.format(v) : String(v)]);
	return /* @__PURE__ */ jsxs("div", {
		className: "flex w-80 shrink-0 flex-col border-l border-border bg-card",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border px-3 py-2",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "text-sm font-semibold",
					children: ["Defect #", defect.defectId]
				}), /* @__PURE__ */ jsx("button", {
					onClick: handleClose,
					className: "rounded p-1 hover:bg-muted",
					"aria-label": "Close",
					children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border px-3 py-1.5",
				children: [
					/* @__PURE__ */ jsx("button", {
						onClick: handlePrev,
						disabled: currentIndex <= 0,
						className: cn("rounded p-1", currentIndex > 0 ? "hover:bg-muted" : "opacity-30"),
						"aria-label": "Previous defect",
						children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted-foreground",
						children: [
							currentIndex + 1,
							" of ",
							defects.length
						]
					}),
					/* @__PURE__ */ jsx("button", {
						onClick: handleNext,
						disabled: currentIndex >= defects.length - 1,
						className: cn("rounded p-1", currentIndex < defects.length - 1 ? "hover:bg-muted" : "opacity-30"),
						"aria-label": "Next defect",
						children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "flex-1 overflow-y-auto p-3",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1.5",
					children: [coreRows.map(([label, value]) => /* @__PURE__ */ jsxs("div", {
						className: "flex items-baseline justify-between text-xs",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: label
						}), /* @__PURE__ */ jsx("span", {
							className: "tabular-nums",
							children: value
						})]
					}, label)), extraRows.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("div", { className: "my-1 h-px bg-border" }),
						/* @__PURE__ */ jsx("span", {
							className: "text-xs font-medium text-muted-foreground",
							children: "Extra Fields"
						}),
						extraRows.map(([label, value]) => /* @__PURE__ */ jsxs("div", {
							className: "flex items-baseline justify-between text-xs",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-muted-foreground",
								children: label
							}), /* @__PURE__ */ jsx("span", {
								className: "tabular-nums",
								children: value
							})]
						}, label))
					] })]
				})
			})
		]
	});
}
//#endregion
//#region src/features/inspection/defects.tsx
var numberFormatter = new Intl.NumberFormat();
function DefectsPage() {
	const { file, filteredDefects, totalCount, filteredCount } = useFilteredDefects();
	const highlightedDefectId = useInspectionStore((s) => s.highlightedDefectId);
	const { t } = useTranslation();
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: Bug,
			title: t("common.noData"),
			description: t("defects.openFileToView")
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex min-w-0 flex-1 flex-col",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "text-sm font-semibold",
					children: t("defects.defectTable")
				}), /* @__PURE__ */ jsxs("span", {
					className: "text-xs text-muted-foreground",
					children: [
						numberFormatter.format(filteredCount),
						" defect",
						filteredCount !== 1 ? "s" : "",
						filteredCount !== totalCount && ` (of ${numberFormatter.format(totalCount)})`
					]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "min-h-0 flex-1",
				children: /* @__PURE__ */ jsx(DefectTable, {
					defects: filteredDefects,
					defectSchema: file.defectSchema,
					classLookup: file.classLookup
				})
			})]
		}), highlightedDefectId !== null && /* @__PURE__ */ jsx(DefectDetailPanel, {
			defects: filteredDefects,
			defectSchema: file.defectSchema,
			classLookup: file.classLookup
		})]
	});
}
//#endregion
export { DefectsPage as default };

//# sourceMappingURL=defects-DmVUF8Dz.js.map