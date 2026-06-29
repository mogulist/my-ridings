import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Calendar, LayoutDashboard, Settings, LogOut } from "lucide-react";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // 화이트리스트 체크
  const { data: adminRecord } = await supabase
    .from("admin_whitelist")
    .select("id")
    .eq("email", user.email!)
    .single();

  if (!adminRecord) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <h1 className="text-2xl font-bold text-red-500">
          접근 거부 (Access Denied)
        </h1>
        <p className="text-slate-400">
          귀하의 이메일({user.email})은 관리자 목록에 없습니다.
        </p>
        <form action="/admin/auth/signout" method="post">
          <button className="underline hover:text-white transition-colors">
            로그아웃
          </button>
        </form>
      </div>
    );
  }

  return (
    <SidebarProvider className="flex min-h-0 flex-1">
      <AppSidebar />
      <SidebarInset className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex items-center justify-center border-b px-2">
        {/* <SidebarTrigger /> */}
        <span className="font-bold text-lg">KFondo</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin/events">
                    <Calendar />
                    <span>Events</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#">
                    <Settings />
                    <span>Settings</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <form
                  action="/admin/auth/signout"
                  method="post"
                  className="w-full"
                >
                  <SidebarMenuButton type="submit">
                    <LogOut />
                    <span>Sign out</span>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
