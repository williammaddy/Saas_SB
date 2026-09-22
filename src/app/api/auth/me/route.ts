import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db, getPublicErrorMessage } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ authenticated: false, user: null, organization: null }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null, organization: null }, { status: 401 });
    }

    const currentOrgId = session.organizationId || user.organizations[0]?.organizationId;
    const currentOrg = user.organizations.find((m) => m.organizationId === currentOrgId)?.organization || user.organizations[0]?.organization || null;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      organization: currentOrg,
      needsOnboarding: currentOrg ? !currentOrg.onboardingCompleted : true,
    });
  } catch (err) {
    console.error("Auth check error:", err);
    return NextResponse.json(
      { error: getPublicErrorMessage(err, "Failed to verify session") },
      { status: 500 }
    );
  }
}
