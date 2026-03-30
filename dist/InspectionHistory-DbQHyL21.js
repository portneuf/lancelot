import { t as cn } from "./cn-Dhwb6-BZ.js";
import { n as deleteInspection, r as getInspectionHistory, t as clearHistory } from "./inspection-db-Kp142-VM.js";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, History, Trash2 } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/features/file-manager/components/InspectionHistory.tsx
/**
* Inspection history panel that displays previously opened files
* stored in IndexedDB.
*
* Renders a table sorted by most-recently-opened first, with per-row
* delete and a bulk "Clear History" action.
*/ function formatDate(iso) {
	try {
		return new Date(iso).toLocaleDateString(void 0, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	} catch {
		return iso;
	}
}
function InspectionHistory() {
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const loadHistory = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			setEntries(await getInspectionHistory());
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load history");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		loadHistory();
	}, [loadHistory]);
	const handleDelete = useCallback(async (id) => {
		try {
			await deleteInspection(id);
			setEntries((prev) => prev.filter((e) => e.id !== id));
		} catch (err) {
			console.error("Failed to delete inspection entry", err);
		}
	}, []);
	const handleClear = useCallback(async () => {
		try {
			await clearHistory();
			setEntries([]);
		} catch (err) {
			console.error("Failed to clear history", err);
		}
	}, []);
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "flex items-center justify-center py-6 text-sm text-muted-foreground",
		children: "Loading history..."
	});
	if (error) return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-2 py-6 text-sm text-destructive",
		children: [/* @__PURE__ */ jsx(AlertCircle, { className: "h-4 w-4 shrink-0" }), /* @__PURE__ */ jsx("span", { children: error })]
	});
	if (entries.length === 0) return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground",
		children: [
			/* @__PURE__ */ jsx(History, { className: "h-8 w-8 opacity-40" }),
			/* @__PURE__ */ jsx("p", { children: "No inspection history yet." }),
			/* @__PURE__ */ jsx("p", {
				className: "text-xs",
				children: "Files you open will appear here."
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "w-full max-w-2xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "mb-2 flex items-center justify-between",
				children: [/* @__PURE__ */ jsxs("h3", {
					className: "flex items-center gap-2 text-sm font-semibold text-foreground",
					children: [/* @__PURE__ */ jsx(History, { className: "h-4 w-4" }), "Recent Inspections"]
				}), /* @__PURE__ */ jsx("button", {
					onClick: handleClear,
					className: "rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
					children: "Clear History"
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "overflow-hidden rounded-lg border border-border",
				children: /* @__PURE__ */ jsxs("table", {
					className: "w-full text-left text-xs",
					children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
						className: "border-b border-border bg-muted/50",
						children: [
							/* @__PURE__ */ jsx("th", {
								className: "px-3 py-2 font-medium text-muted-foreground",
								children: "File Name"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "px-3 py-2 font-medium text-muted-foreground",
								children: "Lot"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "px-3 py-2 font-medium text-muted-foreground",
								children: "Wafer"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "px-3 py-2 text-right font-medium text-muted-foreground",
								children: "Defects"
							}),
							/* @__PURE__ */ jsx("th", {
								className: "px-3 py-2 font-medium text-muted-foreground",
								children: "Opened At"
							}),
							/* @__PURE__ */ jsx("th", { className: "w-10 px-2 py-2" })
						]
					}) }), /* @__PURE__ */ jsx("tbody", { children: entries.map((entry) => /* @__PURE__ */ jsxs("tr", {
						className: cn("border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"),
						children: [
							/* @__PURE__ */ jsx("td", {
								className: "max-w-[180px] truncate px-3 py-2 font-medium",
								title: entry.fileName,
								children: entry.fileName
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-3 py-2 text-muted-foreground",
								children: entry.lotId || "-"
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-3 py-2 text-muted-foreground",
								children: entry.waferId || "-"
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-3 py-2 text-right tabular-nums",
								children: entry.defectCount.toLocaleString()
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-3 py-2 text-muted-foreground",
								children: formatDate(entry.openedAt)
							}),
							/* @__PURE__ */ jsx("td", {
								className: "px-2 py-2",
								children: /* @__PURE__ */ jsx("button", {
									onClick: () => handleDelete(entry.id),
									className: "rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
									"aria-label": `Delete ${entry.fileName} from history`,
									children: /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" })
								})
							})
						]
					}, entry.id)) })]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-1.5 text-right text-xs text-muted-foreground",
				children: [
					entries.length,
					" ",
					entries.length === 1 ? "entry" : "entries"
				]
			})
		]
	});
}
//#endregion
export { InspectionHistory as default };

//# sourceMappingURL=InspectionHistory-DbQHyL21.js.map