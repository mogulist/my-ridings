"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github } from "lucide-react";
import { useState } from "react";
import posthog from "posthog-js";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGithubLogin = async () => {
    setIsLoading(true);
    posthog.capture("admin_login_attempted", { provider: "github" });
    const baseUrl =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || "";
    const redirectTo = `${baseUrl.replace(/\/$/, "")}/admin/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (error) {
      console.error("로그인 오류:", error);
      posthog.captureException(error);
      alert("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md shadow-2xl border-slate-700">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            관리자 로그인
          </CardTitle>
          <CardDescription className="text-slate-400">
            GitHub 계정으로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGithubLogin}
            disabled={isLoading}
            variant="outline"
            className="w-full h-12 text-base font-medium border-slate-600 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Github className="mr-2 h-5 w-5" />
            {isLoading ? "로그인 중..." : "GitHub으로 로그인"}
          </Button>

          <p className="text-xs text-center text-slate-500 mt-4">
            승인된 관리자만 접근할 수 있습니다
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
