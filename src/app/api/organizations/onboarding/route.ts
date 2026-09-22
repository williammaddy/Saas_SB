import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { onboardingSchema } from "@/lib/validations";
import { getStateCodeFromGstin } from "@/lib/billing/gst";

export async function POST(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = onboardingSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    // If GSTIN provided and stateCode not explicitly supplied, extract from GSTIN
    let resolvedStateCode = data.stateCode;
    if (data.gstEnabled && data.gstin && !resolvedStateCode) {
      resolvedStateCode = getStateCodeFromGstin(data.gstin) || undefined;
    }

    const updated = await db.organization.update({
      where: { id: organization.id },
      data: {
        name: data.name,
        businessType: data.businessType,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        stateCode: resolvedStateCode || null,
        pincode: data.pincode || null,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        gstEnabled: data.gstEnabled,
        gstin: data.gstEnabled ? data.gstin?.toUpperCase() || null : null,
        defaultTaxRate: data.gstEnabled ? data.defaultTaxRate : 0,
        onboardingCompleted: true,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "ONBOARDING_COMPLETED",
        entityType: "Organization",
        entityId: organization.id,
      },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
