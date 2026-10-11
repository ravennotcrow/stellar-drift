# Sprite art

Drop image files here to replace the game's built-in vector art. Any format the
browser can draw works (`.png`, `.webp`, `.svg`); **use a transparent
background** so the art composits over the starfield.

## Wiring a sprite in

1. Put the file here, e.g. `assets/ship.png`.
2. Map it in `mobius.json` — destination name first, source file second:

   ```json
   "static_assets": {
     "ship.png": "assets/ship.png"
   }
   ```

3. Point `core/sprites.js` at the published name:

   ```js
   export const SPRITE_FILES = { ship: 'ship.png', ... }
   ```

Möbius copies declared files to the app's `static/` folder at build time and
serves them read-only at `/app-assets/stellar-drift/<destination>`; that is the
URL `sprites.js` loads.

## Notes

- Ship art should point **right** (+x), matching the ship's heading; the
  renderer rotates it.
- Nothing breaks if a file is missing — the renderer just keeps its vector
  version, so you can add art one sprite at a time.
- Keep each file small: the manifest caps static assets (see
  `STATIC_ASSET_MAX_BYTES` in the platform's `app_apply.py`).
- `icon.png` in the app root is the drawer/PWA icon; it is separate from this
  folder.
