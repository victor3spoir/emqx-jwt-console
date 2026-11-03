import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { DeviceEditor } from "#/features/devices/device-editor";
import { deviceStatus } from "#/features/devices/devices.types";
import { DevicesTable } from "#/features/devices/devices-table";
import { orpc } from "#/orpc/client";

const searchSchema = z.object({
	search: z.string().max(100).catch(""),
	status: deviceStatus.optional().catch(undefined),
	page: z.coerce.number().int().min(1).max(100000).catch(1),
});
export const Route = createFileRoute("/console/devices/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		if (context.session.isAdmin)
			return context.queryClient.ensureQueryData(
				orpc.devices.list.queryOptions({ input: { ...deps, pageSize: 20 } }),
			);
	},
	pendingComponent: () => <output>Loading devices…</output>,
	errorComponent: ({ reset }) => (
		<div className="flex flex-col items-start gap-4">
			<h1 className="font-heading text-2xl">Unable to load devices</h1>
			<p className="text-muted-foreground">
				Check your connection and administrator access.
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	),
	component: DevicesPage,
});
function DevicesPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data } = useSuspenseQuery(
		orpc.devices.list.queryOptions({ input: { ...search, pageSize: 20 } }),
	);
	const pages = Math.max(1, Math.ceil(data.total / 20));
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-heading text-2xl">Devices</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage provisioning and token access for your fleet.
					</p>
				</div>
				<DeviceEditor>
					<Button>Register device</Button>
				</DeviceEditor>
			</div>
			<form
				key={`${search.search}:${search.status}`}
				className="flex flex-wrap items-end gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					const data = new FormData(event.currentTarget);
					void navigate({
						search: {
							search: String(data.get("search") ?? ""),
							status: deviceStatus
								.optional()
								.parse(data.get("status") || undefined),
							page: 1,
						},
					});
				}}
			>
				<Field className="w-full sm:w-64">
					<FieldLabel htmlFor="search">Search devices</FieldLabel>
					<Input
						id="search"
						name="search"
						type="search"
						maxLength={100}
						defaultValue={search.search}
						placeholder="ID, serial number, username or model"
					/>
				</Field>
				<Field className="w-40">
					<FieldLabel htmlFor="status">Status</FieldLabel>
					<select
						id="status"
						aria-label="Status"
						name="status"
						defaultValue={search.status ?? ""}
						className="h-8 rounded-md border border-input bg-surface-inset px-2 text-sm"
					>
						<option value="">All statuses</option>
						<option value="active">Active</option>
						<option value="disabled">Disabled</option>
						<option value="revoked">Revoked</option>
					</select>
				</Field>
				<Button variant="outline" type="submit">
					Apply filters
				</Button>
				{(search.search || search.status) && (
					<Button
						variant="ghost"
						type="button"
						onClick={() =>
							void navigate({
								search: { search: "", status: undefined, page: 1 },
							})
						}
					>
						Clear
					</Button>
				)}
			</form>
			<div className="overflow-hidden rounded-md border bg-card">
				{data.devices.length ? (
					<DevicesTable devices={data.devices} />
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>
								{search.search || search.status
									? "No matching devices"
									: "Your fleet starts here"}
							</EmptyTitle>
							<EmptyDescription>
								{search.search || search.status
									? "Change or clear your filters to see more devices."
									: "Register your first device to generate its provisioning secret."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
			<footer className="flex flex-wrap items-center justify-between gap-3 text-sm">
				<p className="text-muted-foreground">
					{data.total} devices · Page {search.page} of {pages}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={search.page <= 1}
						onClick={() =>
							void navigate({ search: { ...search, page: search.page - 1 } })
						}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						disabled={search.page >= pages}
						onClick={() =>
							void navigate({ search: { ...search, page: search.page + 1 } })
						}
					>
						Next
					</Button>
				</div>
			</footer>
		</div>
	);
}
