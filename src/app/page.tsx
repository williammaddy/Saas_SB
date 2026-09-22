import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Zap, Users, Receipt } from "lucide-react";

export default async function HomePage() {
  const session = await getSession();

  if (session?.userId) {
    if (session.organizationId) {
      try {
        const org = await db.organization.findUnique({
          where: { id: session.organizationId },
        });
        if (org && !org.onboardingCompleted) {
          redirect("/onboarding");
        }
      } catch (err) {
        const digest =
          typeof err === "object" && err && "digest" in err
            ? String((err as { digest?: string }).digest)
            : "";
        if (digest.startsWith("NEXT_REDIRECT")) throw err;
      }
    }
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="px-6 py-4 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            B
          </div>
          <span className="text-lg font-semibold tracking-tight">BizFlow</span>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium mb-6">
          <Zap className="w-3.5 h-3.5" />
          Simple business OS for small teams
        </p>

        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
          Day-to-day work in one place
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          Customers, items, bills, GST invoices, and payments — without notebooks, spreadsheets, or WhatsApp notes.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" icon={<ArrowRight className="w-4 h-4" />}>
              Create account
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: Zap,
              title: "Quick Bill",
              body: "Walk-in sales in seconds, with tax calculated for you.",
            },
            {
              icon: Users,
              title: "Customers & credit",
              body: "Outstanding balances, partial payments, and statements.",
            },
            {
              icon: Receipt,
              title: "GST or plain bills",
              body: "CGST, SGST, or IGST when you need it — clean invoices when you don’t.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-5 rounded-xl bg-white border border-slate-200"
            >
              <feature.icon className="w-5 h-5 text-indigo-600 mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">{feature.title}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">{feature.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-5 border-t border-slate-200 text-center text-xs text-slate-500">
        © 2026 BizFlow
      </footer>
    </div>
  );
}
