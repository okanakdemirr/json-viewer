# json-viewer

Single-page dev tool with:

- **JSON viewer** — paste/upload, collapsible tree, lazy expansion, in-tree search (Ctrl/Cmd+F), inline image thumbnails with a keyboard-navigable lightbox gallery, raw view, copy/clear
- **Text comparer** — two-pane word-level diff
- **History sidebar** — last 10 entries per type, localStorage-backed

Zero-install for end users — the committed `app.js` is the pre-built bundle; open `index.html` in a browser and it works.

## Develop

Source lives in `src/` as ES modules. Build, lint, and test require Node.

```
npm install
npm run build     # bundles src/app.js → app.js (IIFE, esbuild)
npm run dev       # rebuild on save
npm test          # vitest (jsdom)
npm run lint
npm run format
```

After editing anything under `src/`, run `npm run build` and commit the regenerated `app.js` alongside your source change.

See `CLAUDE.md` for architecture notes and conventions.
