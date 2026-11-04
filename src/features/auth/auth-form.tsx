import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";

export function AuthForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [visible, setVisible] = useState(false);

	const form = useForm({
		defaultValues: { email: "", password: "" },
		validators: {
			onSubmit: z.object({
				email: z.email().max(254),
				password: z.string().min(1).max(128),
			}),
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await authClient.signIn.email(value);
				if (result.error) {
					toast.error(
						"Unable to sign in. Check your credentials or try again later.",
					);
					return;
				}
				toast.success("Signed in successfully.");
				queryClient.clear();
				await router.invalidate();
				await router.navigate({ to: "/console" });
			} catch {
				toast.error("Unable to reach the server. Please try again.");
			}
		},
	});
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>Sign in</CardTitle>
				<CardDescription>Manage your EMQX device fleet.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<FieldGroup>
						{(["email", "password"] as const).map((name) => (
							<form.Field key={name} name={name}>
								{(field) => {
									const invalid = field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={name}>
												{name === "email" ? "Email" : "Password"}
											</FieldLabel>
											<Input
												id={name}
												name={name}
												type={
													name === "password"
														? visible
															? "text"
															: "password"
														: "email"
												}
												autoComplete={
													name === "password" ? "current-password" : name
												}
												maxLength={name === "password" ? 128 : 254}
												required
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												aria-describedby={invalid ? `${name}-error` : undefined}
											/>
											{invalid && (
												<FieldError
													id={`${name}-error`}
													errors={field.state.meta.errors}
												/>
											)}
										</Field>
									);
								}}
							</form.Field>
						))}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							aria-pressed={visible}
							onClick={() => setVisible(!visible)}
						>
							{visible ? "Hide password" : "Show password"}
						</Button>
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(pending) => (
								<Button type="submit" disabled={pending}>
									{pending ? "Please wait…" : "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
