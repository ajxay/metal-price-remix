import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Link,
  Outlet,
  useLoaderData,
  useRouteError,
  useLocation,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { Page, Tabs } from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();

  const tabs = [
    {
      id: "dashboard",
      content: "Dashboard",
      url: "/app/dashboard",
      isSelected: location.pathname === "/app/dashboard",
    },
    {
      id: "products",
      content: "Products",
      url: "/app/products",
      isSelected: location.pathname === "/app/products",
    },
    {
      id: "settings",
      content: "Settings",
      url: "/app/settings",
      isSelected: location.pathname === "/app/settings",
    },
  ];

  const selectedTabIndex = tabs.findIndex((tab) => tab.isSelected);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app/dashboard" rel="home">
          Home
        </Link>
        <Link to="/app/additional">Additional page</Link>
        <Link to="/app/tex">test page</Link>
      </NavMenu>
      <Page>
        <Tabs tabs={tabs} selected={selectedTabIndex}>
          <Outlet />
        </Tabs>
      </Page>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
