# ChildCare (Little Nest) — static version

A static HTML export of the ChildCare WordPress theme demo site (Little Nest). All pages, styles,
scripts, fonts and images are plain files in `docs/` (served by GitHub Pages), so it can be hosted anywhere.

- Source theme: https://github.com/Shashankphatkure/childcare-wp-theme
- Re-export from a running WordPress site:
  `node tools/export.mjs http://localhost:10076 /childcare-static/ docs`
  (the second argument is the URL path the site is served from).

Forms show a notice instead of sending, because a static site has no server.

## Deployments

- Vercel: https://childcare-static.vercel.app (built from `vercel-site/`, exported with base `/`)
- GitHub Pages: https://shashankphatkure.github.io/childcare-static/ (built from `docs/`, base `/childcare-static/`)

Redeploy to Vercel: `cd vercel-site && npx vercel deploy --prod --yes --project childcare-static`
