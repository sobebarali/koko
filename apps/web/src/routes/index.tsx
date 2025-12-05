import { IconBrandGithub, IconBrandX } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CheckCircle2,
	Folder,
	MessageSquare,
	Play,
	Shield,
	Upload,
	Users,
	Video,
	Zap,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { getAppUrl, isLandingDomain } from "@/lib/domain";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		// If on landing domain and user is authenticated, redirect to app domain
		if (isLandingDomain()) {
			const session = await authClient.getSession();
			if (session.data) {
				window.location.href = getAppUrl({ path: "/dashboard" });
			}
		}
	},
	component: LandingPage,
});

function LandingPage(): React.ReactElement {
	return (
		<div className="flex flex-col">
			{/* Header */}
			<LandingHeader />

			{/* Hero Section */}
			<HeroSection />

			{/* Features Section */}
			<FeaturesSection />

			{/* How It Works */}
			<HowItWorksSection />

			{/* Pricing Section */}
			<PricingSection />

			{/* CTA Section */}
			<CTASection />

			{/* Footer */}
			<Footer />
		</div>
	);
}

function LandingHeader(): React.ReactElement {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
			<div className="container mx-auto flex items-center justify-between px-4 py-3">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2">
					<Video className="size-6 text-primary" />
					<span className="font-bold text-xl">Koko</span>
				</Link>

				{/* Navigation */}
				<nav className="hidden items-center gap-6 md:flex">
					<a
						href="#features"
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						Features
					</a>
					<a
						href="#pricing"
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						Pricing
					</a>
				</nav>

				{/* Actions */}
				<div className="flex items-center gap-3">
					<ModeToggle />
					{isPending ? null : session ? (
						<Button size="sm" asChild>
							<Link to="/dashboard">Dashboard</Link>
						</Button>
					) : (
						<>
							<Button
								variant="ghost"
								size="sm"
								asChild
								className="hidden sm:flex"
							>
								<Link to="/login">Sign In</Link>
							</Button>
							<Button size="sm" asChild>
								<Link to="/login">Get Started</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</header>
	);
}

function HeroSection(): React.ReactElement {
	return (
		<section className="relative overflow-hidden">
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

			<div className="container relative mx-auto px-4 py-20 md:py-32">
				<div className="mx-auto max-w-4xl text-center">
					<Badge variant="secondary" className="mb-6">
						<Zap className="mr-1 size-3" />
						Now in Public Beta
					</Badge>

					<h1 className="mb-6 font-bold text-4xl tracking-tight md:text-6xl lg:text-7xl">
						Video collaboration
						<span className="block text-primary/80">made simple</span>
					</h1>

					<p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
						Review, collaborate, and manage video projects with real-time
						feedback. The modern platform for creative teams to deliver
						exceptional work, faster.
					</p>

					<Button size="lg" asChild>
						<Link to="/login">
							Get Started Free
							<ArrowRight className="ml-2 size-4" />
						</Link>
					</Button>

					<p className="mt-4 text-muted-foreground text-sm">
						No credit card required. Free forever for small teams.
					</p>
				</div>

				{/* Hero Image */}
				<div className="relative mx-auto mt-16 max-w-5xl">
					<div className="-inset-4 absolute rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl" />
					<div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl">
						<img
							src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1200&h=675&fit=crop&q=80"
							alt="Video editing workspace with multiple screens showing video timeline and collaboration tools"
							className="h-auto w-full"
							loading="eager"
						/>
						{/* Overlay UI mockup elements */}
						<div className="absolute right-4 bottom-4 left-4 flex items-center justify-between rounded-lg border bg-black/80 p-3 backdrop-blur-sm">
							<div className="flex items-center gap-3">
								<div className="flex size-8 items-center justify-center rounded-full bg-red-500">
									<Play className="size-4 text-white" fill="white" />
								</div>
								<div className="h-1 w-48 overflow-hidden rounded-full bg-white/20 md:w-96">
									<div className="h-full w-3/5 rounded-full bg-white" />
								</div>
								<span className="font-mono text-white text-xs">
									02:34 / 04:12
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Badge
									variant="outline"
									className="border-green-500/50 bg-green-500/10 text-green-400"
								>
									<MessageSquare className="mr-1 size-3" />3 comments
								</Badge>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function FeaturesSection(): React.ReactElement {
	const features = [
		{
			icon: MessageSquare,
			title: "Timecode Comments",
			description:
				"Leave precise feedback at exact moments in your videos. No more vague notes or timestamps in spreadsheets.",
			image:
				"https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&h=400&fit=crop&q=80",
		},
		{
			icon: Users,
			title: "Real-time Collaboration",
			description:
				"Work together with your team in real-time. See who's watching, commenting, and approving instantly.",
			image:
				"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop&q=80",
		},
		{
			icon: Folder,
			title: "Project Organization",
			description:
				"Keep all your video projects organized in one place. Folders, tags, and smart search make finding content easy.",
			image:
				"https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&h=400&fit=crop&q=80",
		},
		{
			icon: Upload,
			title: "Fast Uploads",
			description:
				"Upload videos of any size with resumable uploads. Support for all major formats including 4K and beyond.",
			image:
				"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80",
		},
		{
			icon: Shield,
			title: "Secure Sharing",
			description:
				"Share videos securely with password protection, expiring links, and granular access controls.",
			image:
				"https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop&q=80",
		},
		{
			icon: Zap,
			title: "Lightning Fast",
			description:
				"Powered by global CDN for instant playback. No buffering, no waiting. Just smooth video streaming.",
			image:
				"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&q=80",
		},
	];

	return (
		<section id="features" className="py-20 md:py-32">
			<div className="container mx-auto px-4">
				<div className="mx-auto mb-16 max-w-2xl text-center">
					<Badge variant="outline" className="mb-4">
						Features
					</Badge>
					<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
						Everything you need for video review
					</h2>
					<p className="text-lg text-muted-foreground">
						Professional-grade tools designed for creative teams who demand the
						best.
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => (
						<Card
							key={feature.title}
							className="group overflow-hidden transition-all hover:shadow-lg"
						>
							<div className="relative h-48 overflow-hidden">
								<img
									src={feature.image}
									alt={feature.title}
									className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
									loading="lazy"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/0" />
								<div className="absolute bottom-4 left-4 rounded-lg bg-primary p-2 text-primary-foreground">
									<feature.icon className="size-5" />
								</div>
							</div>
							<CardHeader>
								<CardTitle className="text-xl">{feature.title}</CardTitle>
								<CardDescription className="text-base">
									{feature.description}
								</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function HowItWorksSection(): React.ReactElement {
	const steps = [
		{
			step: "01",
			title: "Upload your video",
			description:
				"Drag and drop your video files or import from your favorite tools. We support all major formats.",
			icon: Upload,
		},
		{
			step: "02",
			title: "Invite your team",
			description:
				"Share a secure link with reviewers. They can watch and comment without creating an account.",
			icon: Users,
		},
		{
			step: "03",
			title: "Collect feedback",
			description:
				"Get precise, timecode-based comments. Resolve feedback and track progress to final approval.",
			icon: MessageSquare,
		},
	];

	return (
		<section className="bg-muted/30 py-20 md:py-32">
			<div className="container mx-auto px-4">
				<div className="mx-auto mb-16 max-w-2xl text-center">
					<Badge variant="outline" className="mb-4">
						How It Works
					</Badge>
					<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
						From upload to approval in minutes
					</h2>
					<p className="text-lg text-muted-foreground">
						A streamlined workflow that keeps your projects moving forward.
					</p>
				</div>

				<div className="relative mx-auto max-w-4xl">
					{/* Connection line */}
					<div className="-translate-x-1/2 absolute top-0 left-1/2 hidden h-full w-px bg-gradient-to-b from-primary/50 via-primary to-primary/50 md:block" />

					<div className="space-y-12 md:space-y-24">
						{steps.map((step, index) => (
							<div
								key={step.step}
								className={`flex flex-col items-center gap-8 md:flex-row ${
									index % 2 === 1 ? "md:flex-row-reverse" : ""
								}`}
							>
								<div className="flex-1 text-center md:text-left">
									<div className="mb-2 font-bold font-mono text-primary text-sm">
										Step {step.step}
									</div>
									<h3 className="mb-3 font-bold text-2xl">{step.title}</h3>
									<p className="text-lg text-muted-foreground">
										{step.description}
									</p>
								</div>

								<div className="relative z-10 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:size-20">
									<step.icon className="size-8 md:size-10" />
								</div>

								<div className="flex-1" />
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function PricingSection(): React.ReactElement {
	const plans = [
		{
			name: "Free",
			price: "$0",
			period: "forever",
			description: "Perfect for individuals and small projects",
			features: [
				"2 active projects",
				"5 videos per project",
				"10GB storage",
				"2 team members",
				"Basic commenting",
				"7-day version history",
			],
			cta: "Get Started",
			popular: false,
		},
		{
			name: "Pro",
			price: "$29",
			period: "per month",
			description: "For growing teams with more needs",
			features: [
				"Unlimited projects",
				"50 videos per project",
				"100GB storage",
				"10 team members",
				"Advanced commenting",
				"30-day version history",
				"Priority support",
				"Custom branding",
			],
			cta: "Start Free Trial",
			popular: true,
		},
		{
			name: "Team",
			price: "$99",
			period: "per month",
			description: "For professional teams and agencies",
			features: [
				"Unlimited projects",
				"200 videos per project",
				"500GB storage",
				"50 team members",
				"All Pro features",
				"90-day version history",
				"API access",
				"SSO integration",
				"Dedicated support",
			],
			cta: "Contact Sales",
			popular: false,
		},
	];

	return (
		<section id="pricing" className="bg-muted/30 py-20 md:py-32">
			<div className="container mx-auto px-4">
				<div className="mx-auto mb-16 max-w-2xl text-center">
					<Badge variant="outline" className="mb-4">
						Pricing
					</Badge>
					<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
						Simple, transparent pricing
					</h2>
					<p className="text-lg text-muted-foreground">
						Start free and scale as your team grows. No hidden fees.
					</p>
				</div>

				<div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
					{plans.map((plan) => (
						<Card
							key={plan.name}
							className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
						>
							{plan.popular && (
								<Badge className="-top-3 -translate-x-1/2 absolute left-1/2">
									Most Popular
								</Badge>
							)}
							<CardHeader className="text-center">
								<CardTitle className="text-2xl">{plan.name}</CardTitle>
								<div className="mt-4">
									<span className="font-bold text-4xl">{plan.price}</span>
									<span className="text-muted-foreground">/{plan.period}</span>
								</div>
								<CardDescription className="mt-2">
									{plan.description}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ul className="mb-6 space-y-3">
									{plan.features.map((feature) => (
										<li key={feature} className="flex items-center gap-2">
											<CheckCircle2 className="size-4 shrink-0 text-primary" />
											<span className="text-sm">{feature}</span>
										</li>
									))}
								</ul>
								<Button
									className="w-full"
									variant={plan.popular ? "default" : "outline"}
									asChild
								>
									<Link to="/login">{plan.cta}</Link>
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				<p className="mt-8 text-center text-muted-foreground text-sm">
					Need more?{" "}
					<span className="font-medium text-primary">Enterprise plans</span>{" "}
					available with unlimited everything, SLA, and white labeling.
				</p>
			</div>
		</section>
	);
}

function CTASection(): React.ReactElement {
	return (
		<section className="py-20 md:py-32">
			<div className="container mx-auto px-4">
				<div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8 md:p-16">
					<div className="relative z-10 mx-auto max-w-2xl text-center">
						<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
							Ready to streamline your video workflow?
						</h2>
						<p className="mb-8 text-lg text-muted-foreground">
							Join thousands of creative teams who are shipping better video
							content, faster.
						</p>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Button size="lg" asChild>
								<Link to="/login">
									Start Free Today
									<ArrowRight className="ml-2 size-4" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<a href="mailto:hello@koko.dev">Talk to Sales</a>
							</Button>
						</div>
					</div>

					{/* Decorative elements */}
					<div className="-right-20 -top-20 absolute size-64 rounded-full bg-primary/10 blur-3xl" />
					<div className="-bottom-20 -left-20 absolute size-64 rounded-full bg-primary/10 blur-3xl" />
				</div>
			</div>
		</section>
	);
}

function Footer(): React.ReactElement {
	return (
		<footer className="border-t bg-muted/30">
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
					{/* Brand */}
					<div className="flex items-center gap-2">
						<Video className="size-6 text-primary" />
						<span className="font-bold text-xl">Koko</span>
					</div>

					{/* Contact Emails */}
					<div className="flex flex-col items-center gap-2 text-sm md:flex-row md:gap-6">
						<a
							href="mailto:info@usekoko.com"
							className="text-muted-foreground transition-colors hover:text-foreground"
						>
							info@usekoko.com
						</a>
						<a
							href="mailto:support@usekoko.com"
							className="text-muted-foreground transition-colors hover:text-foreground"
						>
							support@usekoko.com
						</a>
					</div>

					{/* Social Links */}
					<div className="flex gap-4">
						<a
							href="https://github.com/koko/koko"
							className="text-muted-foreground transition-colors hover:text-foreground"
							target="_blank"
							rel="noopener noreferrer"
						>
							<IconBrandGithub className="size-5" />
						</a>
						<a
							href="https://twitter.com/koko"
							className="text-muted-foreground transition-colors hover:text-foreground"
							target="_blank"
							rel="noopener noreferrer"
						>
							<IconBrandX className="size-5" />
						</a>
					</div>
				</div>

				<Separator className="my-6" />

				<p className="text-center text-muted-foreground text-sm">
					&copy; {new Date().getFullYear()} Koko. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
