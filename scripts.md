# Scripts

A running list of useful project commands. Run from the project root.

## Snapshot commands

```
npm run snapshot:dropmoney:append
npm run snapshot:stride:append
npm run snapshot:pryzm:append
npm run scrape:ux
npm run playwright:install
 $env:HEADFUL="1"; $env:DEBUG_SCRAPE="1"; npm run scrape:ux; $env:DEBUG_SCRAPE=""; $env:HEADFUL=""; Get-Content public\data\ux-lend-history.json -Raw
npm run scrape:shade:lend
npm run scrape:shade:borrow
  $env:HEADFUL="1"; $env:DEBUG_SCRAPE="1"; npm run scrape:shade:lend; npm run scrape:shade:borrow; $env:DEBUG_SCRAPE=""; $env:HEADFUL=""; Get-Content public\data\shade-lend-history.json -Raw; Get-Content public\data\shade-borrow-history.json -Raw
  npm run scrape:neptune
  $env:HEADFUL="1"; $env:DEBUG_SCRAPE="1"; npm run scrape:neptune; $env:DEBUG_SCRAPE=""; $env:HEADFUL="";
```

Add more scripts here as we go.

## Mintscan historical sync

```
MINTSCAN_API_KEY=xxxx npm run sync:charts
```

- Pulls bonded supply, bonded ratio, mint params, inflation and annual provisions from the Mintscan LCD proxy and appends a single data point for today into `public/data/historical/{staking-dynamics,apr,inflation,emission}.json`.
- Copy `.env.example` to `.env` and drop your Mintscan token in `MINTSCAN_API_KEY`. For ad-hoc runs you can also prefix the command as shown above.
- Requires Node.js 18+ (native `fetch`) or install `node-fetch` if you must run on an older runtime.
- Only five LCD calls (~5 credits) per run, so it is safe to execute from a daily cron/GitHub Action.
- The script logs a warning about the unbonding calendar because Mintscan has not documented an endpoint that exposes the global unbonding queue yet. Once that surface exists we can slot it into the same pipeline.
