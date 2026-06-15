# Editing the purses (prices & sold status)

All purse info lives in **one file: `purses.json`**. Edit it there, run one command, push.
The homepage grid, the homepage featured purse, and the 3D Atelier all rebuild from it —
no more editing the same purse in two places.

## To mark a purse SOLD
1. Open `purses.json`, find the purse, change its `"status"` to `"Sold"`:
   ```json
   {"img":"_NZ86657.jpg","title":"Beyond This Point There Be Dragons","detail":"Hand-Beaded Purse","status":"Sold"}
   ```
2. Rebuild and publish:
   ```bash
   node build-purses.js
   git add -A && git commit -m "Mark <purse name> as sold" && git push
   ```
   Vercel auto-deploys in under a minute.

## To change a price
Same steps — just set `"status"` to the new price, e.g. `"status":"$900"`.
(Any value other than `"Sold"` is shown as the price exactly as typed, so include the `$`.)

## To add a new purse
Add a line to `purses.json` (copy an existing one), put the photo file in this folder,
set its `"img"` to the filename, then run `node build-purses.js` and push.

## Fields
- `img` — photo filename in this folder
- `title` — purse name
- `detail` — e.g. `Hand-Beaded Purse` or `Hand-Beaded Purse with Semi-Precious Stones`
- `status` — `Sold`, or a price like `$850`
- `featured` (one purse only) — `true` makes it the big highlighted purse on the homepage
- `blurb` (featured only) — the descriptive sentence under the featured purse

> Don't hand-edit the purse cards in `index.html` / `atelier-3d.html` — they're regenerated
> by `node build-purses.js` and your edits there would be overwritten. Edit `purses.json`.
