import {
  Page,
  Card,
  Text,
  FormLayout,
  Select,
  Box,
  Button,
  Toast,
  Frame,
} from "@shopify/polaris";
import { useNavigate, useLoaderData, useFetcher } from "@remix-run/react";
import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useState, useEffect } from "react";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import prisma from "../db.server";

const formulaExpressions: Record<string, string> = {
  "1": "(Metal Price x Metal Weight) + Diamond Price + Moissanite Price + Gemstone Price + (Making Charges %) + (Wastage %) + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)",
  "2": "(Metal Price x Metal Weight) + (Making Charges %) + (Wastage %) + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)",
  "3": "(Metal Price x Metal Weight) + (Wastage %) + Making Charges + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)",
  "4": "(Metal Price x Metal Weight) + (Wastage %) + (Making Charges x Metal Weight) + Diamond Price + Moissanite Price + Gemstone Price + (Shipping Charges %) + Misc Charges + (Markup %) + (Tax %)",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const formulas = await prisma.formula.findMany({ orderBy: { id: "asc" } });
  const active = formulas.find((f) => f.isActive) || formulas[0];
  return json({ formulas, activeValue: active?.value || "1" });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const value = formData.get("formula") as string;
  if (!value) return json({ success: false, error: "No formula provided" });
  await prisma.formula.updateMany({ data: { isActive: false } });
  const formula = await prisma.formula.findFirst({ where: { value } });
  if (formula) {
    await prisma.formula.update({
      where: { id: formula.id },
      data: { isActive: true },
    });
    return json({ success: true, value });
  }
  return json({ success: false, error: "Formula not found" });
}

export default function FormulaSettingsPage() {
  const { formulas, activeValue } = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState(activeValue);
  const [dirty, setDirty] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  useEffect(() => {
    setDirty(selected !== activeValue);
  }, [selected, activeValue]);

  useEffect(() => {
    if (fetcher.data && (fetcher.data as any).success) {
      setToastActive(true);
    }
  }, [fetcher.data]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append("formula", selected);
    fetcher.submit(formData, { method: "post" });
  };

  const handleDiscard = () => {
    setSelected(activeValue);
    setDirty(false);
  };

  const formulaOptions = formulas.map((f) => ({
    label: `Formula ${f.value}`,
    value: f.value,
  }));

  return (
    <Frame>
      <Page>
        <Box paddingBlockEnd="400">
          <Button
            icon={ArrowLeftIcon}
            variant="plain"
            onClick={() => navigate("/app/settings")}
          >
            Formula Settings
          </Button>
        </Box>
        <Card>
          <Box padding="400">
            <Text as="h2" variant="headingMd" fontWeight="bold">
              FORMULA DETAILS
            </Text>
            <Box paddingBlockStart="300">
              <FormLayout>
                <Select
                  label="Current Formula"
                  options={formulaOptions}
                  value={selected}
                  onChange={setSelected}
                  requiredIndicator
                />
                <Box paddingBlockStart="200">
                  <Text as="p" variant="bodyMd">
                    {formulaExpressions[selected]}
                  </Text>
                </Box>
                {dirty && (
                  <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      loading={fetcher.state === "submitting"}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" onClick={handleDiscard}>
                      Discard
                    </Button>
                  </div>
                )}
              </FormLayout>
            </Box>
          </Box>
          <div style={{ marginBlockStart: 16 }}>
            <Box
              background="bg-surface-secondary"
              padding="300"
              borderRadius="200"
            >
              <Text as="span" variant="bodySm">
                ✨ The formula determines how the product prices are calculated.
                If you need to customize the formula to your needs, please
                contact us at info@thevictorymantra.com.
              </Text>
            </Box>
          </div>
        </Card>
        {toastActive && (
          <Toast
            content="Formula saved!"
            onDismiss={() => setToastActive(false)}
          />
        )}
      </Page>
    </Frame>
  );
}
