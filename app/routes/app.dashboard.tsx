import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Text,
  Card,
  Button,
  FormLayout,
  TextField,
  Banner,
} from "@shopify/polaris";
// import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const metalTypes = [
    { metal: "Gold", karat: "24K", key: "gold24k" },
    { metal: "Gold", karat: "22K", key: "gold22k" },
    { metal: "Gold", karat: "18K", key: "gold18k" },
    { metal: "Gold", karat: "14K", key: "gold14k" },
    { metal: "Silver", karat: null, key: "silver" },
    { metal: "Platinum", karat: null, key: "platinum" },
    { metal: "Palladium", karat: null, key: "palladium" },
  ];

  const latestPrices = await Promise.all(
    metalTypes.map(async (type) => {
      const price = await prisma.metalPrice.findFirst({
        where: { metal: type.metal, karat: type.karat },
        orderBy: { createdAt: "desc" },
      });
      return { [type.key]: price?.price.toString() || "" };
    }),
  );

  const initialPrices = Object.assign({}, ...latestPrices);

  return json({ initialPrices });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const metalPrices = {
    gold24k: formData.get("gold24k") as string,
    gold22k: formData.get("gold22k") as string,
    gold18k: formData.get("gold18k") as string,
    gold14k: formData.get("gold14k") as string,
    silver: formData.get("silver") as string,
    platinum: formData.get("platinum") as string,
    palladium: formData.get("palladium") as string,
  };

  // Save each metal price to the database
  const pricesToSave = [
    {
      metal: "Gold",
      karat: "24K",
      price: parseFloat(metalPrices.gold24k) || 0,
    },
    {
      metal: "Gold",
      karat: "22K",
      price: parseFloat(metalPrices.gold22k) || 0,
    },
    {
      metal: "Gold",
      karat: "18K",
      price: parseFloat(metalPrices.gold18k) || 0,
    },
    {
      metal: "Gold",
      karat: "14K",
      price: parseFloat(metalPrices.gold14k) || 0,
    },
    {
      metal: "Silver",
      karat: null,
      price: parseFloat(metalPrices.silver) || 0,
    },
    {
      metal: "Platinum",
      karat: null,
      price: parseFloat(metalPrices.platinum) || 0,
    },
    {
      metal: "Palladium",
      karat: null,
      price: parseFloat(metalPrices.palladium) || 0,
    },
  ];

  try {
    // Save metal prices
    for (const priceData of pricesToSave) {
      if (priceData.price > 0) {
        await prisma.metalPrice.create({
          data: {
            metal: priceData.metal,
            karat: priceData.karat,
            price: priceData.price,
            currency: "INR",
          },
        });
      }
    }

    // Get the active formula
    const activeFormula = await prisma.formula.findFirst({
      where: { isActive: true },
    });

    if (!activeFormula) {
      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: "Metal prices saved successfully!",
        warning: "No active formula found for price calculation.",
      };
    }

    // Get all configured variants
    const variantConfigs = await prisma.variantConfig.findMany();

    if (variantConfigs.length === 0) {
      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: "Metal prices saved successfully!",
        warning: "No configured variants found for price calculation.",
      };
    }

    // Get latest metal prices for calculation
    const metalTypes = [
      { metal: "Gold", karat: "24K", key: "gold24k" },
      { metal: "Gold", karat: "22K", key: "gold22k" },
      { metal: "Gold", karat: "18K", key: "gold18k" },
      { metal: "Gold", karat: "14K", key: "gold14k" },
      { metal: "Silver", karat: null, key: "silver" },
      { metal: "Platinum", karat: null, key: "platinum" },
      { metal: "Palladium", karat: null, key: "palladium" },
    ];

    const latestMetalPrices: any = {};
    for (const type of metalTypes) {
      const price = await prisma.metalPrice.findFirst({
        where: { metal: type.metal, karat: type.karat },
        orderBy: { createdAt: "desc" },
      });
      latestMetalPrices[type.key] = price?.price || 0;
    }

    // Calculate prices for all variants
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each variant
    for (const config of variantConfigs) {
      try {
        // Calculate new price
        const calculatedPrice = calculatePrice(
          config,
          latestMetalPrices,
          activeFormula.value,
        );

        if (calculatedPrice <= 0) {
          results.failed++;
          results.errors.push(
            `Invalid calculated price for variant ${config.shopifyVariantId}: ${calculatedPrice}`,
          );
          continue;
        }

        // Get variant details to find product ID
        const variantResponse = await admin.graphql(
          `#graphql
            query getVariant($id: ID!) {
              productVariant(id: $id) {
                id
                product {
                  id
                }
              }
            }`,
          {
            variables: {
              id: config.shopifyVariantId,
            },
          },
        );

        const variantData = await variantResponse.json();
        const productId = variantData.data.productVariant.product.id;

        // Update price in Shopify
        const response = await admin.graphql(
          `#graphql
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                productVariants {
                  id
                  price
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              productId: productId,
              variants: [
                {
                  id: config.shopifyVariantId,
                  price: calculatedPrice.toString(),
                },
              ],
            },
          },
        );

        const { data } = await response.json();

        if (data.productVariantsBulkUpdate.userErrors.length > 0) {
          results.failed++;
          results.errors.push(
            `Shopify error for variant ${config.shopifyVariantId}: ${data.productVariantsBulkUpdate.userErrors[0].message}`,
          );
          continue;
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error processing variant ${config.shopifyVariantId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      message: "Metal prices saved and product prices updated successfully!",
      results,
      formulaUsed: activeFormula.value,
      totalProcessed: variantConfigs.length,
    };
  } catch (error) {
    console.error("Error saving metal prices:", error);
    return { success: false, error: "Failed to save metal prices" };
  }
};

// Import the calculatePrice function from the API route
const calculatePrice = (config: any, metalPrices: any, formulaType: string) => {
  const {
    metalType,
    goldPurity,
    metalWeight = 0,
    diamondPrice = 0,
    moissanitePrice = 0,
    gemstonePrice = 0,
    makingCharges = 0,
    wastage = 0,
    miscCharges = 0,
    shippingCharges = 0,
    markup = 0,
    tax = 0,
  } = config;

  // Get metal price based on type and purity
  let metalPricePerGram = 0;
  if (metalType?.toLowerCase() === "gold") {
    switch (goldPurity) {
      case "24K":
        metalPricePerGram = metalPrices.gold24k || 0;
        break;
      case "22K":
        metalPricePerGram = metalPrices.gold22k || 0;
        break;
      case "18K":
        metalPricePerGram = metalPrices.gold18k || 0;
        break;
      case "14K":
        metalPricePerGram = metalPrices.gold14k || 0;
        break;
    }
  } else if (metalType?.toLowerCase() === "silver") {
    metalPricePerGram = metalPrices.silver || 0;
  } else if (metalType?.toLowerCase() === "platinum") {
    metalPricePerGram = metalPrices.platinum || 0;
  } else if (metalType?.toLowerCase() === "palladium") {
    metalPricePerGram = metalPrices.palladium || 0;
  }

  const metalCost = metalPricePerGram * metalWeight;

  // Calculate based on formula type
  let calculatedPrice = 0;

  switch (formulaType) {
    case "1":
      calculatedPrice =
        metalCost + diamondPrice + moissanitePrice + gemstonePrice;
      calculatedPrice += calculatedPrice * (makingCharges / 100);
      calculatedPrice += calculatedPrice * (wastage / 100);
      calculatedPrice += calculatedPrice * (shippingCharges / 100);
      calculatedPrice += miscCharges;
      calculatedPrice += calculatedPrice * (markup / 100);
      calculatedPrice += calculatedPrice * (tax / 100);
      break;

    case "2":
      calculatedPrice = metalCost;
      calculatedPrice += calculatedPrice * (makingCharges / 100);
      calculatedPrice += calculatedPrice * (wastage / 100);
      calculatedPrice += diamondPrice + moissanitePrice + gemstonePrice;
      calculatedPrice += calculatedPrice * (shippingCharges / 100);
      calculatedPrice += miscCharges;
      calculatedPrice += calculatedPrice * (markup / 100);
      calculatedPrice += calculatedPrice * (tax / 100);
      break;

    case "3":
      calculatedPrice = metalCost;
      calculatedPrice += calculatedPrice * (wastage / 100);
      calculatedPrice += makingCharges;
      calculatedPrice += diamondPrice + moissanitePrice + gemstonePrice;
      calculatedPrice += calculatedPrice * (shippingCharges / 100);
      calculatedPrice += miscCharges;
      calculatedPrice += calculatedPrice * (markup / 100);
      calculatedPrice += calculatedPrice * (tax / 100);
      break;

    case "4":
      calculatedPrice = metalCost;
      calculatedPrice += calculatedPrice * (wastage / 100);
      calculatedPrice += makingCharges * metalWeight;
      calculatedPrice += diamondPrice + moissanitePrice + gemstonePrice;
      calculatedPrice += calculatedPrice * (shippingCharges / 100);
      calculatedPrice += miscCharges;
      calculatedPrice += calculatedPrice * (markup / 100);
      calculatedPrice += calculatedPrice * (tax / 100);
      break;

    default:
      calculatedPrice =
        metalCost + diamondPrice + moissanitePrice + gemstonePrice;
  }

  return Math.round(calculatedPrice);
};

export default function Dashboard() {
  const { initialPrices } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [metalPrices, setMetalPrices] = useState(initialPrices);

  const isSubmitting = fetcher.state === "submitting";
  const lastUpdated = (fetcher.data as any)?.timestamp
    ? new Date((fetcher.data as any).timestamp).toLocaleString()
    : null;
  const isSuccess = fetcher.data?.success;
  const results = (fetcher.data as any)?.results;
  const warning = (fetcher.data as any)?.warning;
  const formulaUsed = (fetcher.data as any)?.formulaUsed;
  const totalProcessed = (fetcher.data as any)?.totalProcessed;

  useEffect(() => {
    if (isSuccess) {
      // Form was successfully submitted, no need to reset fields
    }
  }, [isSuccess]);

  const handleSubmit = () => {
    const formData = new FormData();
    Object.entries(metalPrices).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
    fetcher.submit(formData, { method: "POST" });
    console.log(fetcher.data, "fetcher.data");
  };

  return (
    <Page title="Live Gold Price Editor">
      <div style={{ marginBottom: "20px" }}>
        {isSuccess && (
          <Banner
            title="Success"
            tone="success"
            onDismiss={() => (fetcher.data = undefined)}
          >
            <p>
              The product prices were last updated on {lastUpdated}.
              {results && (
                <span>
                  {" "}
                  Successfully updated {results.success} out of {totalProcessed}{" "}
                  variants using Formula {formulaUsed}.
                  {results.failed > 0 &&
                    ` ${results.failed} variants failed to update.`}
                </span>
              )}
            </p>
            {warning && (
              <p style={{ marginTop: "8px", fontWeight: "bold" }}>
                ⚠️ {warning}
              </p>
            )}
            {results && results.errors && results.errors.length > 0 && (
              <details style={{ marginTop: "8px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  View Errors ({results.errors.length})
                </summary>
                <ul style={{ marginTop: "8px", marginLeft: "20px" }}>
                  {results.errors.map((error: string, index: number) => (
                    <li
                      key={index}
                      style={{ fontSize: "14px", marginBottom: "4px" }}
                    >
                      {error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Banner>
        )}

        <Banner title="Upgrade to Advanced" tone="info">
          <p>
            Upgrade to the Advanced plan to update the product prices
            automatically based on market prices at regular intervals.
          </p>
        </Banner>
      </div>

      <Card>
        <Text variant="headingMd" as="h2">
          METAL PRICES
        </Text>
        <div style={{ marginTop: 8 }}>
          <Text as="p">
            Enter the latest metal prices to calculate and update the product
            prices. Click "Refresh Prices" to save metal prices and
            automatically update all configured product variants.
          </Text>
        </div>
        <div style={{ marginTop: "20px" }}>
          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="Gold Price 24K / Gram"
                type="number"
                value={metalPrices.gold24k}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, gold24k: value })
                }
                suffix="INR"
                autoComplete="off"
              />
              <TextField
                autoComplete="off"
                label="Gold Price 22K / Gram"
                type="number"
                value={metalPrices.gold22k}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, gold22k: value })
                }
                suffix="INR"
              />
              <TextField
                label="Gold Price 18K / Gram"
                type="number"
                value={metalPrices.gold18k}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, gold18k: value })
                }
                suffix="INR"
                autoComplete="off"
              />
            </FormLayout.Group>

            <FormLayout.Group>
              <TextField
                label="Gold Price 14K / Gram"
                type="number"
                autoComplete="off"
                value={metalPrices.gold14k}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, gold14k: value })
                }
                suffix="INR"
              />
              <TextField
                label="Silver Price / Gram"
                type="number"
                value={metalPrices.silver}
                autoComplete="off"
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, silver: value })
                }
                suffix="INR"
              />
              <TextField
                autoComplete="off"
                label="Platinum Price / Gram"
                type="number"
                value={metalPrices.platinum}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, platinum: value })
                }
                suffix="INR"
              />
            </FormLayout.Group>

            <FormLayout.Group>
              <TextField
                label="Palladium Price / Gram"
                type="number"
                value={metalPrices.palladium}
                onChange={(value) =>
                  setMetalPrices({ ...metalPrices, palladium: value })
                }
                suffix="INR"
                autoComplete="off"
              />
            </FormLayout.Group>

            <Button onClick={handleSubmit} loading={isSubmitting}>
              {isSubmitting ? "Updating Prices..." : "Refresh Prices"}
            </Button>
          </FormLayout>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Text variant="bodyMd" as="p">
            Learn more about{" "}
            <a href="#" style={{ textDecoration: "underline" }}>
              updating product prices
            </a>
          </Text>
        </div>
      </Card>
    </Page>
  );
}
