import {
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { Badge } from "#/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import type { AuditEventDto } from "./audit.types";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, AuditEventDto>();
const columns = helper.columns([
	helper.accessor("createdAt", {
		header: "Time (UTC)",
		cell: ({ getValue }) => (
			<time
				dateTime={getValue()}
				className="whitespace-nowrap text-xs tabular-nums"
			>
				{getValue().replace("T", " ").slice(0, 19)}
			</time>
		),
	}),
	helper.accessor("action", {
		header: "Action",
		cell: ({ getValue }) => (
			<span className="font-mono text-xs">{getValue()}</span>
		),
	}),
	helper.accessor("actorLabel", {
		header: "Actor",
		cell: ({ row }) => (
			<div className="flex max-w-56 flex-col gap-1">
				<span className="break-words">{row.original.actorLabel}</span>
				<span className="text-xs text-muted-foreground">
					{row.original.actorKind === "user"
						? "User"
						: row.original.actorKind === "device"
							? "Device"
							: row.original.actorKind === "unknown"
								? "Unresolved actor"
								: "Unidentified"}
				</span>
				{row.original.actorId && (
					<span className="break-all font-mono text-xs text-muted-foreground">
						{row.original.actorId}
					</span>
				)}
			</div>
		),
	}),
	helper.accessor("resourceId", {
		header: "Resource ID",
		cell: ({ getValue }) => (
			<span className="break-all font-mono text-xs text-muted-foreground">
				{getValue() ?? "—"}
			</span>
		),
	}),
	helper.accessor("outcome", {
		header: "Outcome",
		cell: ({ getValue }) => (
			<Badge
				variant={
					getValue() === "success"
						? "success"
						: getValue() === "denied"
							? "destructive"
							: "secondary"
				}
			>
				{getValue()}
			</Badge>
		),
	}),
]);

export function AuditTable({ events }: { events: AuditEventDto[] }) {
	const table = useTable({
		features,
		columns,
		data: events,
		getRowId: (event) => event.id,
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
