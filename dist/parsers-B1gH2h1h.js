//#region src/core/parsers/parser-registry.ts
/**
* Singleton registry for file format adapters.
*
* The ParserRegistry manages a collection of FileFormatAdapters and
* provides detection logic that combines file extension matching with
* content-based probing to select the best adapter for a given file.
*/ /** Number of characters from the file start passed to probe(). */ var PROBE_HEADER_SIZE = 4096;
var ParserRegistry = class ParserRegistry {
	static instance = null;
	adapters = /* @__PURE__ */ new Map();
	/** Use ParserRegistry.getInstance() instead. */ constructor() {}
	/** Returns the singleton ParserRegistry instance. */ static getInstance() {
		if (!ParserRegistry.instance) ParserRegistry.instance = new ParserRegistry();
		return ParserRegistry.instance;
	}
	/**
	* Reset the singleton (primarily for testing).
	* After calling this, getInstance() will create a fresh registry.
	*/ static resetInstance() {
		ParserRegistry.instance = null;
	}
	/**
	* Register a file format adapter.
	*
	* @param adapter - The adapter to register.
	* @throws Error if an adapter with the same format id is already registered.
	*/ register(adapter) {
		const id = adapter.descriptor.id;
		if (this.adapters.has(id)) throw new Error(`ParserRegistry: adapter with id "${id}" is already registered.`);
		this.adapters.set(id, adapter);
	}
	/**
	* Retrieve a registered adapter by its format id.
	*
	* @param id - The format id (e.g. "klarf").
	* @returns The adapter, or undefined if not registered.
	*/ getAdapter(id) {
		return this.adapters.get(id);
	}
	/** Returns all registered adapters. */ getAllAdapters() {
		return [...this.adapters.values()];
	}
	/** Returns descriptors for all registered formats. */ getSupportedFormats() {
		return this.getAllAdapters().map((a) => a.descriptor);
	}
	/**
	* Detect the best adapter for a given file.
	*
	* Detection strategy:
	*  1. Build a candidate set of adapters whose declared extensions match
	*     the file name extension (case-insensitive).
	*  2. Run probe() on every candidate (and all adapters if no extension
	*     matches) using the first PROBE_HEADER_SIZE characters of the content.
	*  3. Return the adapter with the highest confidence score, provided it
	*     exceeds zero. Returns undefined if no adapter matches.
	*
	* @param fileName - The file name (or path) to inspect.
	* @param content  - The full file content (only the header portion is used for probing).
	* @returns The best-matching adapter, or undefined.
	*/ detect(fileName, content) {
		const extension = extractExtension(fileName);
		const header = content.slice(0, PROBE_HEADER_SIZE);
		const extensionCandidates = this.getAdaptersByExtension(extension);
		if (extensionCandidates.length > 0) {
			const best = pickBestByProbe(extensionCandidates, header);
			if (best) return best;
		}
		return pickBestByProbe(this.getAllAdapters(), header);
	}
	/**
	* Returns all adapters whose declared extensions include the given extension.
	*/ getAdaptersByExtension(extension) {
		if (!extension) return [];
		const ext = extension.toLowerCase();
		return this.getAllAdapters().filter((adapter) => adapter.descriptor.extensions.some((e) => e.toLowerCase() === ext));
	}
};
/**
* Extract the file extension without the leading dot.
* Returns null if the file name has no extension.
*/ function extractExtension(fileName) {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot === -1 || lastDot === fileName.length - 1) return null;
	const baseName = fileName.split(/[/\\]/).pop() ?? fileName;
	const dotIndex = baseName.lastIndexOf(".");
	if (dotIndex === -1 || dotIndex === baseName.length - 1) return null;
	return baseName.slice(dotIndex + 1);
}
/**
* Run probe() on each candidate and return the one with the highest
* confidence score above zero. Returns undefined if none match.
*/ function pickBestByProbe(candidates, header) {
	let bestAdapter;
	let bestScore = 0;
	for (const adapter of candidates) {
		const score = adapter.probe(header);
		if (score > bestScore) {
			bestScore = score;
			bestAdapter = adapter;
		}
	}
	return bestAdapter;
}
//#endregion
//#region src/core/parsers/klarf/klarf-tokenizer.ts
/**
* KLARF v1.2 tokenizer.
*
* Splits KLARF text into logical entries delimited by semicolons.
* Handles:
*  - Quoted strings ("value with spaces")
*  - Multi-line entries (e.g., DefectList spans many lines)
*  - Line number tracking for error reporting
*  - Whitespace normalization
*/ /**
* Tokenize a KLARF v1.2 file into a sequence of entries.
*
* Each entry corresponds to one semicolon-delimited statement.
* The entry's keyword is the first token, and the remaining tokens
* are the values associated with that keyword.
*
* @param text - The complete KLARF file content.
* @param onProgress - Optional callback for progress reporting.
* @returns Array of parsed entries.
*/ function tokenizeKlarf(text, onProgress) {
	const entries = [];
	const len = text.length;
	let pos = 0;
	let lineNumber = 1;
	let entryLineStart = 1;
	let buffer = "";
	let bufferEmpty = true;
	let inQuote = false;
	while (pos < len) {
		const ch = text[pos];
		if (ch === "\n") lineNumber++;
		if (inQuote) {
			buffer += ch;
			if (ch === "\"") inQuote = false;
			pos++;
			continue;
		}
		if (ch === "\"") {
			inQuote = true;
			if (bufferEmpty) {
				entryLineStart = lineNumber;
				bufferEmpty = false;
			}
			buffer += ch;
			pos++;
			continue;
		}
		if (ch === ";") {
			const trimmed = buffer.trim();
			if (trimmed.length > 0) {
				const entry = parseEntryBuffer(trimmed, entryLineStart);
				if (entry) entries.push(entry);
			}
			buffer = "";
			bufferEmpty = true;
			pos++;
			if (onProgress && entries.length % 5e3 === 0) onProgress(pos / len);
			continue;
		}
		if (bufferEmpty && !isWhitespace(ch)) {
			entryLineStart = lineNumber;
			bufferEmpty = false;
		}
		buffer += ch;
		pos++;
	}
	const remaining = buffer.trim();
	if (remaining.length > 0) {
		const entry = parseEntryBuffer(remaining, entryLineStart);
		if (entry) entries.push(entry);
	}
	if (onProgress) onProgress(1);
	return entries;
}
/**
* Parse a raw entry buffer (text between semicolons) into a KlarfEntry.
*
* Splits on whitespace while preserving quoted strings as single tokens.
*/ function parseEntryBuffer(buffer, line) {
	const tokens = splitTokens(buffer);
	if (tokens.length === 0) return null;
	return {
		keyword: tokens[0],
		tokens: tokens.slice(1),
		line
	};
}
/**
* Split a string into tokens on whitespace, preserving quoted strings.
*
* "LotID \"ABC 123\"" -> ["LotID", "ABC 123"]
*/ function splitTokens(input) {
	const tokens = [];
	const len = input.length;
	let i = 0;
	while (i < len) {
		while (i < len && isWhitespace(input[i])) i++;
		if (i >= len) break;
		if (input[i] === "\"") {
			i++;
			let token = "";
			while (i < len && input[i] !== "\"") {
				token += input[i];
				i++;
			}
			if (i < len) i++;
			tokens.push(token);
		} else {
			let token = "";
			while (i < len && !isWhitespace(input[i])) {
				token += input[i];
				i++;
			}
			tokens.push(token);
		}
	}
	return tokens;
}
function isWhitespace(ch) {
	return ch === " " || ch === "	" || ch === "\n" || ch === "\r";
}
/**
* Check if a KLARF text is v1.2 format (flat keyword-based)
* vs v1.8 (hierarchical Record/Field/List).
*/ function detectKlarfVersion(text) {
	const header = text.trimStart().slice(0, 500);
	if (header.startsWith("Record FileRecord") || header.startsWith("Record ")) return "1.8";
	return "1.2";
}
//#endregion
//#region src/core/parsers/klarf/klarf-types.ts
/**
* Raw intermediate types produced by the KLARF parser before normalization.
*
* These represent the KLARF file content as-parsed, before mapping to the
* format-agnostic InspectionFile domain model.
*/ /** Create a default/empty RawKlarfData structure. */ function createEmptyRawKlarfData() {
	return {
		fileVersion: [1, 2],
		lotId: "",
		deviceId: "",
		waferId: "",
		sampleSize: [1, 3e5],
		diePitch: [0, 0],
		dieOrigin: [0, 0],
		sampleCenterLocation: [0, 0],
		defectRecordSpec: [],
		defectRecordCount: 0,
		defects: [],
		summarySpec: [],
		summaryRecordCount: 0,
		summaries: [],
		classLookup: [],
		testPlan: [],
		clusterClassifications: []
	};
}
//#endregion
//#region src/core/parsers/klarf/klarf-v12-parser.ts
/**
* KLARF v1.2 flat-format parser.
*
* Parses the semicolon-delimited keyword/value format into RawKlarfData.
* Each entry is `Keyword value1 value2 ...;`
*
* Multi-row sections (DefectList, SummaryList, ClassLookup, etc.) are
* handled by consuming subsequent entries that are purely numeric or
* data rows belonging to the list.
*/
/**
* Parse KLARF v1.2 text into RawKlarfData.
*/ function parseKlarfV12(text, onProgress) {
	const warnings = [];
	const data = createEmptyRawKlarfData();
	onProgress?.({
		fraction: 0,
		phase: "Tokenizing"
	});
	const entries = tokenizeKlarf(text, (f) => onProgress?.({
		fraction: f * .3,
		phase: "Tokenizing"
	}));
	onProgress?.({
		fraction: .3,
		phase: "Parsing entries"
	});
	const totalEntries = entries.length;
	let i = 0;
	while (i < totalEntries) {
		const entry = entries[i];
		const kw = entry.keyword;
		try {
			switch (kw) {
				case "FileVersion":
					data.fileVersion = [parseInt(entry.tokens[0], 10) || 1, parseInt(entry.tokens[1], 10) || 2];
					break;
				case "FileTimestamp":
					data.fileTimestamp = entry.tokens.join(" ");
					break;
				case "ResultTimestamp":
					data.resultTimestamp = entry.tokens.join(" ");
					break;
				case "InspectionStationID":
					data.stationVendor = unquote(entry.tokens[0]);
					data.stationModel = unquote(entry.tokens[1]);
					data.stationEquipmentId = unquote(entry.tokens[2]);
					break;
				case "SampleType":
					data.sampleType = unquote(entry.tokens[0]);
					break;
				case "LotID":
					data.lotId = unquote(entry.tokens[0]);
					break;
				case "DeviceID":
					data.deviceId = unquote(entry.tokens[0]);
					break;
				case "SetupID":
					data.setupId = unquote(entry.tokens[0]);
					break;
				case "StepID":
					data.stepId = unquote(entry.tokens[0]);
					break;
				case "WaferID":
					data.waferId = unquote(entry.tokens[0]);
					break;
				case "Slot":
					data.slot = parseInt(entry.tokens[0], 10);
					break;
				case "SampleSize":
					data.sampleSize = [parseFloat(entry.tokens[0]), parseFloat(entry.tokens[1])];
					break;
				case "DiePitch":
					data.diePitch = [parseFloat(entry.tokens[0]), parseFloat(entry.tokens[1])];
					break;
				case "DieOrigin":
					data.dieOrigin = [parseFloat(entry.tokens[0]), parseFloat(entry.tokens[1])];
					break;
				case "SampleCenterLocation":
					data.sampleCenterLocation = [parseFloat(entry.tokens[0]), parseFloat(entry.tokens[1])];
					break;
				case "SampleOrientationMarkType":
					data.orientationMarkType = unquote(entry.tokens[0]);
					break;
				case "OrientationMarkLocation":
					data.orientationMarkLocation = unquote(entry.tokens[0]);
					break;
				case "AreaPerTest":
					data.areaPerTest = parseFloat(entry.tokens[0]);
					break;
				case "DefectRecordSpec":
					data.defectRecordCount = parseInt(entry.tokens[0], 10);
					data.defectRecordSpec = entry.tokens.slice(1).map((t) => t.toUpperCase());
					break;
				case "DefectList":
					i = parseDefectList(entries, i, data, onProgress, totalEntries);
					continue;
				case "SummarySpec":
					data.summaryRecordCount = parseInt(entry.tokens[0], 10);
					data.summarySpec = entry.tokens.slice(1).map((t) => t.toUpperCase());
					break;
				case "SummaryList":
					i = parseSummaryList(entries, i, data);
					continue;
				case "ClassLookup":
					i = parseClassLookup(entries, i, data);
					continue;
				case "SampleTestPlan":
					i = parseTestPlan(entries, i, data);
					continue;
				case "EndOfFile":
					i = totalEntries;
					continue;
				default:
					if (kw && !kw.startsWith("#")) warnings.push({
						code: "KLARF_UNKNOWN_KEYWORD",
						message: `Unknown keyword: ${kw}`,
						line: entry.line,
						severity: "warning"
					});
					break;
			}
		} catch (err) {
			warnings.push({
				code: "KLARF_PARSE_ENTRY_ERROR",
				message: `Error parsing ${kw} at line ${entry.line}: ${err instanceof Error ? err.message : String(err)}`,
				line: entry.line,
				severity: "warning"
			});
		}
		i++;
		if (onProgress && i % 2e3 === 0) onProgress({
			fraction: .3 + i / totalEntries * .7,
			phase: "Parsing entries",
			itemCount: i
		});
	}
	onProgress?.({
		fraction: 1,
		phase: "Done"
	});
	return {
		data,
		warnings
	};
}
/**
* Parse the DefectList section.
*
* The DefectList keyword entry may contain inline data tokens (when the
* first defect row appears on the same line without a separating semicolon).
* Subsequent entries are numeric data rows until we hit a recognized keyword.
*/ function parseDefectList(entries, startIndex, data, onProgress, totalEntries) {
	const colCount = data.defectRecordSpec.length;
	const defectListEntry = entries[startIndex];
	if (defectListEntry.tokens.length >= colCount) {
		const row = defectListEntry.tokens.map(parseNumericToken);
		data.defects.push(row.slice(0, colCount));
	}
	let i = startIndex + 1;
	while (i < totalEntries) {
		const entry = entries[i];
		if (isKnownKeyword(entry.keyword)) break;
		const row = [entry.keyword, ...entry.tokens].map(parseNumericToken);
		if (row.length >= colCount) data.defects.push(row.slice(0, colCount));
		else if (row.length > 0) {
			while (row.length < colCount) row.push(0);
			data.defects.push(row);
		}
		i++;
		if (onProgress && data.defects.length % 1e4 === 0) onProgress({
			fraction: .3 + i / totalEntries * .7,
			phase: "Reading defects",
			itemCount: data.defects.length
		});
	}
	return i;
}
/**
* Parse the SummaryList section.
*/ function parseSummaryList(entries, startIndex, data) {
	const colCount = data.summarySpec.length;
	const summaryListEntry = entries[startIndex];
	if (summaryListEntry.tokens.length >= colCount) {
		const row = summaryListEntry.tokens.map(parseNumericToken);
		data.summaries.push(row.slice(0, colCount));
	}
	let i = startIndex + 1;
	while (i < entries.length) {
		const entry = entries[i];
		if (isKnownKeyword(entry.keyword)) break;
		const row = [entry.keyword, ...entry.tokens].map(parseNumericToken);
		if (row.length >= colCount) data.summaries.push(row.slice(0, colCount));
		i++;
	}
	return i;
}
/**
* Parse the ClassLookup section.
*
* Format: ClassLookup count; then entries like: classNumber "ClassName" ["code"];
*/ function parseClassLookup(entries, startIndex, data) {
	let i = startIndex + 1;
	while (i < entries.length) {
		const entry = entries[i];
		if (isKnownKeyword(entry.keyword)) break;
		const classNumber = parseInt(entry.keyword, 10);
		if (!isNaN(classNumber)) {
			const className = unquote(entry.tokens[0] ?? `Class ${classNumber}`);
			const classCode = entry.tokens[1] ? unquote(entry.tokens[1]) : void 0;
			data.classLookup.push({
				classNumber,
				className,
				classCode
			});
		}
		i++;
	}
	return i;
}
/**
* Parse the SampleTestPlan section.
*/ function parseTestPlan(entries, startIndex, data) {
	let i = startIndex + 1;
	while (i < entries.length) {
		const entry = entries[i];
		if (isKnownKeyword(entry.keyword)) break;
		const x = parseInt(entry.keyword, 10);
		const y = parseInt(entry.tokens[0], 10);
		if (!isNaN(x) && !isNaN(y)) data.testPlan.push([x, y]);
		i++;
	}
	return i;
}
var KNOWN_KEYWORDS = new Set([
	"FileVersion",
	"FileTimestamp",
	"InspectionStationID",
	"SampleType",
	"ResultTimestamp",
	"LotID",
	"SampleSize",
	"DeviceID",
	"SetupID",
	"StepID",
	"WaferID",
	"Slot",
	"SampleOrientationMarkType",
	"OrientationMarkLocation",
	"DiePitch",
	"DieOrigin",
	"SampleCenterLocation",
	"DefectRecordSpec",
	"DefectList",
	"SummarySpec",
	"SummaryList",
	"ClassLookup",
	"ClusterClassificationList",
	"SampleTestPlan",
	"AreaPerTest",
	"EndOfFile"
]);
function isKnownKeyword(token) {
	return KNOWN_KEYWORDS.has(token);
}
function unquote(s) {
	if (!s) return "";
	if (s.startsWith("\"") && s.endsWith("\"")) return s.slice(1, -1);
	return s;
}
function parseNumericToken(s) {
	const n = Number(s);
	return isNaN(n) ? 0 : n;
}
//#endregion
//#region src/core/parsers/klarf/klarf-v18-parser.ts
/**
* KLARF v1.8 hierarchical parser.
*
* Parses the Record/Field/List format with brace-delimited nesting:
*
*   Record FileRecord {
*     Field FileVersion "1.8";
*     Record LotRecord {
*       Field LotID "LOT001";
*       Record WaferRecord {
*         Field WaferID "W01";
*         List DefectList {
*           Columns { DEFECTID XREL YREL XINDEX YINDEX }
*           Data {
*             1 1523 2210 0 0
*             2 9832 4500 1 0
*           }
*         }
*       }
*     }
*   }
*/ function tokenize(text) {
	const tokens = [];
	let pos = 0;
	let line = 1;
	const len = text.length;
	while (pos < len) {
		const ch = text[pos];
		if (ch === "\n") {
			line++;
			pos++;
			continue;
		}
		if (ch === " " || ch === "	" || ch === "\r") {
			pos++;
			continue;
		}
		if (ch === "#") {
			while (pos < len && text[pos] !== "\n") pos++;
			continue;
		}
		if (ch === "{") {
			tokens.push({
				type: "LBRACE",
				value: "{",
				line
			});
			pos++;
			continue;
		}
		if (ch === "}") {
			tokens.push({
				type: "RBRACE",
				value: "}",
				line
			});
			pos++;
			continue;
		}
		if (ch === ";") {
			tokens.push({
				type: "SEMICOLON",
				value: ";",
				line
			});
			pos++;
			continue;
		}
		if (ch === "\"") {
			pos++;
			let str = "";
			while (pos < len && text[pos] !== "\"") {
				if (text[pos] === "\n") line++;
				str += text[pos];
				pos++;
			}
			if (pos < len) pos++;
			tokens.push({
				type: "STRING",
				value: str,
				line
			});
			continue;
		}
		let word = "";
		while (pos < len && !isDelimiter(text[pos])) {
			word += text[pos];
			pos++;
		}
		if (word.length > 0) {
			const num = Number(word);
			if (!isNaN(num) && word !== "") tokens.push({
				type: "NUMBER",
				value: word,
				line
			});
			else tokens.push({
				type: "KEYWORD",
				value: word,
				line
			});
		}
	}
	tokens.push({
		type: "EOF",
		value: "",
		line
	});
	return tokens;
}
function isDelimiter(ch) {
	return ch === " " || ch === "	" || ch === "\n" || ch === "\r" || ch === "{" || ch === "}" || ch === ";" || ch === "\"" || ch === "#";
}
var V18Parser = class {
	tokens;
	pos = 0;
	data;
	warnings = [];
	onProgress;
	constructor(tokens, onProgress) {
		this.tokens = tokens;
		this.data = createEmptyRawKlarfData();
		this.onProgress = onProgress;
	}
	parse() {
		this.onProgress?.({
			fraction: 0,
			phase: "Parsing v1.8 structure"
		});
		while (!this.isAtEnd()) {
			const tok = this.peek();
			if (tok.type === "KEYWORD" && tok.value === "Record") this.parseRecord();
			else this.advance();
		}
		this.onProgress?.({
			fraction: 1,
			phase: "Done"
		});
		return {
			data: this.data,
			warnings: this.warnings
		};
	}
	parseRecord() {
		this.expect("KEYWORD", "Record");
		const recordType = this.advance();
		this.expect("LBRACE");
		const type = recordType.value;
		while (!this.isAtEnd() && this.peek().type !== "RBRACE") {
			const tok = this.peek();
			if (tok.type === "KEYWORD" && tok.value === "Record") this.parseRecord();
			else if (tok.type === "KEYWORD" && tok.value === "Field") this.parseField(type);
			else if (tok.type === "KEYWORD" && tok.value === "List") this.parseList(type);
			else this.advance();
		}
		this.expect("RBRACE");
	}
	parseField(_recordContext) {
		this.expect("KEYWORD", "Field");
		const fieldName = this.advance().value;
		const values = [];
		while (!this.isAtEnd() && this.peek().type !== "SEMICOLON" && this.peek().type !== "RBRACE") values.push(this.advance().value);
		if (this.peek().type === "SEMICOLON") this.advance();
		this.applyField(_recordContext, fieldName, values);
	}
	parseList(_recordContext) {
		this.expect("KEYWORD", "List");
		const listName = this.advance().value;
		this.expect("LBRACE");
		let columns = [];
		const rows = [];
		while (!this.isAtEnd() && this.peek().type !== "RBRACE") {
			const tok = this.peek();
			if (tok.type === "KEYWORD" && tok.value === "Columns") {
				this.advance();
				this.expect("LBRACE");
				while (!this.isAtEnd() && this.peek().type !== "RBRACE") columns.push(this.advance().value.toUpperCase());
				this.expect("RBRACE");
			} else if (tok.type === "KEYWORD" && tok.value === "Data") {
				this.advance();
				this.expect("LBRACE");
				const colCount = columns.length || 1;
				let row = [];
				while (!this.isAtEnd() && this.peek().type !== "RBRACE") {
					const t = this.advance();
					if (t.type === "NUMBER") row.push(Number(t.value));
					else if (t.type === "KEYWORD") {
						const num = Number(t.value);
						if (!isNaN(num)) row.push(num);
					} else if (t.type === "STRING") row.push(0);
					else if (t.type === "SEMICOLON") {
						if (row.length > 0) {
							rows.push(row);
							row = [];
						}
						continue;
					}
					if (row.length >= colCount) {
						rows.push(row.slice(0, colCount));
						row = row.slice(colCount);
					}
					if (this.onProgress && rows.length % 1e4 === 0 && rows.length > 0) this.onProgress({
						fraction: this.pos / this.tokens.length,
						phase: `Reading ${listName}`,
						itemCount: rows.length
					});
				}
				if (row.length > 0) rows.push(row);
				this.expect("RBRACE");
			} else this.advance();
		}
		this.expect("RBRACE");
		this.applyList(listName, columns, rows);
	}
	applyField(_recordContext, fieldName, values) {
		const val = (i) => values[i] ?? "";
		const num = (i) => parseFloat(values[i]) || 0;
		switch (fieldName) {
			case "FileVersion":
				this.data.fileVersion = [parseInt(val(0)) || 1, parseInt(val(1)) || 8];
				break;
			case "FileTimestamp":
				this.data.fileTimestamp = values.join(" ");
				break;
			case "ResultTimestamp":
				this.data.resultTimestamp = values.join(" ");
				break;
			case "InspectionStationID":
				this.data.stationVendor = val(0);
				this.data.stationModel = val(1);
				this.data.stationEquipmentId = val(2);
				break;
			case "SampleType":
				this.data.sampleType = val(0);
				break;
			case "LotID":
				this.data.lotId = val(0);
				break;
			case "DeviceID":
				this.data.deviceId = val(0);
				break;
			case "SetupID":
				this.data.setupId = val(0);
				break;
			case "StepID":
				this.data.stepId = val(0);
				break;
			case "WaferID":
				this.data.waferId = val(0);
				break;
			case "Slot":
				this.data.slot = parseInt(val(0));
				break;
			case "SampleSize":
				this.data.sampleSize = [num(0), num(1)];
				break;
			case "DiePitch":
				this.data.diePitch = [num(0), num(1)];
				break;
			case "DieOrigin":
				this.data.dieOrigin = [num(0), num(1)];
				break;
			case "SampleCenterLocation":
				this.data.sampleCenterLocation = [num(0), num(1)];
				break;
			case "SampleOrientationMarkType":
				this.data.orientationMarkType = val(0);
				break;
			case "OrientationMarkLocation":
				this.data.orientationMarkLocation = val(0);
				break;
			case "AreaPerTest":
				this.data.areaPerTest = num(0);
				break;
			default: break;
		}
	}
	applyList(listName, columns, rows) {
		switch (listName) {
			case "DefectList":
				this.data.defectRecordSpec = columns;
				this.data.defectRecordCount = rows.length;
				this.data.defects = rows;
				break;
			case "SummaryList":
				this.data.summarySpec = columns;
				this.data.summaryRecordCount = rows.length;
				this.data.summaries = rows;
				break;
			case "ClassLookup":
				for (const row of rows) {
					const classNumber = row[0] ?? 0;
					this.data.classLookup.push({
						classNumber,
						className: `Class ${classNumber}`
					});
				}
				break;
			case "SampleTestPlan":
				for (const row of rows) if (row.length >= 2) this.data.testPlan.push([row[0], row[1]]);
				break;
			default: break;
		}
	}
	peek() {
		return this.tokens[this.pos] ?? {
			type: "EOF",
			value: "",
			line: 0
		};
	}
	advance() {
		const tok = this.tokens[this.pos];
		this.pos++;
		return tok ?? {
			type: "EOF",
			value: "",
			line: 0
		};
	}
	expect(type, value) {
		const tok = this.advance();
		if (tok.type !== type || value !== void 0 && tok.value !== value) this.warnings.push({
			code: "KLARF_V18_UNEXPECTED_TOKEN",
			message: `Expected ${type}${value ? ` "${value}"` : ""} but got ${tok.type} "${tok.value}" at line ${tok.line}`,
			line: tok.line,
			severity: "warning"
		});
		return tok;
	}
	isAtEnd() {
		return this.pos >= this.tokens.length || this.tokens[this.pos].type === "EOF";
	}
};
/**
* Parse KLARF v1.8 text into RawKlarfData.
*/ function parseKlarfV18(text, onProgress) {
	onProgress?.({
		fraction: 0,
		phase: "Tokenizing v1.8"
	});
	const tokens = tokenize(text);
	onProgress?.({
		fraction: .2,
		phase: "Parsing v1.8 structure"
	});
	return new V18Parser(tokens, onProgress).parse();
}
//#endregion
//#region src/core/parsers/klarf/klarf-constants.ts
/** Core defect columns mapped to DefectRecord fields. */ var CORE_COLUMN_MAP = {
	DEFECTID: "defectId",
	XREL: "xRel",
	YREL: "yRel",
	XINDEX: "xIndex",
	YINDEX: "yIndex",
	DSIZE: "size",
	DEFECTSIZE: "size",
	CLASSNUMBER: "classNumber",
	CLUSTERNUMBER: "clusterNumber",
	TEST: "test",
	IMAGECOUNT: "imageCount"
};
//#endregion
//#region src/core/parsers/klarf/klarf-normalizer.ts
/**
* KLARF normalizer: transforms RawKlarfData into the format-agnostic InspectionFile.
*
* Responsibilities:
*  - Map raw KLARF fields to domain model interfaces
*  - Build DefectRecord objects with absolute coordinates
*  - Construct the DieMap from defect data
*  - Resolve class names from ClassLookup
*/
/**
* Normalize raw KLARF data into an InspectionFile.
*/ function normalizeKlarfData(input) {
	const { raw, fileName, fileSize, warnings } = input;
	const source = buildSource(raw, fileName, fileSize, warnings);
	const identity = buildIdentity(raw);
	const waferGeometry = buildWaferGeometry(raw);
	const inspectionSetup = buildInspectionSetup(raw);
	const defectSchema = buildDefectSchema(raw.defectRecordSpec);
	const defects = buildDefects(raw, defectSchema, waferGeometry);
	const summarySchema = buildSummarySchema(raw.summarySpec);
	const summaries = buildSummaries(raw, summarySchema);
	const classLookup = buildClassLookup(raw);
	const testPlan = buildTestPlan(raw);
	const dieMap = buildDieMap(defects, testPlan);
	resolveClassNames(defects, classLookup);
	return {
		source,
		identity,
		waferGeometry,
		inspectionSetup,
		defects,
		defectSchema,
		dieMap,
		classLookup,
		summaries,
		summarySchema,
		testPlan
	};
}
function buildSource(raw, fileName, fileSize, warnings) {
	return {
		formatId: "klarf",
		formatVersion: `${raw.fileVersion[0]}.${raw.fileVersion[1]}`,
		fileName,
		fileSize,
		parseTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
		warnings
	};
}
function buildIdentity(raw) {
	return {
		lotId: raw.lotId,
		waferId: raw.waferId,
		slot: raw.slot,
		deviceId: raw.deviceId,
		stepId: raw.stepId,
		fileTimestamp: raw.fileTimestamp,
		resultTimestamp: raw.resultTimestamp
	};
}
function buildWaferGeometry(raw) {
	return {
		waferDiameter: raw.sampleSize[1],
		diePitch: raw.diePitch,
		dieOrigin: raw.dieOrigin,
		sampleCenterLocation: raw.sampleCenterLocation,
		orientationMarkType: raw.orientationMarkType,
		orientationMarkLocation: raw.orientationMarkLocation,
		sampleSizeRaw: raw.sampleSize
	};
}
function buildInspectionSetup(raw) {
	return {
		stationId: {
			vendor: raw.stationVendor ?? "",
			model: raw.stationModel ?? "",
			equipmentId: raw.stationEquipmentId ?? ""
		},
		setupId: raw.setupId
	};
}
function buildDefectSchema(specColumns) {
	return specColumns.map((name, index) => ({
		name,
		type: inferColumnType(name),
		index
	}));
}
function inferColumnType(name) {
	const upper = name.toUpperCase();
	if (upper === "DEFECTID" || upper === "XINDEX" || upper === "YINDEX" || upper === "CLASSNUMBER" || upper === "TEST" || upper === "CLUSTERNUMBER" || upper === "IMAGECOUNT" || upper === "ROUGHBINNUMBER" || upper === "FINEBINNUMBER") return "int32";
	if (upper === "XREL" || upper === "YREL" || upper === "XSIZE" || upper === "YSIZE" || upper === "DEFECTAREA" || upper === "DSIZE" || upper === "DEFECTSIZE") return "float";
	return "unknown";
}
function buildDefects(raw, schema, geometry) {
	const colMap = buildColumnIndexMap(schema);
	const defects = [];
	for (const row of raw.defects) {
		const defect = buildDefectRecord(row, colMap, schema, geometry);
		if (defect) defects.push(defect);
	}
	return defects;
}
function buildColumnIndexMap(schema) {
	const map = {};
	for (const col of schema) {
		const coreField = CORE_COLUMN_MAP[col.name];
		if (coreField) map[coreField] = col.index;
	}
	return {
		defectId: map["defectId"] ?? -1,
		xRel: map["xRel"] ?? -1,
		yRel: map["yRel"] ?? -1,
		xIndex: map["xIndex"] ?? -1,
		yIndex: map["yIndex"] ?? -1,
		size: map["size"] ?? -1,
		classNumber: map["classNumber"] ?? -1,
		clusterNumber: map["clusterNumber"] ?? -1,
		test: map["test"] ?? -1,
		imageCount: map["imageCount"] ?? -1
	};
}
function buildDefectRecord(row, colMap, schema, geometry) {
	const val = (idx) => idx >= 0 && idx < row.length ? row[idx] : void 0;
	const defectId = val(colMap.defectId);
	const xRel = val(colMap.xRel) ?? 0;
	const yRel = val(colMap.yRel) ?? 0;
	const xIndex = val(colMap.xIndex) ?? 0;
	const yIndex = val(colMap.yIndex) ?? 0;
	const xAbs = geometry.dieOrigin[0] + xIndex * geometry.diePitch[0] + xRel;
	const yAbs = geometry.dieOrigin[1] + yIndex * geometry.diePitch[1] + yRel;
	const extra = {};
	for (const col of schema) if (!CORE_COLUMN_MAP[col.name] && col.index < row.length) extra[col.name] = row[col.index];
	return {
		defectId: defectId ?? 0,
		xRel,
		yRel,
		xIndex,
		yIndex,
		size: val(colMap.size),
		classNumber: val(colMap.classNumber),
		clusterNumber: val(colMap.clusterNumber),
		test: val(colMap.test),
		imageCount: val(colMap.imageCount),
		extra,
		xAbs,
		yAbs
	};
}
function buildSummarySchema(specColumns) {
	return specColumns.map((name, index) => ({
		name,
		type: "float",
		index
	}));
}
function buildSummaries(raw, schema) {
	return raw.summaries.map((row) => {
		const values = {};
		for (const col of schema) if (col.index < row.length) values[col.name] = row[col.index];
		return {
			testNumber: row[0] ?? 0,
			areaPerTest: raw.areaPerTest,
			values
		};
	});
}
function buildClassLookup(raw) {
	return raw.classLookup.map((entry) => ({
		classNumber: entry.classNumber,
		className: entry.className,
		classCode: entry.classCode
	}));
}
function buildTestPlan(raw) {
	return raw.testPlan.map(([x, y]) => ({
		xIndex: x,
		yIndex: y
	}));
}
/**
* Build die map from defect positions and test plan.
*/ function buildDieMap(defects, testPlan) {
	const dieDefectCount = /* @__PURE__ */ new Map();
	const allDies = /* @__PURE__ */ new Set();
	for (const defect of defects) {
		const key = `${defect.xIndex},${defect.yIndex}`;
		allDies.add(key);
		dieDefectCount.set(key, (dieDefectCount.get(key) ?? 0) + 1);
	}
	for (const tp of testPlan) allDies.add(`${tp.xIndex},${tp.yIndex}`);
	const testPlanSet = new Set(testPlan.map((tp) => `${tp.xIndex},${tp.yIndex}`));
	const dieMap = [];
	for (const key of allDies) {
		const [x, y] = key.split(",").map(Number);
		const defectCount = dieDefectCount.get(key) ?? 0;
		const inTestPlan = testPlanSet.has(key);
		dieMap.push({
			xIndex: x,
			yIndex: y,
			status: inTestPlan || defectCount > 0 ? "tested" : "untested",
			defectCount
		});
	}
	return dieMap;
}
/**
* Resolve class names on defect records from the class lookup table.
*/ function resolveClassNames(defects, classLookup) {
	if (classLookup.length === 0) return;
	const lookupMap = /* @__PURE__ */ new Map();
	for (const entry of classLookup) lookupMap.set(entry.classNumber, entry.className);
	for (const defect of defects) if (defect.classNumber != null) defect.extra["_className"] = lookupMap.get(defect.classNumber) ?? "";
}
//#endregion
//#region src/core/parsers/klarf/index.ts
/**
* KLARF file format adapter.
*
* Implements the FileFormatAdapter interface for KLA Results Files.
* Supports both v1.2 (flat keyword/value) and v1.8 (hierarchical Record/Field/List).
*/ var KlarfAdapter = class {
	descriptor = {
		id: "klarf",
		name: "KLARF (KLA Results File)",
		extensions: [
			"klarf",
			"kla",
			"000",
			"001",
			"002",
			"003"
		],
		mimeTypes: ["text/plain"]
	};
	/**
	* Probe the file header to determine if this is a KLARF file.
	*
	* Returns 0..1 confidence:
	*  0.95 - starts with "Record FileRecord" (v1.8)
	*  0.90 - starts with "FileVersion" (v1.2)
	*  0.80 - contains "FileVersion" and "LotID"
	*  0.70 - contains "DefectRecordSpec"
	*  0 - no match
	*/ probe(header) {
		const trimmed = header.trimStart();
		if (trimmed.startsWith("Record FileRecord")) return .95;
		if (trimmed.startsWith("FileVersion")) return .9;
		if (trimmed.includes("FileVersion") && trimmed.includes("LotID")) return .8;
		if (trimmed.includes("DefectRecordSpec")) return .7;
		return 0;
	}
	/** Optional metadata set before parse(). */ _meta = {
		fileName: "unknown.klarf",
		fileSize: 0
	};
	/** Set file metadata before calling parse(). */ withMeta(meta) {
		this._meta = meta;
		return this;
	}
	/**
	* Parse KLARF file text into an InspectionFile.
	*/ parse(text, onProgress) {
		try {
			const { data: raw, warnings } = detectKlarfVersion(text) === "1.8" ? parseKlarfV18(text, onProgress) : parseKlarfV12(text, onProgress);
			if (!raw.lotId && !raw.waferId) return {
				success: false,
				errors: [{
					code: "KLARF_MISSING_IDENTITY",
					message: "KLARF file is missing LotID and WaferID. File may be corrupted or incomplete.",
					severity: "error"
				}],
				warnings
			};
			return {
				success: true,
				data: normalizeKlarfData({
					raw,
					fileName: this._meta.fileName,
					fileSize: this._meta.fileSize || text.length,
					warnings
				}),
				warnings
			};
		} catch (err) {
			return {
				success: false,
				errors: [{
					code: "KLARF_PARSE_ERROR",
					message: `Unexpected error parsing KLARF file: ${err instanceof Error ? err.message : String(err)}`,
					severity: "error"
				}],
				warnings: []
			};
		}
	}
};
//#endregion
//#region src/core/parsers/sinf/sinf-types.ts
/**
* Raw SINF data structures.
*
* SINF (Simplified INF) is a text-based wafer map format containing
* die-level bin codes. Unlike KLARF, SINF does not contain defect-level
* data - it maps each die position to a bin result code.
*/ function createEmptyRawSinfData() {
	return {
		device: "",
		lot: "",
		wafer: "",
		fnloc: "D",
		rowct: 0,
		colct: 0,
		bcequ: [],
		refpx: 0,
		refpy: 0,
		dutms: "um",
		xdies: 0,
		ydies: 0,
		rows: []
	};
}
//#endregion
//#region src/core/parsers/sinf/sinf-parser.ts
/**
* SINF file parser.
*
* SINF format structure:
*   DEVICE:device_name
*   LOT:lot_id
*   WAFER:wafer_id
*   FNLOC:D          (flat/notch location: U/D/L/R)
*   ROWCT:25          (number of rows)
*   COLCT:25          (number of columns)
*   BCEQU:01 02 03    (good bin codes, space-separated)
*   REFPX:12          (reference die X)
*   REFPY:12          (reference die Y)
*   DUTMS:um          (die units)
*   XDIES:5000        (die pitch X)
*   YDIES:5000        (die pitch Y)
*   (row data: space-separated 2-char bin codes per row)
*   __ __ 01 02 01 __ __
*   __ 01 03 01 02 01 __
*   ...
*/ function parseSinf(text) {
	const data = createEmptyRawSinfData();
	const warnings = [];
	const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
	let headerDone = false;
	let rowIndex = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!headerDone && line.includes(":")) {
			const colonIdx = line.indexOf(":");
			const key = line.slice(0, colonIdx).trim().toUpperCase();
			const value = line.slice(colonIdx + 1).trim();
			switch (key) {
				case "DEVICE":
					data.device = value;
					break;
				case "LOT":
					data.lot = value;
					break;
				case "WAFER":
					data.wafer = value;
					break;
				case "FNLOC":
					data.fnloc = value.toUpperCase();
					break;
				case "ROWCT":
					data.rowct = parseInt(value, 10) || 0;
					break;
				case "COLCT":
					data.colct = parseInt(value, 10) || 0;
					break;
				case "BCEQU":
					data.bcequ = value.split(/\s+/).filter(Boolean);
					break;
				case "REFPX":
					data.refpx = parseInt(value, 10) || 0;
					break;
				case "REFPY":
					data.refpy = parseInt(value, 10) || 0;
					break;
				case "DUTMS":
					data.dutms = value;
					break;
				case "XDIES":
					data.xdies = parseFloat(value) || 0;
					break;
				case "YDIES":
					data.ydies = parseFloat(value) || 0;
					break;
				default: warnings.push({
					code: "SINF_UNKNOWN_HEADER",
					message: `Unknown SINF header: ${key}`,
					line: i + 1,
					severity: "warning"
				});
			}
			continue;
		}
		headerDone = true;
		const cells = line.split(/\s+/).filter(Boolean);
		if (cells.length > 0) {
			data.rows.push(cells);
			rowIndex++;
		}
	}
	if (data.rowct === 0 && data.rows.length > 0) data.rowct = data.rows.length;
	if (data.colct === 0 && data.rows.length > 0) data.colct = Math.max(...data.rows.map((r) => r.length));
	return {
		data,
		warnings
	};
}
//#endregion
//#region src/core/parsers/sinf/sinf-normalizer.ts
/**
* SINF normalizer: transforms RawSinfData into InspectionFile.
*
* SINF is a die-level format (no individual defects), so:
* - defects[] is empty
* - dieMap[] contains the bin status of each die
* - waferGeometry is derived from die pitch and grid size
*/ var FNLOC_MAP = {
	U: "UP",
	D: "DOWN",
	L: "LEFT",
	R: "RIGHT"
};
function normalizeSinfData(input) {
	const { raw, fileName, fileSize, warnings } = input;
	const pitchX = raw.xdies || 5e3;
	const pitchY = raw.ydies || 5e3;
	const waferDiameter = Math.max(raw.colct * pitchX, raw.rowct * pitchY) * 1.15;
	const center = waferDiameter / 2;
	const source = {
		formatId: "sinf",
		formatVersion: "1.0",
		fileName,
		fileSize,
		parseTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
		warnings
	};
	const identity = {
		lotId: raw.lot,
		waferId: raw.wafer,
		deviceId: raw.device
	};
	const waferGeometry = {
		waferDiameter,
		diePitch: [pitchX, pitchY],
		dieOrigin: [0, 0],
		sampleCenterLocation: [center, center],
		orientationMarkType: "NOTCH",
		orientationMarkLocation: FNLOC_MAP[raw.fnloc] ?? "DOWN",
		sampleSizeRaw: [1, waferDiameter]
	};
	const inspectionSetup = { stationId: {
		vendor: "SINF",
		model: "WaferMap",
		equipmentId: ""
	} };
	const goodBins = new Set(raw.bcequ.map((b) => b.toUpperCase()));
	const dieMap = [];
	const binSet = /* @__PURE__ */ new Set();
	for (let row = 0; row < raw.rows.length; row++) for (let col = 0; col < raw.rows[row].length; col++) {
		const binCode = raw.rows[row][col].toUpperCase();
		if (binCode === "__" || binCode === "..") continue;
		const xIndex = col - Math.floor(raw.colct / 2);
		const yIndex = row - Math.floor(raw.rowct / 2);
		let status;
		if (binCode === "@@") status = "untested";
		else if (binCode === "FF") status = "reference";
		else if (goodBins.has(binCode)) status = "tested";
		else status = "failed";
		binSet.add(binCode);
		dieMap.push({
			xIndex,
			yIndex,
			status,
			binValue: parseInt(binCode, 16),
			defectCount: status === "failed" ? 1 : 0
		});
	}
	return {
		source,
		identity,
		waferGeometry,
		inspectionSetup,
		defects: [],
		defectSchema: [],
		dieMap,
		classLookup: Array.from(binSet).filter((b) => b !== "__" && b !== ".." && b !== "@@").sort().map((binCode, i) => ({
			classNumber: i + 1,
			className: goodBins.has(binCode) ? `Pass (${binCode})` : `Fail (${binCode})`,
			classCode: binCode
		})),
		summaries: [],
		summarySchema: [],
		testPlan: dieMap.map((d) => ({
			xIndex: d.xIndex,
			yIndex: d.yIndex
		}))
	};
}
//#endregion
//#region src/core/parsers/sinf/index.ts
/**
* SINF file format adapter.
*
* SINF (Simplified INF) is a die-level wafer map format containing
* bin codes per die position. No defect-level data.
*/ var SinfAdapter = class {
	descriptor = {
		id: "sinf",
		name: "SINF (Wafer Map)",
		extensions: ["sinf", "inf"],
		mimeTypes: ["text/plain"]
	};
	_meta = {
		fileName: "unknown.sinf",
		fileSize: 0
	};
	withMeta(meta) {
		this._meta = meta;
		return this;
	}
	probe(header) {
		const upper = header.toUpperCase();
		if (upper.includes("DEVICE:") && upper.includes("ROWCT:")) return .9;
		if (upper.includes("FNLOC:") && upper.includes("COLCT:")) return .85;
		if (upper.includes("BCEQU:")) return .7;
		return 0;
	}
	parse(text, onProgress) {
		try {
			onProgress?.({
				fraction: 0,
				phase: "Parsing SINF"
			});
			const { data: raw, warnings } = parseSinf(text);
			onProgress?.({
				fraction: .5,
				phase: "Normalizing"
			});
			if (!raw.lot && !raw.wafer && !raw.device) return {
				success: false,
				errors: [{
					code: "SINF_MISSING_IDENTITY",
					message: "SINF file is missing DEVICE, LOT, and WAFER headers.",
					severity: "error"
				}],
				warnings
			};
			const file = normalizeSinfData({
				raw,
				fileName: this._meta.fileName,
				fileSize: this._meta.fileSize || text.length,
				warnings
			});
			onProgress?.({
				fraction: 1,
				phase: "Done"
			});
			return {
				success: true,
				data: file,
				warnings
			};
		} catch (err) {
			return {
				success: false,
				errors: [{
					code: "SINF_PARSE_ERROR",
					message: `Error parsing SINF: ${err instanceof Error ? err.message : String(err)}`,
					severity: "error"
				}],
				warnings: []
			};
		}
	}
};
//#endregion
//#region src/core/parsers/index.ts
/** Initialize the registry with all built-in format adapters. */ function initializeRegistry() {
	const registry = ParserRegistry.getInstance();
	try {
		registry.register(new KlarfAdapter());
		registry.register(new SinfAdapter());
	} catch {}
	return registry;
}
//#endregion
export { SinfAdapter as n, KlarfAdapter as r, initializeRegistry as t };

//# sourceMappingURL=parsers-B1gH2h1h.js.map