"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  updateAsset, upsertSiteContent, updatePricingSettings,
  addGalleryImage, deleteGalleryImage, getGalleryImages, updateCompanySettings,
} from "@/db/repo";
import { uid } from "@/lib/quote";
import type { CompanySettings } from "@/lib/company";
import { fulfillPayment } from "@/lib/payments/fulfill";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function saveUpload(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return { ok: false, error: "Only JPEG, PNG or WEBP images are allowed." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image must be under 5MB." };
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${uid()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
  return { ok: true, url: `/uploads/${filename}` };
}

export async function uploadAssetImageAction(assetId: string, formData: FormData) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Choose an image file." };
  const saved = await saveUpload(file);
  if (!saved.ok) return { ok: false as const, error: saved.error };
  await updateAsset(assetId, { image_url: saved.url });
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const, url: saved.url };
}

export async function addGalleryImageAction(formData: FormData) {
  const file = formData.get("image");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!(file instanceof File) || file.size === 0) return { ok: false as const, error: "Choose an image file." };
  const saved = await saveUpload(file);
  if (!saved.ok) return { ok: false as const, error: saved.error };
  const existing = await getGalleryImages();
  const nextOrder = existing.reduce((max, img) => Math.max(max, img.sort_order), 0) + 1;
  await addGalleryImage({ id: uid(), url: saved.url, caption, sort_order: nextOrder });
  revalidatePath("/admin");
  revalidatePath("/gallery");
  return { ok: true as const };
}

export async function deleteGalleryImageAction(id: string) {
  await deleteGalleryImage(id);
  revalidatePath("/admin");
  revalidatePath("/gallery");
  return { ok: true as const };
}

export async function updatePricingSettingsAction(patch: {
  deliveryBaseFee?: number; deliveryRatePerKm?: number; waiverFee?: number;
}) {
  await updatePricingSettings(patch);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateSiteContentAction(slug: string, title: string, body: string) {
  await upsertSiteContent(slug, title, body);
  revalidatePath("/admin");
  revalidatePath("/gallery");
  return { ok: true as const };
}

export async function updateCompanySettingsAction(patch: Partial<CompanySettings>) {
  await updateCompanySettings(patch);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/gallery");
  return { ok: true as const };
}

// Manual EFT has no webhook, so an admin confirms the bank transfer landed
// and this promotes the order exactly like a gateway webhook would.
export async function markPaymentPaidAction(reference: string) {
  const result = await fulfillPayment(reference);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/admin");
  return { ok: true as const };
}
