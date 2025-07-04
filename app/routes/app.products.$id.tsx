import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Layout,
  Text,
  BlockStack,
  Thumbnail,
  Badge,
  Link,
  IndexTable,
  SkeletonPage,
  SkeletonBodyText,
  SkeletonDisplayText,
  Icon,
  Button,
  Modal,
  FormLayout,
  TextField,
  Select,
  Toast,
  Frame,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ExternalIcon } from "@shopify/polaris-icons";
import React, { useState } from "react";

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
          handle
          title
          status
          productType
          onlineStoreUrl
          featuredMedia {
            mediaContentType
            alt
            preview {
              image {
                url
              }
            }
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

  // Fetch all configs for these variants
  const variantIds = data.product.variants.edges.map((v: any) => v.node.id);
  const configs = await prisma.variantConfig.findMany({
    where: { shopifyVariantId: { in: variantIds } },
  });
  const configMap = Object.fromEntries(
    configs.map((c) => [c.shopifyVariantId, true]),
  );

  return json({ product: data.product, configMap });
}

export default function ProductDetailPage() {
  const { product, configMap } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [formState, setFormState] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const configFetcher = useFetcher();
  const saveFetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);

  // When configFetcher loads, update form state
  React.useEffect(() => {
    if (
      configFetcher.data &&
      typeof configFetcher.data === "object" &&
      "config" in configFetcher.data &&
      configFetcher.data.config
    ) {
      setFormState({ ...configFetcher.data.config });
    } else if (modalOpen) {
      setFormState({ metalType: "Gold", goldPurity: "24K" });
    }
  }, [configFetcher.data, modalOpen]);

  React.useEffect(() => {
    if (saveFetcher.data && (saveFetcher.data as any).success) {
      setToastActive(true);
      setModalOpen(false);
    }
  }, [saveFetcher.data]);

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Metal Type validation
    if (!formState.metalType || String(formState.metalType).trim() === "") {
      errors.metalType = "Metal type is required";
    }

    // Gold Purity validation (only if metal type is Gold)
    if (formState.metalType?.toLowerCase() === "gold") {
      if (!formState.goldPurity || String(formState.goldPurity).trim() === "") {
        errors.goldPurity = "Gold purity is required when metal type is Gold";
      }
    }

    // Metal Weight validation
    if (!formState.metalWeight || String(formState.metalWeight).trim() === "") {
      errors.metalWeight = "Metal weight is required";
    } else {
      const weight = parseFloat(String(formState.metalWeight));
      if (isNaN(weight) || weight <= 0) {
        errors.metalWeight = "Metal weight must be a positive number";
      }
    }

    // Numeric field validations (all should be positive numbers if provided)
    const numericFields = [
      "diamondPrice",
      "moissanitePrice",
      "gemstonePrice",
      "makingCharges",
      "wastage",
      "miscCharges",
      "shippingCharges",
      "markup",
      "tax",
      "compareAtMargin",
    ];

    numericFields.forEach((field) => {
      const value = formState[field];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        const numValue = parseFloat(String(value));
        if (isNaN(numValue) || numValue < 0) {
          errors[field] =
            `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} must be a positive number`;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal and fetch config
  const handleRowClick = (variant: any) => {
    setSelectedVariant(variant);
    setModalOpen(true);
    setValidationErrors({});
    configFetcher.load(
      `/api/variant-config?variantId=${encodeURIComponent(variant.id)}`,
    );
  };

  // Form field handler
  const handleFieldChange = (field: string, value: string) => {
    setFormState((prev: any) => {
      if (field === "metalType" && value.toLowerCase() !== "gold") {
        return { ...prev, [field]: value, goldPurity: "" };
      }
      return { ...prev, [field]: value };
    });

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Save handler
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const formData = new FormData();
    formData.append("variantId", selectedVariant.id);
    [
      "metalType",
      "goldPurity",
      "metalWeight",
      "diamondPrice",
      "moissanitePrice",
      "gemstonePrice",
      "makingCharges",
      "wastage",
      "miscCharges",
      "shippingCharges",
      "markup",
      "tax",
      "compareAtMargin",
      "remarks",
    ].forEach((key) => {
      if (formState[key] !== undefined) formData.append(key, formState[key]);
    });
    saveFetcher.submit(formData, {
      method: "post",
      action: "/api/variant-config",
    });
  };

  const resourceName = {
    singular: "variant",
    plural: "variants",
  };

  const metalTypeOptions = [
    { label: "Gold", value: "Gold" },
    { label: "Silver", value: "Silver" },
    { label: "Platinum", value: "Platinum" },
    { label: "Palladium", value: "Palladium" },
  ];

  const goldPurityOptions = [
    { label: "24K (99.99%)", value: "24K" },
    { label: "22K (91.67%)", value: "22K" },
    { label: "18K (75%)", value: "18K" },
    { label: "14K (58.33%)", value: "14K" },
  ];

  const toastMarkup = toastActive ? (
    <Toast
      content="Variant configuration saved!"
      onDismiss={() => setToastActive(false)}
    />
  ) : null;

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

  const rowMarkup = product.variants.edges.map(
    ({ node: variant }: { node: any }, index: number) => (
      <IndexTable.Row
        id={variant.id}
        key={variant.id}
        position={index}
        onClick={() => handleRowClick(variant)}
      >
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
          {configMap[variant.id] ? (
            <Badge tone="success">Configured</Badge>
          ) : (
            <Badge tone="critical">Pending</Badge>
          )}
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Frame>
      <Page
        backAction={{ content: "Products", url: "/app/products" }}
        title={product.title}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <Thumbnail
                    source={product.featuredMedia?.preview?.image?.url}
                    alt={product.featuredMedia?.alt}
                    size="large"
                  />
                  <div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Text variant="headingMd" as="h2">
                        {product.title}
                      </Text>
                      <span style={{ color: "#6d7175", fontSize: 14 }}>
                        | {product.handle || product.id.split("/").pop()}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <Badge
                        tone={
                          product.status === "ACTIVE" ? "success" : undefined
                        }
                      >
                        {product.status}
                      </Badge>
                      <Badge>{product.productType}</Badge>
                      <Badge>{`${product.variants.edges.length} Variants`}</Badge>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {product.onlineStoreUrl && (
                    <a
                      href={product.onlineStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        textDecoration: "underline",
                        marginRight: 16,
                      }}
                    >
                      View on Online Store <Icon source={ExternalIcon} />
                    </a>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="secondary">Export</Button>
                    <Button variant="primary">Import</Button>
                  </div>
                </div>
              </div>
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
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Configure Variant"
          primaryAction={{
            content: saveFetcher.state === "submitting" ? "Saving..." : "Save",
            onAction: handleSave,
            loading: saveFetcher.state === "submitting",
          }}
        >
          <Modal.Section>
            <FormLayout>
              <Text variant="headingMd" as="h3">
                {selectedVariant?.id.split("/").pop()} |{" "}
                {selectedVariant?.title}
              </Text>
              <FormLayout.Group>
                <Select
                  label="Metal Type"
                  options={metalTypeOptions}
                  value={formState.metalType || ""}
                  onChange={(v) => handleFieldChange("metalType", v)}
                  requiredIndicator
                  error={validationErrors.metalType}
                />
                <Select
                  label="Gold Purity"
                  options={goldPurityOptions}
                  value={formState.goldPurity || ""}
                  onChange={(v) => handleFieldChange("goldPurity", v)}
                  requiredIndicator={
                    formState.metalType?.toLowerCase() === "gold"
                  }
                  disabled={formState.metalType?.toLowerCase() !== "gold"}
                  error={validationErrors.goldPurity}
                />
                <TextField
                  label="Metal Weight"
                  value={formState.metalWeight || ""}
                  onChange={(v) => handleFieldChange("metalWeight", v)}
                  suffix="Grams"
                  autoComplete="off"
                  requiredIndicator
                  error={validationErrors.metalWeight}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Diamond Price"
                  value={formState.diamondPrice || ""}
                  onChange={(v) => handleFieldChange("diamondPrice", v)}
                  suffix="INR"
                  autoComplete="off"
                  error={validationErrors.diamondPrice}
                />
                <TextField
                  label="Moissanite Price"
                  value={formState.moissanitePrice || ""}
                  onChange={(v) => handleFieldChange("moissanitePrice", v)}
                  suffix="INR"
                  autoComplete="off"
                  error={validationErrors.moissanitePrice}
                />
                <TextField
                  label="Gemstone Price"
                  value={formState.gemstonePrice || ""}
                  onChange={(v) => handleFieldChange("gemstonePrice", v)}
                  suffix="INR"
                  autoComplete="off"
                  error={validationErrors.gemstonePrice}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Making Charges"
                  value={formState.makingCharges || ""}
                  onChange={(v) => handleFieldChange("makingCharges", v)}
                  suffix="INR"
                  autoComplete="off"
                  error={validationErrors.makingCharges}
                />
                <TextField
                  label="Wastage"
                  value={formState.wastage || ""}
                  onChange={(v) => handleFieldChange("wastage", v)}
                  suffix="%"
                  autoComplete="off"
                  error={validationErrors.wastage}
                />
                <TextField
                  label="Misc. Charges"
                  value={formState.miscCharges || ""}
                  onChange={(v) => handleFieldChange("miscCharges", v)}
                  suffix="INR"
                  autoComplete="off"
                  error={validationErrors.miscCharges}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Shipping Charges"
                  value={formState.shippingCharges || ""}
                  onChange={(v) => handleFieldChange("shippingCharges", v)}
                  suffix="%"
                  autoComplete="off"
                  error={validationErrors.shippingCharges}
                />
                <TextField
                  label="Markup"
                  value={formState.markup || ""}
                  onChange={(v) => handleFieldChange("markup", v)}
                  suffix="%"
                  autoComplete="off"
                  error={validationErrors.markup}
                />
                <TextField
                  label="Tax"
                  value={formState.tax || ""}
                  onChange={(v) => handleFieldChange("tax", v)}
                  suffix="%"
                  autoComplete="off"
                  error={validationErrors.tax}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Compare At Price Margin"
                  value={formState.compareAtMargin || ""}
                  onChange={(v) => handleFieldChange("compareAtMargin", v)}
                  suffix="%"
                  autoComplete="off"
                  error={validationErrors.compareAtMargin}
                />
                <TextField
                  label="Remarks"
                  value={formState.remarks || ""}
                  onChange={(v) => handleFieldChange("remarks", v)}
                  autoComplete="off"
                />
              </FormLayout.Group>
            </FormLayout>
          </Modal.Section>
        </Modal>
      </Page>
      {toastMarkup}
    </Frame>
  );
}
