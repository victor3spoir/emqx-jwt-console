import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
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

type AuthFormProps = {
	capabilities: {
		keycloak: boolean;
		password: boolean;
	};
	mode?: "sign-in" | "sign-up";
};

export function AuthForm({ capabilities, mode = "sign-in" }: AuthFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [visible, setVisible] = useState(false);
	const [keycloakPending, setKeycloakPending] = useState(false);
	const handleKeycloakSignIn = () => {
		setKeycloakPending(true);
		void authClient.signIn
			.social({
				provider: "keycloak",
				callbackURL: "/console",
			})
			.then((result) => {
				if (result.error) toast.error("Unable to start Keycloak sign-in.");
			})
			.catch(() => {
				toast.error("Unable to reach the authentication server.");
			})
			.finally(() => {
				setKeycloakPending(false);
			});
	};

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		validators: {
			onSubmit:
				mode === "sign-up"
					? z.object({
							name: z.string().trim().min(1).max(100),
							email: z.email().max(254),
							password: z.string().min(12).max(128),
						})
					: z.object({
							name: z.string(),
							email: z.email().max(254),
							password: z.string().min(1).max(128),
						}),
		},
		onSubmit: async ({ value }) => {
			try {
				const result =
					mode === "sign-up"
						? await authClient.signUp.email(value)
						: await authClient.signIn.email({
								email: value.email,
								password: value.password,
							});
				if (result.error) {
					toast.error(
						mode === "sign-up"
							? "Unable to create the account. Check the details or try again later."
							: "Unable to sign in. Check your credentials or try again later.",
					);
					return;
				}
				toast.success(
					mode === "sign-up"
						? "Account created successfully."
						: "Signed in successfully.",
				);
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
				<CardTitle>
					{mode === "sign-up" ? "Create account" : "Sign in"}
				</CardTitle>
				<CardDescription>
					{mode === "sign-up"
						? "Create a local development account."
						: "Manage your EMQX device fleet."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{mode === "sign-in" && (
					<Button
						type="button"
						className="w-full"
						disabled={!capabilities.keycloak || keycloakPending}
						onClick={handleKeycloakSignIn}
					>
						{keycloakPending ? "Redirecting…" : "Continue with Keycloak"}
					</Button>
				)}
				{mode === "sign-in" && !capabilities.keycloak && (
					<p className="mt-2 text-center text-xs text-muted-foreground">
						Keycloak is not configured in this environment.
					</p>
				)}
				{mode === "sign-in" &&
					capabilities.keycloak &&
					capabilities.password && (
						<div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
							<div className="h-px flex-1 bg-border" />
							<span>Development access</span>
							<div className="h-px flex-1 bg-border" />
						</div>
					)}
				{capabilities.password && (
					<form
						onSubmit={(event) => {
							event.preventDefault();
							void form.handleSubmit();
						}}
					>
						<FieldGroup>
							{(mode === "sign-up"
								? (["name", "email", "password"] as const)
								: (["email", "password"] as const)
							).map((name) => (
								<form.Field key={name} name={name}>
									{(field) => {
										const invalid = field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={invalid}>
												<FieldLabel htmlFor={name}>
													{name === "email"
														? "Email"
														: name === "password"
															? "Password"
															: "Name"}
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
															? mode === "sign-up"
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
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
													aria-invalid={invalid}
													aria-describedby={
														invalid ? `${name}-error` : undefined
													}
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
											: mode === "sign-up"
												? "Create account"
												: "Sign in"}
									</Button>
								)}
							</form.Subscribe>
						</FieldGroup>
					</form>
				)}
				{capabilities.password && (
					<p className="mt-5 text-center text-sm text-muted-foreground">
						{mode === "sign-up" ? "Already have an account?" : "New here?"}{" "}
						<Link
							to={mode === "sign-up" ? "/signin" : "/signup"}
							className="font-medium text-primary hover:underline"
						>
							{mode === "sign-up" ? "Sign in" : "Create an account"}
						</Link>
					</p>
				)}
			</CardContent>
		</Card>
	);
}
