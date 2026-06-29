import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 로그인하지 않은 경우 로그인 페이지로
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground">관리자 대시보드</h1>
        <form action="/admin/auth/signout" method="post">
          <Button variant="outline" type="submit">
            로그아웃
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>로그인 성공!</CardTitle>
          <CardDescription>GitHub OAuth 인증이 완료되었습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">사용자 정보:</p>
            <div className="bg-muted rounded-lg p-4 space-y-1">
              <p className="text-sm">
                <span className="text-muted-foreground">이메일:</span>{" "}
                <span className="font-mono text-foreground">{user.email}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">ID:</span>{" "}
                <span className="font-mono text-xs text-foreground">
                  {user.id}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              ✅ 1단계 완료: GitHub 로그인 동작 확인됨
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              다음 단계에서 관리자 권한 체크 및 CRUD 기능을 구현합니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
