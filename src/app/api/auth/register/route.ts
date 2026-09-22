import { NextResponse } from "next/server";
import { db, getPublicErrorMessage } from "@/lib/db";
import { hashPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, phone, businessName, businessType } = validated.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Transaction: Create user, organization, and owner membership atomically
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          phone,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: businessName,
          businessType,
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          onboardingCompleted: false,
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: "BUSINESS_REGISTERED",
          entityType: "Organization",
          entityId: organization.id,
          metadata: { businessName, businessType },
        },
      });

      return { user, organization };
    });

    const token = await signToken({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.organization.id,
      role: "OWNER",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: result.organization,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: getPublicErrorMessage(err, "Failed to create account") },
      { status: 500 }
    );
  }
}
