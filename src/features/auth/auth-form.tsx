import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [error, setError] = useState("");
	const [visible, setVisible] = useState(false);
	const signup = mode === "signup";

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		validators: {
			onSubmit: z.object({
				name: signup ? z.string().trim().min(1).max(100) : z.string(),
				email: z.email().max(254),
				password: z
					.string()
					.min(signup ? 12 : 1)
					.max(128),
			}),
		},
		onSubmit: async ({ value }) => {
			setError("");
			try {
				const result = signup
					? await authClient.signUp.email(value)
					: await authClient.signIn.email({
							email: value.email,
							password: value.password,
						});
				if (result.error) {
					setError(
						signup
							? "Unable to create your account. Check your details or try again later."
							: "Unable to sign in. Check your credentials or try again later.",
					);
					return;
				}
				queryClient.clear();
				await router.invalidate();
				await router.navigate({ to: "/console" });
			} catch {
				setError("Unable to reach the server. Please try again.");
			}
		},
	});
	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle>{signup ? "Create an account" : "Sign in"}</CardTitle>
				<CardDescription>
					{signup
						? "An administrator must grant access to the device console."
						: "Manage your EMQX device fleet."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
				>
					<FieldGroup>
						{error && (
							<Alert variant="destructive">
								<AlertDescription role="alert">{error}</AlertDescription>
							</Alert>
						)}
						{(
							[
								...(signup ? ["name" as const] : []),
								"email",
								"password",
							] as const
						).map((name) => (
							<form.Field key={name} name={name}>
								{(field) => {
									const invalid = field.state.meta.errors.length > 0;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={name}>
												{name === "name"
													? "Name"
													: name === "email"
														? "Email"
														: "Password"}
											</FieldLabel>
											<Input
												id={name}
												name={name}
												type={
													name === "password"
														? visible
															? "text"
															: "password"
														: name === "email"
															? "email"
															: "text"
												}
												autoComplete={
													name === "password"
														? signup
															? "new-password"
															: "current-password"
														: name
												}
												maxLength={
													name === "password"
														? 128
														: name === "email"
															? 254
															: 100
												}
												required
												minLength={
													name === "password" && signup ? 12 : undefined
												}
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
									{pending
										? "Please wait…"
										: signup
											? "Create account"
											: "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</FieldGroup>
				</form>
			</CardContent>
			<CardFooter>
				<Link
					className="text-sm text-primary underline underline-offset-4"
					to={signup ? "/signin" : "/signup"}
				>
					{signup ? "Already registered? Sign in" : "Create an account"}
				</Link>
			</CardFooter>
		</Card>
	);
}
