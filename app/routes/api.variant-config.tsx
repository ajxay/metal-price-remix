import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const variantId = url.searchParams.get("variantId");
  if (!variantId) return json({ error: "Missing variantId" }, { status: 400 });
  const config = await prisma.variantConfig.findUnique({
    where: { shopifyVariantId: variantId },
  });
  return json({ config });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const variantId = formData.get("variantId") as string;
  if (!variantId) return json({ error: "Missing variantId" }, { status: 400 });
  const data = {
    metalType: formData.get("metalType") as string,
    goldPurity: formData.get("goldPurity") as string,
    metalWeight: formData.get("metalWeight")
      ? parseFloat(formData.get("metalWeight") as string)
      : null,
    diamondPrice: formData.get("diamondPrice")
      ? parseFloat(formData.get("diamondPrice") as string)
      : null,
    moissanitePrice: formData.get("moissanitePrice")
      ? parseFloat(formData.get("moissanitePrice") as string)
      : null,
    gemstonePrice: formData.get("gemstonePrice")
      ? parseFloat(formData.get("gemstonePrice") as string)
      : null,
    makingCharges: formData.get("makingCharges")
      ? parseFloat(formData.get("makingCharges") as string)
      : null,
    wastage: formData.get("wastage")
      ? parseFloat(formData.get("wastage") as string)
      : null,
    miscCharges: formData.get("miscCharges")
      ? parseFloat(formData.get("miscCharges") as string)
      : null,
    shippingCharges: formData.get("shippingCharges")
      ? parseFloat(formData.get("shippingCharges") as string)
      : null,
    markup: formData.get("markup")
      ? parseFloat(formData.get("markup") as string)
      : null,
    tax: formData.get("tax") ? parseFloat(formData.get("tax") as string) : null,
    compareAtMargin: formData.get("compareAtMargin")
      ? parseFloat(formData.get("compareAtMargin") as string)
      : null,
    remarks: formData.get("remarks") as string,
  };
  const config = await prisma.variantConfig.upsert({
    where: { shopifyVariantId: variantId },
    update: data,
    create: { shopifyVariantId: variantId, ...data },
  });
  return json({ config, success: true });
};
