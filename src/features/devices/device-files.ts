import * as XLSX from "xlsx";
import {
	type ImportDeviceRow,
	importDeviceRow,
	importDevicesInput,
	MAX_DEVICE_FILE_BYTES,
	MAX_IMPORT_ROWS,
} from "./device-transfer.types";
import type { DeviceDto } from "./devices.types";

export type DeviceFileFormat = "csv" | "xlsx";
export const deviceFileHeaders = [
	"device_id",
	"serial_number",
	"mqtt_username",
	"product_model",
	"firmware_version",
	"status",
	"secret",
] as const;
const dateHeaders = ["created_at", "last_token_issued_at", "revoked_at"];
export type DeviceFilePreview = {
	rows: ImportDeviceRow[];
	errors: string[];
	total: number;
};
function formulaLike(value: string) {
	const first = Array.from(value).find(
		(character) => character.charCodeAt(0) > 31 && character.trim() !== "",
	);
	return first !== undefined && "=+@-".includes(first);
}

// CSV has no cell type. Escape formula-like values before opening them in Excel.
function escapeCsv(value: string) {
	return formulaLike(value) || value.startsWith("'") ? `'${value}` : value;
}
function unescapeCsv(value: string) {
	return value.startsWith("'") &&
		(formulaLike(value.slice(1)) || value.startsWith("''"))
		? value.slice(1)
		: value;
}

export function parseDeviceFile(
	bytes: Uint8Array,
	filename: string,
): DeviceFilePreview {
	if (bytes.byteLength > MAX_DEVICE_FILE_BYTES)
		throw new Error("Choose a file no larger than 2 MB.");
	const extension = filename.split(".").pop()?.toLowerCase();
	if (extension !== "csv" && extension !== "xlsx")
		throw new Error("Choose a CSV or XLSX file.");
	const workbook = XLSX.read(
		extension === "csv"
			? new TextDecoder("utf-8", { fatal: true }).decode(bytes)
			: bytes,
		{
			type: extension === "csv" ? "string" : "array",
			raw: true,
			cellFormula: true,
			sheetRows: MAX_IMPORT_ROWS + 2,
			sheets: 0,
			cellHTML: false,
			cellStyles: false,
		},
	);
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!sheet?.["!ref"]) throw new Error("The first worksheet is empty.");
	const range = XLSX.utils.decode_range(sheet["!ref"]);
	if (range.s.r !== 0 || range.s.c !== 0)
		throw new Error(
			"Place column headers in the first row, starting at cell A1.",
		);
	if (range.e.c > 30)
		throw new Error(
			"The worksheet has too many columns. Use the device template.",
		);
	const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
		header: 1,
		raw: false,
		defval: "",
		blankrows: true,
	});
	const header =
		matrix[0]?.map((value) =>
			String(value)
				.replace(/^\uFEFF/, "")
				.trim()
				.toLowerCase(),
		) ?? [];
	if (!header.includes("device_id") || !header.includes("serial_number")) {
		throw new Error(
			"Required columns: device_id and serial_number. Download a template to get started.",
		);
	}
	const recognized = new Set<string>([...deviceFileHeaders, ...dateHeaders]);
	for (const name of header) {
		if (!name || !recognized.has(name))
			throw new Error(
				`Unknown or empty column: ${name || "(blank)"}. Use the device template.`,
			);
		if (header.indexOf(name) !== header.lastIndexOf(name))
			throw new Error(`Duplicate column: ${name}.`);
	}
	const errors: string[] = [];
	const rows: ImportDeviceRow[] = [];
	const dataRows = matrix
		.slice(1)
		.map((cells, index) => ({ cells, row: index + 2 }))
		.filter(({ cells }) => cells.some((value) => value !== ""));
	if (!dataRows.length) throw new Error("The file has no devices to import.");
	if (
		dataRows.length > MAX_IMPORT_ROWS ||
		(sheet["!fullref"] &&
			XLSX.utils.decode_range(sheet["!fullref"]).e.r > MAX_IMPORT_ROWS)
	) {
		throw new Error(`Import at most ${MAX_IMPORT_ROWS} devices per file.`);
	}
	for (const { cells, row } of dataRows) {
		if (cells.length > header.length) {
			errors.push(`Row ${row}: more values than column headers.`);
			continue;
		}
		let formula = false;
		for (let column = 0; column < header.length; column++) {
			if (sheet[XLSX.utils.encode_cell({ r: row - 1, c: column })]?.f)
				formula = true;
		}
		if (formula) {
			errors.push(
				`Row ${row}: formulas are not supported. Replace them with plain values.`,
			);
			continue;
		}
		const values = Object.fromEntries(
			header.map((name, index) => [
				name,
				extension === "csv"
					? unescapeCsv(String(cells[index] ?? ""))
					: String(cells[index] ?? ""),
			]),
		);
		const result = importDeviceRow.safeParse({
			deviceId: values.device_id,
			serialNumber: values.serial_number,
			mqttUsername: values.mqtt_username || values.device_id,
			productModel: values.product_model || null,
			firmwareVersion: values.firmware_version || null,
			status: values.status || "active",
			secret: values.secret || undefined,
		});
		if (!result.success) {
			errors.push(
				...result.error.issues.map(
					(issue) => `Row ${row}, ${issue.path.join(".")}: ${issue.message}`,
				),
			);
		} else rows.push(result.data);
	}
	// Also reject identities duplicated within the file before any API call.
	if (!errors.length) {
		const validation = importDevicesInput.safeParse({ rows });
		if (!validation.success)
			errors.push(
				...validation.error.issues.map(
					(issue) =>
						`Row ${Number(issue.path[1]) + 2}, ${String(issue.path[2] ?? "file")}: ${issue.message}`,
				),
			);
	}
	return { rows, errors, total: dataRows.length };
}

