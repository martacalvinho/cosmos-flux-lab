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
