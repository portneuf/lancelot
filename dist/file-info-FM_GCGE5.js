import { t as cn } from "./cn-Dhwb6-BZ.js";
import { t as useFileStore } from "./file-store-i2y1zWrt.js";
import { t as useTranslation } from "./useTranslation-810_9bMT.js";
import { t as EmptyState } from "./EmptyState-ELtzSX51.js";
import { AlertTriangle, FileText } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/features/file-manager/file-info.tsx
function FileInfoPage() {
	const activeFileId = useFileStore((s) => s.activeFileId);
	const files = useFileStore((s) => s.files);
	const file = activeFileId ? files.get(activeFileId) : null;
	const { t } = useTranslation();
	if (!file) return /* @__PURE__ */ jsx("div", {
		className: "flex h-full items-center justify-center",
		children: /* @__PURE__ */ jsx(EmptyState, {
			icon: FileText,
			title: t("fileInfo.noFileLoaded"),
			description: t("fileInfo.openFileToSeeDetails")
		})
	});
	const warnings = file.source.warnings;
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-3xl p-6",
		children: [/* @__PURE__ */ jsx("h1", {
			className: "mb-6 text-2xl font-bold",
			children: t("fileInfo.title")
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex flex-col gap-6",
			children: [
				/* @__PURE__ */ jsxs(Section, {
					title: t("fileInfo.source"),
					children: [
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.fileName"),
							value: file.source.fileName
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.format"),
							value: `${file.source.formatId.toUpperCase()} v${file.source.formatVersion}`
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.fileSize"),
							value: formatBytes(file.source.fileSize)
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.parsedAt"),
							value: new Date(file.source.parseTimestamp).toLocaleString()
						})
					]
				}),
				/* @__PURE__ */ jsxs(Section, {
					title: t("fileInfo.identification"),
					children: [
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.lotId"),
							value: file.identity.lotId
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.waferId"),
							value: file.identity.waferId
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.deviceId"),
							value: file.identity.deviceId
						}),
						file.identity.slot != null && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.slot"),
							value: String(file.identity.slot)
						}),
						file.identity.stepId && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.stepId"),
							value: file.identity.stepId
						}),
						file.identity.fileTimestamp && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.fileTimestamp"),
							value: file.identity.fileTimestamp
						}),
						file.identity.resultTimestamp && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.resultTimestamp"),
							value: file.identity.resultTimestamp
						})
					]
				}),
				/* @__PURE__ */ jsxs(Section, {
					title: t("fileInfo.waferGeometry"),
					children: [
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.waferDiameter"),
							value: `${(file.waferGeometry.waferDiameter / 1e3).toFixed(1)} mm`
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.diePitch"),
							value: `${file.waferGeometry.diePitch[0]} x ${file.waferGeometry.diePitch[1]} um`
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.dieOrigin"),
							value: `${file.waferGeometry.dieOrigin[0]}, ${file.waferGeometry.dieOrigin[1]} um`
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.center"),
							value: `${file.waferGeometry.sampleCenterLocation[0]}, ${file.waferGeometry.sampleCenterLocation[1]} um`
						}),
						file.waferGeometry.orientationMarkType && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.orientationMark"),
							value: `${file.waferGeometry.orientationMarkType} ${file.waferGeometry.orientationMarkLocation ?? ""}`
						})
					]
				}),
				/* @__PURE__ */ jsxs(Section, {
					title: t("fileInfo.equipment"),
					children: [
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.vendor"),
							value: file.inspectionSetup.stationId.vendor
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.model"),
							value: file.inspectionSetup.stationId.model
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.equipmentId"),
							value: file.inspectionSetup.stationId.equipmentId
						}),
						file.inspectionSetup.setupId && /* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.setupRecipe"),
							value: file.inspectionSetup.setupId
						})
					]
				}),
				/* @__PURE__ */ jsxs(Section, {
					title: t("fileInfo.statistics"),
					children: [
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.totalDefects"),
							value: file.defects.length.toLocaleString(),
							highlight: true
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.defectClasses"),
							value: String(file.classLookup.length)
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.diesInMap"),
							value: String(file.dieMap.length)
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.testPlanDies"),
							value: String(file.testPlan.length)
						}),
						/* @__PURE__ */ jsx(InfoRow, {
							label: t("fileInfo.defectColumns"),
							value: file.defectSchema.map((c) => c.name).join(", ")
						})
					]
				}),
				warnings.length > 0 && /* @__PURE__ */ jsx(Section, {
					title: t("fileInfo.parseWarnings"),
					children: /* @__PURE__ */ jsx("div", {
						className: "flex flex-col gap-2",
						children: warnings.map((w, i) => /* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm",
							children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0 text-destructive" }), /* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsxs("span", {
									className: "font-mono text-xs text-muted-foreground",
									children: [
										"[",
										w.code,
										"]"
									]
								}),
								" ",
								w.message,
								w.line != null && /* @__PURE__ */ jsxs("span", {
									className: "text-muted-foreground",
									children: [
										" (line ",
										w.line,
										")"
									]
								})
							] })]
						}, i))
					})
				})
			]
		})]
	});
}
function Section({ title, children }) {
	return /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsx("h2", {
		className: "mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground",
		children: title
	}), /* @__PURE__ */ jsx("div", {
		className: "rounded-lg border border-border bg-card p-4",
		children: /* @__PURE__ */ jsx("div", {
			className: "flex flex-col gap-2",
			children
		})
	})] });
}
function InfoRow({ label, value, highlight }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-baseline gap-4",
		children: [/* @__PURE__ */ jsx("span", {
			className: "w-40 shrink-0 text-sm text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsx("span", {
			className: cn("text-sm", highlight && "font-semibold text-primary"),
			children: value
		})]
	});
}
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
//#endregion
export { FileInfoPage as default };

//# sourceMappingURL=file-info-FM_GCGE5.js.map