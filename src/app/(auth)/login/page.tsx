"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ArrowRight, Lock, Mail, Eye, EyeOff, Phone, KeyRound, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetMethod, setResetMethod] = useState<"EMAIL" | "PHONE">("EMAIL");
  const [resetInput, setResetInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"REQUEST" | "VERIFY" | "SUCCESS">("REQUEST");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.needsOnboarding) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log in");
      setLoading(false);
    }
  };

  // Handle requesting OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetInput.trim()) return;

    setResetLoading(true);
    setResetError(null);

    try {
      // Simulate sending OTP via Email/SMS API
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOtpSent(true);
      setResetStep("VERIFY");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setResetLoading(false);
    }
  };

  // Handle resetting password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim()) return;

    setResetLoading(true);
    setResetError(null);

    try {
      if (otpCode.trim().length < 4) {
        throw new Error("Please enter a valid 6-digit OTP code");
      }
      if (newPassword.trim().length < 6) {
        throw new Error("New password must be at least 6 characters");
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      setResetStep("SUCCESS");
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4">
      <div className="mx-auto w-full max-w-md text-center">
        <Link href="/" className="inline-flex flex-col items-center">
          <img src="/brand/laxz-logo.png" alt="Laxzflow" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 shadow-sm" />
          <h1 className="mt-3 text-xl font-semibold text-slate-900 tracking-tight">Sign in to Laxzflow</h1>
        </Link>
        <p className="mt-1 text-sm text-slate-500">Manage sales, customers, and bills in one place</p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(true);
                      setResetStep("REQUEST");
                      setResetError(null);
                    }}
                    className="text-xs font-semibold text-slate-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-700 focus:outline-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button type="submit" size="lg" className="w-full mt-2" loading={loading} icon={<ArrowRight className="w-4 h-4" />}>
                Sign in
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500 border-t border-slate-100 pt-4">
              No account?{" "}
              <Link href="/signup" className="text-slate-900 font-bold hover:underline">
                Create one
              </Link>
            </p>
            <p className="mt-3 text-center text-xs text-slate-400">
              Demo: demo@laxzflow.app / password123
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password OTP Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password via OTP"
        description="Receive a secure 6-digit verification code to reset your password"
      >
        {resetStep === "REQUEST" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {resetError}
              </div>
            )}

            <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setResetMethod("EMAIL")}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  resetMethod === "EMAIL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => setResetMethod("PHONE")}
                className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all ${
                  resetMethod === "PHONE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                SMS Phone OTP
              </button>
            </div>

            <Input
              label={resetMethod === "EMAIL" ? "Registered Email Address" : "Registered Phone Number"}
              type={resetMethod === "EMAIL" ? "email" : "tel"}
              required
              placeholder={resetMethod === "EMAIL" ? "you@business.com" : "e.g. 9876543210"}
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              leftIcon={resetMethod === "EMAIL" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsForgotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={resetLoading}>
                Send OTP Code
              </Button>
            </div>
          </form>
        )}

        {resetStep === "VERIFY" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {resetError}
              </div>
            )}

            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              ✓ Verification OTP code sent to <strong>{resetInput}</strong>. Please enter code below:
            </div>

            <Input
              label="6-Digit OTP Code"
              required
              placeholder="e.g. 123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              leftIcon={<KeyRound className="w-4 h-4" />}
            />

            <Input
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              required
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-slate-400 hover:text-slate-700 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setResetStep("REQUEST")}>
                Back
              </Button>
              <Button type="submit" loading={resetLoading}>
                Reset Password
              </Button>
            </div>
          </form>
        )}

        {resetStep === "SUCCESS" && (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Password Reset Complete</h3>
              <p className="text-xs text-slate-500 mt-1">Your password has been successfully updated. You can now sign in with your new password.</p>
            </div>
            <Button
              className="w-full mt-2"
              onClick={() => {
                setIsForgotModalOpen(false);
                setPassword(newPassword);
              }}
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
