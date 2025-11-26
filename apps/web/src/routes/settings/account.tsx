import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { ChangePasswordForm } from "@/components/change-password-form";
import Loader from "@/components/loader";
import { ProfileForm } from "@/components/profile-form";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings/account")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				throw: true,
			});
		}
		return { session };
	},
});

function RouteComponent(): React.ReactElement {
	const { session } = Route.useRouteContext();
	const { profile, isLoading, error } = useProfile();
	const { updateProfile, isUpdating } = useUpdateProfile();

	// User data for sidebar
	const userData = {
		name: session.data?.user.name || "User",
		email: session.data?.user.email || "user@example.com",
		avatar:
			session.data?.user.image ||
			`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.data?.user.name || "User"}`,
	};

	if (isLoading) {
		return (
			<SidebarProvider>
				<AppSidebar user={userData} />
				<SidebarInset>
					<div className="flex min-h-screen items-center justify-center">
						<Loader />
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	if (error || !profile) {
		return (
			<SidebarProvider>
				<AppSidebar user={userData} />
				<SidebarInset>
					<div className="flex min-h-screen items-center justify-center">
						<p className="text-red-500">Failed to load profile</p>
					</div>
				</SidebarInset>
			</SidebarProvider>
		);
	}

	return (
		<SidebarProvider>
			<AppSidebar user={userData} />
			<SidebarInset>
				<div className="@container/main flex min-h-screen flex-col">
					{/* Header with sidebar trigger */}
					<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="flex h-16 items-center gap-2 px-4 lg:px-6">
							<SidebarTrigger className="-ml-1" />
							<Separator orientation="vertical" className="mr-2 h-4" />
							<div className="flex-1">
								<h1 className="font-bold text-xl tracking-tight lg:text-2xl">
									Account Settings
								</h1>
								<p className="text-muted-foreground text-sm">
									Manage your profile and account preferences
								</p>
							</div>
						</div>
					</header>

					{/* Main Content */}
					<div className="flex-1 p-4 pb-8 lg:p-6">
						<div className="mx-auto max-w-2xl space-y-8">
							<ProfileForm
								initialData={{
									name: profile.name,
									email: profile.email,
									image: profile.image,
									bio: profile.bio,
									title: profile.title,
									company: profile.company,
									location: profile.location,
									website: profile.website,
								}}
								onSubmit={updateProfile}
								isSubmitting={isUpdating}
							/>

							<Separator />

							<ChangePasswordForm />
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
