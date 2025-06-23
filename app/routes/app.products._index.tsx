import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useLoaderData,
  useFetcher,
  useRevalidator,
  useNavigate,
} from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Thumbnail,
  Text,
  Badge,
  Button,
  Spinner,
  Box,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const localProducts = await prisma.product.findMany({
    orderBy: { title: "asc" },
  });
  return json({ products: localProducts });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        products(first: 25) {
          edges {
            node {
              id
              title
              vendor
              status
              variants(first: 3) {
                edges {
                  node { id }
                }
              }
              featuredImage {
                url
              }
            }
          }
        }
      }`,
  );

  const { data } = await response.json();
  const shopifyProducts = data.products.edges;

  for (const { node: product } of shopifyProducts) {
    await prisma.product.upsert({
      where: { shopifyId: product.id },
      update: {
        title: product.title,
        vendor: product.vendor,
        status: product.status,
        featuredImageUrl: product.featuredImage?.url,
        variantsCount: product.variants.edges.length,
      },
      create: {
        shopifyId: product.id,
        title: product.title,
        vendor: product.vendor,
        status: product.status,
        featuredImageUrl: product.featuredImage?.url,
        variantsCount: product.variants.edges.length,
      },
    });
  }

  return json({ success: true });
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) {
      fetcher.submit(null, { method: "post" });
    }

    if (fetcher.state === "idle" && fetcher.data?.success) {
      revalidator.revalidate();
    }
  }, [fetcher, revalidator]);

  const isSyncing = fetcher.state !== "idle";

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row
      id={product.id.toString()}
      key={product.id}
      position={index}
      onClick={() => navigate(`/app/products/${product.id}`)}
    >
      <IndexTable.Cell>
        <Thumbnail
          source={product.featuredImageUrl || ""}
          alt={product.title}
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {product.title}
        </Text>
        <br />
        <Text as="span">Vendor: {product.vendor}</Text>
        <br />
        <Text as="span">{product.variantsCount} variants</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.status === "ACTIVE" ? "success" : undefined}>
          {product.status}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="attention">Pending</Badge>
      </IndexTable.Cell>
      {/* <Link to={`/app/products/${product.id}`} rel="home">
          View
        </Link> */}
      <IndexTable.Cell>
        <Button>Edit</Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Products"
      primaryAction={{
        content: "Search Products",
        onAction: () => console.log("Search clicked!"),
      }}
      secondaryActions={[
        {
          content: "Import",
          onAction: () => console.log("Import clicked!"),
        },
      ]}
    >
      <Card>
        {isSyncing && (
          <Box padding="400">
            <InlineStack gap="200" blockAlign="center">
              <Spinner size="small" />
              <Text as="span" variant="bodyMd">
                Loading products...
              </Text>
            </InlineStack>
          </Box>
        )}
        <div style={{ opacity: isSyncing ? 0.6 : 1 }}>
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            headings={[
              { title: "" },
              { title: "Product" },
              { title: "Status" },
              { title: "Configuration" },
              { title: "Actions" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </div>
      </Card>
    </Page>
  );
}
