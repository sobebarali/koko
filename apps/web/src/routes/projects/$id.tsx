import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id")({
	component: ProjectLayout,
});

function ProjectLayout() {
	return <Outlet />;
}
