import { NextResponse } from "next/server";
import { db, getPublicErrorMessage } from "@/lib/db";
import { verifyPassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = loginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    const { email, password } = validated.data;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organizations: {
          include: { organization: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const primaryMembership = user.organizations[0];
    const organization = primaryMembership?.organization || null;

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: organization?.id,
      role: primaryMembership?.role || "STAFF",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization,
      needsOnboarding: organization ? !organization.onboardingCompleted : true,
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: getPublicErrorMessage(err, "Authentication failed") },
      { status: 500 }
    );
  }
}
