import type { DeviceFileFormat } from "./device-files";

export function downloadDeviceFile(
	bytes: Uint8Array,
	filename: string,
	format: DeviceFileFormat,
) {
	const blob = new Blob([new Uint8Array(bytes)], {
		type:
			format === "csv"
				? "text/csv;charset=utf-8"
				: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${filename}.${format}`;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
