import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AlertCircle, CheckCircle, Loader2, Mail } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth/verify-email")({
	component: VerifyEmailPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			token: (search.token as string) || "",
		};
	},
});

function VerifyEmailPage() {
	const { token } = useSearch({ from: "/auth/verify-email" });
	const { verifyEmail, isVerifying, isSuccess, error } = useVerifyEmail();

	useEffect(() => {
		if (token) {
			verifyEmail(token);
		}
	}, [token, verifyEmail]);

	// No token provided
	if (!token) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<AlertCircle className="mx-auto h-16 w-16 text-red-500" />
					<h1 className="mt-4 font-bold text-2xl">Invalid Verification Link</h1>
					<p className="mt-2 text-muted-foreground">
						This verification link is invalid. Please check your email for the
						correct link.
					</p>
					<Link to="/login">
						<Button className="mt-6">Go to Sign In</Button>
					</Link>
				</div>
			</div>
		);
	}

	// Verifying
	if (isVerifying) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
					<h1 className="mt-4 font-bold text-2xl">Verifying Your Email</h1>
					<p className="mt-2 text-muted-foreground">
						Please wait while we verify your email address...
					</p>
				</div>
			</div>
		);
	}

	// Success
	if (isSuccess) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<CheckCircle className="mx-auto h-16 w-16 text-green-500" />
					<h1 className="mt-4 font-bold text-2xl">Email Verified!</h1>
					<p className="mt-2 text-muted-foreground">
						Your email has been successfully verified. You can now sign in to
						your account.
					</p>
					<Link to="/login">
						<Button className="mt-6">Sign In</Button>
					</Link>
				</div>
			</div>
		);
	}

	// Error
	if (error) {
		return (
			<div className="mx-auto mt-10 w-full max-w-md p-6">
				<div className="text-center">
					<AlertCircle className="mx-auto h-16 w-16 text-red-500" />
					<h1 className="mt-4 font-bold text-2xl">Verification Failed</h1>
					<p className="mt-2 text-muted-foreground">
						{error.message ||
							"This verification link is invalid or has expired."}
					</p>
					<div className="mt-6 space-x-4">
						<Link to="/login">
							<Button variant="outline">Go to Sign In</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	// Initial state (should not reach here normally)
	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<div className="text-center">
				<Mail className="mx-auto h-16 w-16 text-muted-foreground" />
				<h1 className="mt-4 font-bold text-2xl">Email Verification</h1>
				<p className="mt-2 text-muted-foreground">Processing your request...</p>
			</div>
		</div>
	);
}
