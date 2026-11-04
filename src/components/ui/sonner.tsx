import {
	IconAlertCircle,
	IconAlertTriangle,
	IconCheck,
	IconInfoCircle,
	IconLoader2,
} from "@tabler/icons-react";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
	return (
		<Sonner
			richColors
			closeButton
			expand
			position="bottom-right"
			theme="system"
			visibleToasts={4}
			gap={12}
			offset={{ bottom: "24px", right: "24px" }}
			mobileOffset={{ bottom: "16px", left: "16px", right: "16px" }}
			icons={{
				success: <IconCheck aria-hidden="true" />,
				info: <IconInfoCircle aria-hidden="true" />,
				warning: <IconAlertTriangle aria-hidden="true" />,
				error: <IconAlertCircle aria-hidden="true" />,
				loading: <IconLoader2 aria-hidden="true" className="animate-spin" />,
			}}
			toastOptions={{
				duration: 5000,
				classNames: {
					toast: "group/toast",
					title: "font-medium",
					description: "text-sm",
				},
			}}
		/>
	);
}