export function createDeviceFile(
	devices: Array<DeviceDto & { secret?: string }>,
	format: DeviceFileFormat,
	includeSecrets = false,
): Uint8Array {
	const headers: string[] = [
		...deviceFileHeaders.filter(
			(header) => includeSecrets || header !== "secret",
		),
		...dateHeaders,
	];
	const values = devices.map((device) => {
		const row: Record<string, string> = {
			device_id: device.deviceId,
			serial_number: device.serialNumber,
			mqtt_username: device.mqttUsername,
			product_model: device.productModel ?? "",
			firmware_version: device.firmwareVersion ?? "",
			status: device.status,
			secret: device.secret ?? "",
			created_at: device.createdAt,
			last_token_issued_at: device.lastTokenIssuedAt ?? "",
			revoked_at: device.revokedAt ?? "",
		};
		return headers.map((header) => row[header]);
	});
	return writeDeviceFile([headers, ...values], format);
}

export function createDeviceTemplate(format: DeviceFileFormat): Uint8Array {
	return writeDeviceFile(
		[
			[...deviceFileHeaders],
			["sensor-001", "serial-001", "sensor-001", "", "", "active", ""],
		],
		format,
	);
}

function writeDeviceFile(
	rows: string[][],
	format: DeviceFileFormat,
): Uint8Array {
	const sheet = XLSX.utils.aoa_to_sheet(
		format === "csv" ? rows.map((row) => row.map(escapeCsv)) : rows,
	);
	if (format === "csv")
		return new TextEncoder().encode(
			`\uFEFF${XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\r\n", forceQuotes: true })}`,
		);
	sheet["!cols"] = rows[0].map(() => ({ wch: 24 }));
	sheet["!autofilter"] = {
		ref: XLSX.utils.encode_range({
			s: { r: 0, c: 0 },
			e: { r: Math.max(0, rows.length - 1), c: rows[0].length - 1 },
		}),
	};
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, "Devices");
	return new Uint8Array(
		XLSX.write(workbook, {
			type: "array",
			bookType: "xlsx",
			compression: true,
		}),
	);
}
