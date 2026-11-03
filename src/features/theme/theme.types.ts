export type Theme = "dark" | "light";
export const themeCookieName = "emqx-console-theme";

export function themeFromCookie(cookie: string): Theme {
	const value = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${themeCookieName}=`))
		?.slice(themeCookieName.length + 1);
	return value === "light" ? "light" : "dark";
}
