import {
  Page,
  Card,
  Layout,
  Text,
  Button,
  Icon,
  Collapsible,
  Box,
  InlineStack,
} from "@shopify/polaris";
import { useState } from "react";
import {
  SaveIcon,
  SettingsIcon,
  AutomationIcon,
  CalculatorIcon,
  ProfileIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import { Link } from "@remix-run/react";

export default function SettingsPage() {
  const [faqOpen, setFaqOpen] = useState(true);

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(2, 1fr)",
              gap: 24,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Card padding="400">
                <div>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={SettingsIcon} tone="base" />
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      General
                    </Text>
                  </InlineStack>
                  <div style={{ marginTop: 12 }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure decimal places, purities, tax options, and
                      communication address.
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
            <div
              style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Card padding="400">
                <div>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={AutomationIcon} tone="base" />
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Automation
                    </Text>
                  </InlineStack>
                  <div style={{ marginTop: 12 }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure settings to update product prices automatically
                      based on the market spot price of the metals.
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
            <div
              style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <Link
                to="/app/settings/formula"
                style={{ textDecoration: "none" }}
                prefetch="intent"
              >
                <Card padding="400">
                  <div>
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={CalculatorIcon} tone="base" />
                      <Text as="h3" variant="headingSm" fontWeight="bold">
                        Formula
                      </Text>
                    </InlineStack>
                    <div style={{ marginTop: 12 }}>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Configure how the product prices must be calculated and
                        edit default values for the custom formula.
                      </Text>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
            <div
              style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gridColumn: "1 / 2",
              }}
            >
              <Card padding="400">
                <div>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={SaveIcon} tone="base" />
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Bulk Import
                    </Text>
                  </InlineStack>
                  <div style={{ marginTop: 12 }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Import product configurations in bulk using excel sheet to
                      save your time.
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
            <div
              style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gridColumn: "2 / 4",
              }}
            >
              <Card padding="400">
                <div>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ProfileIcon} tone="base" />
                    <Text as="h3" variant="headingSm" fontWeight="bold">
                      Account & Usage
                    </Text>
                  </InlineStack>
                  <div style={{ marginTop: 12 }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Manage app subscription, plan details and webhooks.
                    </Text>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <Card>
            <Text as="h3" variant="headingMd" fontWeight="bold">
              FREQUENTLY ASKED QUESTIONS
            </Text>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="plain"
                onClick={() => setFaqOpen((open) => !open)}
                ariaExpanded={faqOpen}
                ariaControls="faq-content"
              >
                How can the Live Gold Price Editor app for Shopify help me?
              </Button>
            </div>
            <Collapsible open={faqOpen} id="faq-content">
              <Box paddingBlockStart="200">
                <Text as="p" variant="bodyMd">
                  Shopify is a great platform to create your Online Jewelry
                  Store. But it does not help you to update the Product Prices
                  based on the Precious Metal Prices easily.
                  <br />
                  <br />
                  The Live Gold Price Editor for Shopify helps you easily
                  configure your products and update their prices based on the
                  metal price automatically (Advanced) or with a click of a
                  button (Starter & Basic).
                  <br />
                  <br />
                  You can configure your products with Metal Type, Purity and
                  Metal Weight. Additional information like Diamonds, Gemstones,
                  Labor Costs, Shipping Charges, Tax, Markup, etc can be used to
                  calculate the final price. The Live Gold Price Editor is fully
                  customizable. The formula to calculate the product prices can
                  be customized to your needs.
                  <br />
                  <br />
                  With additional tools like Advanced Store Configuration, Stop
                  Loss Pricing, Price Breakup, and more, you can automate and
                  optimize your jewelry pricing workflow.
                </Text>
              </Box>
            </Collapsible>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <Card>
            <Text variant="headingSm" as="h3">
              MORE APPS
            </Text>
            <div style={{ marginTop: 8 }}>
              <Button
                url="https://apps.shopify.com/ultimate-purchase-orders"
                external
                fullWidth
                icon={ExternalIcon}
              >
                Ultimate Purchase Orders
              </Button>
            </div>
            <Text as="p" variant="bodySm">
              Create purchase orders from your Shopify orders effortlessly and
              email them using your email address to your suppliers.
              <br />
              Ideal for dropshipping to your customers.
            </Text>
            <div style={{ marginTop: 8 }}>
              <Button
                url="https://apps.shopify.com/ultimate-product-id-exporter"
                external
                fullWidth
                icon={ExternalIcon}
              >
                Ultimate Product ID Exporter
              </Button>
            </div>
            <Text as="p" variant="bodySm">
              Export Products along with ID fields in a customized excel sheet
              format.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
