import { getSession } from "./auth";
import { db } from "./db";
import { NextResponse } from "next/server";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access to organization denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.userId) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireTenant() {
  const session = await requireAuth();

  // If organizationId is in session, verify membership
  let organizationId = session.organizationId;

  if (!organizationId) {
    // Find default or first organization where user is a member
    const membership = await db.organizationMember.findFirst({
      where: { userId: session.userId },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      throw new ForbiddenError("No organization membership found");
    }

    organizationId = membership.organizationId;
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        where: { userId: session.userId },
      },
    },
  });

  if (!organization || organization.members.length === 0) {
    throw new ForbiddenError();
  }

  const userRole = organization.members[0].role;

  return {
    session,
    organization,
    organizationId: organization.id,
    userRole,
    needsOnboarding: !organization.onboardingCompleted,
  };
}

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
}
