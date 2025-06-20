import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // A shop name is required to login, redirect to the app's login page if missing
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return redirect("/app");
  }

  return await login(request);
};
