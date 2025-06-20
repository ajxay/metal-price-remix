import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  InlineStack,
  Thumbnail,
  Badge,
  Link,
  IndexTable,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  const localProduct = await prisma.product.findUnique({
    where: { id: Number(id) },
  });

  if (!localProduct) {
    throw new Response("Product not found", { status: 404 });
  }

  const response = await admin.graphql(
    `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          status
          productType
          onlineStoreUrl
          featuredImage {
            url
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                sku
                price
              }
            }
          }
        }
      }`,
    {
      variables: {
        id: localProduct.shopifyId,
      },
    },
  );

  const { data } = await response.json();
  if (!data.product) {
    throw new Response("Product not found on Shopify", { status: 404 });
  }

  return json({ product: data.product });
}

export default function ProductDetailPage() {
  console.log("ProductDetailPage");
  const { product } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  console.log(product);
  if (navigation.state === "loading") {
    return (
      <SkeletonPage>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <SkeletonDisplayText size="large" />
                <SkeletonBodyText lines={2} />
              </BlockStack>
            </Card>
            <Card>
              <IndexTable
                itemCount={5}
                headings={[
                  { title: "Variant" },
                  { title: "Title" },
                  { title: "SKU" },
                  { title: "Price" },
                  { title: "Configuration" },
                ]}
                resourceName={{ singular: "variant", plural: "variants" }}
              >
                {[...Array(5)].map((_, i) => (
                  <IndexTable.Row id={String(i)} key={i} position={i}>
                    <IndexTable.Cell>
                      <SkeletonDisplayText size="small" />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <SkeletonDisplayText size="small" />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <SkeletonDisplayText size="small" />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <SkeletonDisplayText size="small" />
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <SkeletonDisplayText size="small" />
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            </Card>
          </Layout.Section>
        </Layout>
      </SkeletonPage>
    );
  }

  const resourceName = {
    singular: "variant",
    plural: "variants",
  };

  const rowMarkup = product.variants.edges.map(
    ({ node: variant }: { node: any }, index: number) => (
      <IndexTable.Row id={variant.id} key={variant.id} position={index}>
        <IndexTable.Cell>
          <Text as="span">{variant.id.split("/").pop()}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">{variant.title}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">{variant.sku}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">₹{variant.price}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone="attention">Pending</Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );
  return (
    <Page
      backAction={{ content: "Products", url: "/app/products" }}
      title={product.title}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <InlineStack gap="400" blockAlign="center">
              <Thumbnail
                source={product.featuredImage?.url}
                alt={product.title}
              />
              <div>
                <Text as="p">{product.id}</Text>
                <InlineStack gap="200">
                  <Badge
                    tone={product.status === "ACTIVE" ? "success" : undefined}
                  >
                    {product.status}
                  </Badge>
                  <Badge>{product.productType}</Badge>
                  <Badge>{`${product.variants.edges.length} Variants`}</Badge>
                </InlineStack>
              </div>
            </InlineStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={product.variants.edges.length}
              headings={[
                { title: "Variant" },
                { title: "Title" },
                { title: "SKU" },
                { title: "Shopify Price" },
                { title: "Configuration" },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <div style={{ textAlign: "center" }}>
            <Text as="p">
              Learn more about <Link url="#">configuring products</Link>
            </Text>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
