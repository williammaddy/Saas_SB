import { NextResponse } from "next/server";
import { requireTenant, handleApiError } from "@/lib/tenant";
import { db } from "@/lib/db";
import { organizationSettingsSchema } from "@/lib/validations";
import { getStateCodeFromGstin } from "@/lib/billing/gst";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { organization } = await requireTenant();
    return NextResponse.json({ success: true, organization });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const { organization, session } = await requireTenant();
    const body = await req.json();

    const validated = organizationSettingsSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

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
        invoicePrefix: data.invoicePrefix,
        nextInvoiceNumber: data.nextInvoiceNumber,
        defaultPaymentTerms: data.defaultPaymentTerms,
        invoiceTemplate: data.invoiceTemplate,
        brandColor: data.brandColor,
        showAddress: data.showAddress,
        showContact: data.showContact,
        showGstin: data.showGstin,
        footerMessage: data.footerMessage || null,
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : organization.logoUrl,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: session.userId,
        action: "SETTINGS_UPDATED",
        entityType: "Organization",
        entityId: organization.id,
      },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
