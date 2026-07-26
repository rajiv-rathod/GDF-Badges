# GDF licensed fonts

The site is wired for the official GDF typefaces. They are commercially
licensed, so the font files are NOT committed to this repo — drop your
licensed copies in this folder with exactly these names and they activate
automatically (no code changes):

- `Lastica.woff2` (and optionally `Lastica.woff`) — headings
- `TTInterphases-Regular.woff2` — body text
- `TTInterphases-Bold.woff2` — bold body text

Until the files exist, the open fallbacks (Space Grotesk / Inter) render
instead. Convert OTF/TTF to WOFF2 with any font converter or
`npx fonttools ttLib.woff2 compress <file>`.
