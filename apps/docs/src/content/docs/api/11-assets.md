---
title: Assets API
description: File attachments and reference materials - Growth Phase Feature
---

# 📎 Assets API

## Overview

Assets allow attaching reference files, documents, images, and design files to projects for context and collaboration.

**Status:** 🚀 Growth Phase (Month 3-6)

---

## Planned Endpoints

- `asset.upload` - Upload asset file
- `asset.getById` - Get asset details
- `asset.getAll` - List project assets
- `asset.update` - Update asset metadata
- `asset.delete` - Delete asset
- `asset.download` - Download asset file
- `asset.createFolder` - Create asset folder
- `asset.move` - Move asset to folder

**Full documentation will be added in Growth phase.**

---

## Supported Asset Types

### Documents
- PDF, DOC, DOCX, TXT
- Design briefs, scripts, storyboards

### Images
- JPG, PNG, SVG, GIF
- Reference images, mockups, screenshots

### Design Files
- PSD, AI, SKETCH, FIGMA (links)
- Design assets and source files

### Other
- ZIP archives
- Custom file types (configurable)

---

## Features

- **Version control** - Track asset changes
- **Previews** - Thumbnail generation
- **Organization** - Folder structure
- **Search** - Full-text search in documents
- **Metadata** - Tags, descriptions, custom fields

---

## Related Documentation

- [Projects API](./03-projects)
- [Videos API](./04-videos)
