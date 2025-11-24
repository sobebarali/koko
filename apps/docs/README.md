# Koko Documentation

This is the official documentation site for Koko, built with [Astro Starlight](https://starlight.astro.build/).

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

## 🚀 Quick Start

### Development

```bash
# From the repository root
bun run dev:docs

# Or from this directory
cd apps/docs
bun run dev
```

Visit http://localhost:4321 to see the documentation site.

### Building

```bash
# Build the documentation
bun run build

# Preview the built site
bun run preview
```

## 📁 Project Structure

```
apps/docs/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── houston.webp
│   ├── content/
│   │   └── docs/
│   │       ├── index.mdx          # Homepage
│   │       └── api/               # API documentation
│   │           ├── 00-overview.md
│   │           ├── 01-authentication.md
│   │           ├── 02-users.md
│   │           └── ...
│   ├── styles/
│   │   └── custom.css             # Custom styling
│   └── content.config.ts          # Content collections config
├── astro.config.mjs               # Astro configuration
└── package.json
```

## 📝 Writing Documentation

### Adding New Pages

1. Create a new `.md` or `.mdx` file in `src/content/docs/`
2. Add frontmatter:

```markdown
---
title: Page Title
description: Brief description of the page
---

# Your Content Here
```

3. The page will automatically appear in the sidebar based on the directory structure

### Frontmatter Options

```yaml
---
title: Required - Page title
description: Required - Page description for SEO
sidebar:
  label: Optional - Custom sidebar label
  order: Optional - Custom sort order
  badge:
    text: Optional - Badge text (e.g., "New", "Beta")
    variant: Optional - Badge style (note, tip, caution, danger)
---
```

### Using Components

Starlight provides built-in components:

```mdx
import { Card, CardGrid } from '@astrojs/starlight/components';

<CardGrid>
  <Card title="Card Title" icon="star">
    Card content goes here
  </Card>
</CardGrid>
```

Available components:
- `Card` / `CardGrid` - Display cards in a grid
- `Tabs` / `TabItem` - Tabbed content
- `Aside` - Callout boxes (note, tip, caution, danger)
- `Code` - Syntax-highlighted code blocks
- `FileTree` - Display file structure

### Code Blocks

````markdown
```typescript
// Code with syntax highlighting
const greeting = "Hello, Koko!";
```

```typescript title="example.ts" {2-3}
// With title and line highlighting
const greeting = "Hello, Koko!";
const name = "World";
console.log(`${greeting} ${name}`);
```
````

## 🎨 Customization

### Styling

Edit `src/styles/custom.css` to customize the appearance:

```css
:root {
  --sl-color-accent: #6366f1;
  /* Add your custom CSS variables */
}
```

### Configuration

Edit `astro.config.mjs` to customize:

```javascript
starlight({
  title: 'Koko Docs',
  sidebar: [
    {
      label: 'Section Name',
      autogenerate: { directory: 'section-folder' },
    },
  ],
  customCss: ['./src/styles/custom.css'],
})
```

## 🔍 Features

- ✅ **Full-text search** - Built-in search powered by Pagefind
- ✅ **Dark mode** - Automatic theme switching
- ✅ **Mobile responsive** - Optimized for all screen sizes
- ✅ **Auto-generated sidebar** - Based on file structure
- ✅ **SEO optimized** - Automatic sitemap and meta tags
- ✅ **Syntax highlighting** - Beautiful code blocks with Shiki
- ✅ **Table of contents** - Auto-generated for each page

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun dev`                 | Starts local dev server at `localhost:4321`      |
| `bun build`               | Build your production site to `./dist/`          |
| `bun preview`             | Preview your build locally, before deploying     |
| `bun astro ...`           | Run CLI commands like `astro add`, `astro check` |
| `bun astro -- --help`     | Get help using the Astro CLI                     |

## 🐛 Troubleshooting

### Build fails with zod errors

The docs package uses zod v3 (pinned) for compatibility with Astro Starlight, while the rest of the monorepo uses zod v4. This is intentional and required for proper functionality.

### Pages not showing in sidebar

Make sure your markdown files:
1. Have proper frontmatter with `title` and `description`
2. Are located in `src/content/docs/`
3. Have `.md` or `.mdx` extension

### Custom CSS not applying

1. Ensure the CSS file is in `src/styles/`
2. Check that it's referenced in `astro.config.mjs` under `customCss`
3. Restart the dev server after config changes

## 📚 Resources

- [Astro Starlight Docs](https://starlight.astro.build/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Astro Documentation](https://docs.astro.build/)
- [Koko Project Architecture](../../.ruler/project_architecture.md)
