import {
	IconBan,
	IconCheck,
	IconKey,
	IconPencil,
	IconRefresh,
	IconTrash,
} from "@tabler/icons-react";
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
import type { DeviceDto } from "../devices.types";
import { DeviceAction } from "./device-action";
import { DeviceEditor } from "./device-editor";

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
		cell: ({ row }) => (
			<div className="flex items-center justify-end">
				<div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5 shadow-sm">
					<DeviceEditor device={row.original}>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={`Edit ${row.original.deviceId}`}
							title="Edit device"
						>
							<IconPencil />
						</Button>
					</DeviceEditor>
					<DeviceAction device={row.original} action="secret">
						<IconKey />
					</DeviceAction>
					<DeviceAction device={row.original} action="rotate">
						<IconRefresh />
					</DeviceAction>
					{row.original.status === "revoked" ? (
						<DeviceAction device={row.original} action="active">
							<IconCheck />
						</DeviceAction>
					) : (
						<DeviceAction
							device={row.original}
							action={row.original.status === "active" ? "disabled" : "active"}
						>
							{row.original.status === "active" ? <IconBan /> : <IconCheck />}
						</DeviceAction>
					)}
					<div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
					<DeviceAction device={row.original} action="delete">
						<IconTrash />
					</DeviceAction>
				</div>
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
		<Table className="table-fixed">
			<TableHeader className="bg-muted/45">
				{table.getHeaderGroups().map((group) => (
					<TableRow key={group.id}>
						{group.headers.map((header) => (
							<TableHead
								key={header.id}
								className={columnClassName(header.column.id)}
							>
								{!header.isPlaceholder && <table.FlexRender header={header} />}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{table.getRowModel().rows.map((row) => (
					<TableRow key={row.id} className="group">
						{row.getAllCells().map((cell) => (
							<TableCell
								key={cell.id}
								className={columnClassName(cell.column.id)}
							>
								<table.FlexRender cell={cell} />
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

function columnClassName(columnId: string) {
	switch (columnId) {
		case "deviceId":
			return "w-[34%] min-w-40";
		case "status":
			return "w-24";
		case "mqttUsername":
			return "hidden w-[24%] md:table-cell";
		case "productModel":
			return "hidden w-[22%] lg:table-cell";
		case "lastTokenIssuedAt":
			return "hidden w-40 xl:table-cell";
		case "actions":
			return "w-48 text-right";
		default:
			return undefined;
	}
}
