import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#/components/ui/empty";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { auditOutcome } from "#/features/audit/audit.types";
import { AuditTable } from "#/features/audit/audit-table";
import { orpc } from "#/orpc/client";

const searchSchema = z.object({
	search: z.string().trim().max(100).catch(""),
	outcome: auditOutcome.optional().catch(undefined),
	page: z.coerce.number().int().min(1).max(100000).catch(1),
});
export const Route = createFileRoute("/console/audit/")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => search,
	loader: ({ context, deps }) => {
		if (context.session.isAdmin)
			return context.queryClient.ensureQueryData(
				orpc.audit.list.queryOptions({ input: { ...deps, pageSize: 20 } }),
			);
	},
	pendingComponent: () => <output>Loading audit events…</output>,
	errorComponent: ({ reset }) => (
		<div className="flex flex-col items-start gap-4">
			<h1 className="font-heading text-2xl">Unable to load the audit log</h1>
			<p className="text-muted-foreground">
				Check your connection and administrator access.
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	),
	component: AuditPage,
});

function AuditPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data, refetch, isFetching, isRefetchError } = useSuspenseQuery(
		orpc.audit.list.queryOptions({ input: { ...search, pageSize: 20 } }),
	);
	const pages = Math.max(1, Math.ceil(data.total / 20));
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-heading text-2xl">Audit log</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Device changes, token requests and administrator setup. Newest
						first, times in UTC.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					disabled={isFetching}
					onClick={() => void refetch()}
				>
					{isFetching ? "Refreshing…" : "Refresh"}
				</Button>
			</div>
			{isRefetchError && (
				<Alert variant="destructive">
					<AlertDescription role="alert">
						Unable to refresh. Showing the previously loaded audit events; try
						Refresh again.
					</AlertDescription>
				</Alert>
			)}
			<form
				key={`${search.search}:${search.outcome}`}
				className="flex flex-wrap items-end gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					const values = new FormData(event.currentTarget);
					void navigate({
						search: {
							search: String(values.get("search") ?? ""),
							outcome: auditOutcome
								.optional()
								.parse(values.get("outcome") || undefined),
							page: 1,
						},
					});
				}}
			>
				<Field className="w-full sm:w-80">
					<FieldLabel htmlFor="audit-search">Search audit events</FieldLabel>
					<Input
						id="audit-search"
						name="search"
						type="search"
						maxLength={100}
						defaultValue={search.search}
						placeholder="Action, actor ID or resource ID"
					/>
				</Field>
				<Field className="w-40">
					<FieldLabel htmlFor="audit-outcome">Outcome</FieldLabel>
					<select
						id="audit-outcome"
						name="outcome"
						aria-label="Outcome"
						defaultValue={search.outcome ?? ""}
						className="h-8 rounded-md border border-input bg-surface-inset px-2 text-sm"
					>
						<option value="">All outcomes</option>
						<option value="success">Success</option>
						<option value="denied">Denied</option>
					</select>
				</Field>
				<Button variant="outline" type="submit">
					Apply filters
				</Button>
				{(search.search || search.outcome) && (
					<Button
						variant="ghost"
						type="button"
						onClick={() =>
							void navigate({
								search: { search: "", outcome: undefined, page: 1 },
							})
						}
					>
						Clear
					</Button>
				)}
			</form>
			<div className="overflow-hidden rounded-md border bg-card">
				{data.events.length ? (
					<AuditTable events={data.events} />
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>
								{search.search || search.outcome
									? "No matching audit events"
									: "No audit events yet"}
							</EmptyTitle>
							<EmptyDescription>
								{search.search || search.outcome
									? "Change or clear your filters to see other events."
									: "Device changes and token requests will appear here."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
			<footer className="flex flex-wrap items-center justify-between gap-3 text-sm">
				<p className="text-muted-foreground">
					{data.total} events · Page {search.page} of {pages}
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
