import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Formula calculation functions
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
      // (Metal Price x Metal Weight) + Diamond Price + Moissanite Price + Gemstone Price + (Making Charges %) + (Wastage %) + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)
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
      // (Metal Price x Metal Weight) + (Making Charges %) + (Wastage %) + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)
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
      // (Metal Price x Metal Weight) + (Wastage %) + Making Charges + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)
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
      // (Metal Price x Metal Weight) + (Wastage %) + (Making Charges x Metal Weight) + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Get the active formula
    const activeFormula = await prisma.formula.findFirst({
      where: { isActive: true },
    });

    if (!activeFormula) {
      return json(
        {
          success: false,
          error: "No active formula found. Please set a formula in settings.",
        },
        { status: 400 },
      );
    }

    // Get latest metal prices
    const metalTypes = [
      { metal: "Gold", karat: "24K", key: "gold24k" },
      { metal: "Gold", karat: "22K", key: "gold22k" },
      { metal: "Gold", karat: "18K", key: "gold18k" },
      { metal: "Gold", karat: "14K", key: "gold14k" },
      { metal: "Silver", karat: null, key: "silver" },
      { metal: "Platinum", karat: null, key: "platinum" },
      { metal: "Palladium", karat: null, key: "palladium" },
    ];

    const metalPrices: any = {};
    for (const type of metalTypes) {
      const price = await prisma.metalPrice.findFirst({
        where: { metal: type.metal, karat: type.karat },
        orderBy: { createdAt: "desc" },
      });
      metalPrices[type.key] = price?.price || 0;
    }

    // Get all configured variants
    const variantConfigs = await prisma.variantConfig.findMany();

    if (variantConfigs.length === 0) {
      return json(
        {
          success: false,
          error:
            "No configured variants found. Please configure at least one variant.",
        },
        { status: 400 },
      );
    }

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
          metalPrices,
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

    return json({
      success: true,
      results,
      formulaUsed: activeFormula.value,
      totalProcessed: variantConfigs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating prices:", error);
    return json(
      {
        success: false,
        error: "Failed to calculate prices",
      },
      { status: 500 },
    );
  }
};
