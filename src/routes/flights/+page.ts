import { redirect } from '@sveltejs/kit';

// Old deep links to /flights land on the search page.
export function load({ url }) {
  redirect(307, `/${url.search}`);
}
