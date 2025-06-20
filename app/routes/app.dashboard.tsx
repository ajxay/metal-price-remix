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
  await authenticate.admin(request);

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

    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error("Error saving metal prices:", error);
    return { success: false, error: "Failed to save metal prices" };
  }
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
              The product prices were last updated on {lastUpdated}. All
              products were updated successfully.
            </p>
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
            prices.
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
              Refresh Prices
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
