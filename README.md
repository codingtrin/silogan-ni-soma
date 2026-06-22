# Silogan ni Soma

A one-page site for **Silogan ni Soma**, a Filipino–Japanese silog kitchen. Static HTML/CSS/JS — no build step.

## Features
- Hero section featuring an AI-generated photo of the signature dish.
- Six signature dishes in a card grid; **click any card (or the hero photo) to open a popup** with the full dish, image, and description.
- AI dish photography generated with [Kie.AI](https://kie.ai) (`nano-banana-2`).

## Project structure
```
index.html              # the site (self-contained)
images/                 # AI-generated dish photos
generate-images.mjs     # regenerates images/ from the dish list (needs KIE_API_KEY)
index.bundle.backup.html # original bundled source, kept for reference
```

## Regenerating the images
1. Copy `.env.example` to `.env` and set `KIE_API_KEY`.
2. Run `node generate-images.mjs`.

`.env` is git-ignored and is **never** shipped to the browser — the API key is only used at build time.

## Deploy
Static site — deploys to Vercel as-is (no framework, no build command).
