# dhruvpatel-site

Personal and professional site for Dhruv Patel: https://darup67.github.io/dhruvpatel-site/

Plain HTML, CSS and a little JavaScript. No build step, no trackers, and visitors' browsers make no third-party requests.

## Live GitHub sections

`.github/workflows/site.yml` runs every 6 hours, on every push, and on demand (Actions → *Sync GitHub activity and deploy* → Run workflow):

1. `scripts/sync-github.mjs` reads the owner's **public** repositories (forks, archived and year-old repos excluded) and the latest
   non-automated commit of each, into `data/github.json`. Only public data is visible to it, so private repos can never appear.
2. If anything changed, it commits `data/github.json`.
3. It deploys the site to GitHub Pages.

The page then fills in "updated X ago" and the latest change on each project card, enables the *Recently updated* sort,
renders the **Activity** feed (new public repos show up there automatically) and keeps the repo count current.
Without the data file the page still works; those parts just stay static.

To feature a new repo as a card, add an `<article class="proj" data-repo="repo-name" data-cat="...">` to `index.html`.

```
index.html                     content
style.css                      light/dark themes, responsive layout
script.js                      theme, menu, filters, sort, copy-email, GitHub data
scripts/sync-github.mjs        GitHub activity sync (runs in Actions)
.github/workflows/site.yml     sync + deploy
data/github.json               synced activity
assets/, resume/               photo and resume PDF
```
