import {
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { DeviceAction } from "./device-action";
import { DeviceEditor } from "./device-editor";
import type { DeviceDto } from "./devices.types";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, DeviceDto>();
const columns = helper.columns([
	helper.accessor("deviceId", {
		header: "Device",
		cell: ({ row }) => (
			<div className="flex flex-col gap-1">
				<span className="font-medium">{row.original.deviceId}</span>
				<span className="text-xs text-muted-foreground">
					{row.original.serialNumber}
				</span>
			</div>
		),
	}),
	helper.accessor("status", {
		header: "Status",
		cell: ({ getValue }) => (
			<Badge
				variant={
					getValue() === "active"
						? "success"
						: getValue() === "revoked"
							? "destructive"
							: "secondary"
				}
			>
				{getValue()}
			</Badge>
		),
	}),
	helper.accessor("mqttUsername", {
		header: "MQTT username",
		cell: ({ getValue }) => (
			<span className="font-mono text-xs">{getValue()}</span>
		),
	}),
	helper.accessor("productModel", {
		header: "Model / firmware",
		cell: ({ row }) => (
			<div>
				{row.original.productModel ?? "—"}
				<div className="text-xs text-muted-foreground">
					{row.original.firmwareVersion ?? "—"}
				</div>
			</div>
		),
	}),
	helper.accessor("lastTokenIssuedAt", {
		header: "Last token (UTC)",
		cell: ({ getValue }) => (
			<span className="text-xs text-muted-foreground">
				{getValue()?.replace("T", " ").slice(0, 19) ?? "Never"}
			</span>
		),
	}),
	helper.display({
		id: "actions",
		header: "Actions",
		cell: ({ row }) =>
			row.original.status === "revoked" ? (
				<DeviceAction device={row.original} action="active" />
			) : (
				<div className="flex flex-wrap gap-2">
					<DeviceEditor device={row.original}>
						<Button variant="outline" size="sm">
							Edit
						</Button>
					</DeviceEditor>
					<DeviceAction
						device={row.original}
						action={row.original.status === "active" ? "disabled" : "active"}
					/>
					<DeviceAction device={row.original} action="rotate" />
					<DeviceAction device={row.original} action="revoked" />
				</div>
			),
	}),
]);
export function DevicesTable({ devices }: { devices: DeviceDto[] }) {
	const table = useTable({
		features,
		columns,
		data: devices,
		getRowId: (row) => row.id,
	});
	return (
		<Table>
			<TableHeader>
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id}>
						{group.headers.map((header) => (
							<TableHead key={header.id}>
								{!header.isPlaceholder && <table.FlexRender header={header} />}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow key={row.id}>
						{row.getAllCells().map((cell) => (
							<TableCell key={cell.id}>
								<table.FlexRender cell={cell} />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
