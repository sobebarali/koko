// @ts-check

import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	site: "https://docs.koko.dev",
	integrations: [
		starlight({
			title: "Koko Docs",
			description:
				"Complete developer documentation for Koko - a modern video collaboration platform built with tRPC, Drizzle ORM, and React 19.",
			logo: {
				src: "./src/assets/houston.webp",
			},
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/koko/koko",
				},
			],
			editLink: {
				baseUrl: "https://github.com/koko/koko/edit/main/apps/docs/",
			},
			head: [
				{
					tag: "meta",
					attrs: {
						property: "og:image",
						content: "https://docs.koko.dev/og-image.png",
					},
				},
			],
			sidebar: [
				{
					label: "Getting Started",
					items: [{ label: "Introduction", slug: "index" }],
				},
				{
					label: "API Reference",
					autogenerate: { directory: "api" },
				},
			],
			components: {
				// Override default components if needed
			},
			expressiveCode: {
				themes: ["github-dark", "github-light"],
				styleOverrides: {
					borderRadius: "0.75rem",
					borderWidth: "1px",
				},
			},
			lastUpdated: true,
			pagination: true,
			tableOfContents: {
				minHeadingLevel: 2,
				maxHeadingLevel: 4,
			},
		}),
	],
});
