# Bible Knowledge Graph Static App

This is a Vercel-friendly static frontend for the Theographic Bible metadata.

The browser does not load the raw `json/` dataset. Instead, `scripts/precompute.js`
turns the raw data into small static query files under `public/data`.

## Run Locally

```bash
npm run precompute
npx serve public
```

Open the local URL printed by `serve`.

## Deploy To Vercel

Set the Vercel project root to `app`.

Vercel settings:

- Build command: `npm run build`
- Output directory: `public`
- Install command: `npm install`

## Static Query Layer

Generated files include:

- `public/data/index.json`
- `public/data/people-summary.json`
- `public/data/places-summary.json`
- `public/data/books-summary.json`
- `public/data/events-summary.json`
- `public/data/graph/person/*.json`
- `public/data/graph/place/*.json`
- `public/data/graph/book/*.json`

To add more detail pages, extend the featured slugs or generate one graph file per
entity in `scripts/precompute.js`.
