import assert from "node:assert/strict";
import { test } from "node:test";
import * as XLSX from "xlsx";
import { createDeviceFile, createDeviceTemplate, parseDeviceFile } from "../src/features/devices/device-files";
import { MAX_DEVICE_FILE_BYTES, MAX_IMPORT_ROWS, importDevicesInput } from "../src/features/devices/device-transfer.types";
import type { DeviceDto } from "../src/features/devices/devices.types";

const device: DeviceDto & { secret: string } = {
  id: "00000000-0000-4000-8000-000000000001", deviceId: "0000123", serialNumber: "0000456",
  mqttUsername: "0000123", status: "disabled", firmwareVersion: "01.02", productModel: 'Sensor, "été"\nsecond line',
  secret: 'factory-"secret"-\\-123', createdAt: "2026-11-04T00:00:00.000Z", lastTokenIssuedAt: null, revokedAt: null,
};

for (const format of ["csv", "xlsx"] as const) {
  test(`${format}: export and re-import preserve identifiers, Unicode, quoting, secrets and status`, () => {
    const preview = parseDeviceFile(createDeviceFile([device], format, true), `devices.${format}`);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(preview.rows[0], {
      deviceId: device.deviceId, serialNumber: device.serialNumber, mqttUsername: device.mqttUsername,
      firmwareVersion: device.firmwareVersion, productModel: device.productModel, status: device.status, secret: device.secret,
    });
    const publicPreview = parseDeviceFile(createDeviceFile([device], format), `devices.${format}`);
    assert.equal(publicPreview.rows[0].secret, undefined);
    assert.deepEqual(parseDeviceFile(createDeviceTemplate(format), `template.${format}`).errors, []);
  });
}

test("CSV exports escape formula-like cells without corrupting a subsequent import", () => {
  for (const serialNumber of ["=HYPERLINK(\"https://example.test\")", "+123", "-123", "@SUM(1)", "  =1+1", "'=1+1"]) {
    const bytes = createDeviceFile([{ ...device, serialNumber }], "csv");
    const csv = new TextDecoder().decode(bytes);
    assert.ok(csv.includes(`"'`));
    assert.equal(parseDeviceFile(bytes, "devices.csv").rows[0].serialNumber, serialNumber.trim());
  }
  const bytes = createDeviceFile([{ ...device, productModel: "=1+1" }], "xlsx");
  const book = XLSX.read(bytes, { type: "array" });
  assert.equal(book.Sheets.Devices.D2.t, "s");
  assert.equal(book.Sheets.Devices.D2.f, undefined);
});

test("import reports row errors and duplicate identities without accepting privilege fields", () => {
  const csv = new TextEncoder().encode("device_id,serial_number,status\nfirst,one,active\nfirst,two,active\n");
  assert.match(parseDeviceFile(csv, "devices.csv").errors.join(" "), /Duplicate deviceId/);
  const invalid = new TextEncoder().encode("device_id,serial_number,status\nbad id,one,unknown\n");
  assert.match(parseDeviceFile(invalid, "devices.csv").errors.join(" "), /Row 2/);
  assert.throws(() => parseDeviceFile(new TextEncoder().encode("device_id,serial_number,role\na,b,admin"), "devices.csv"), /Unknown/);
  const row = { deviceId: "a", serialNumber: "b", mqttUsername: "a", productModel: null, firmwareVersion: null };
  assert.ok(!importDevicesInput.safeParse({ rows: [{ ...row, role: "admin" }] }).success);
  assert.ok(!importDevicesInput.safeParse({ rows: Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => row) }).success);
});

test("files are bounded, required headers enforced, and XLSX formulas rejected", () => {
  assert.throws(() => parseDeviceFile(new Uint8Array(MAX_DEVICE_FILE_BYTES + 1), "huge.csv"), /2 MB/);
  assert.throws(() => parseDeviceFile(new TextEncoder().encode("wrong,headers\na,b"), "devices.csv"), /Required columns/);
  assert.throws(() => parseDeviceFile(new Uint8Array(), "devices.xls"), /CSV or XLSX/);
  const rows = ["device_id,serial_number", ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => `device-${index},serial-${index}`)];
  assert.throws(() => parseDeviceFile(new TextEncoder().encode(rows.join("\n")), "huge.csv"), /at most/);
  const sheet = XLSX.utils.aoa_to_sheet([["device_id", "serial_number"], ["sensor", "serial"]]);
  sheet.B2 = { t: "s", f: '"serial"', v: "serial" };
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Devices");
  assert.match(parseDeviceFile(new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" })), "devices.xlsx").errors.join(" "), /formulas/);
});
