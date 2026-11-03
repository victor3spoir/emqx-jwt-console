import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { themeFromCookie } from "./theme.types";

export const getTheme = createIsomorphicFn()
	.server(() => themeFromCookie(getRequestHeaders().get("cookie") ?? ""))
	.client(() => themeFromCookie(document.cookie));
