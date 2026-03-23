import { auth } from "@/auth";
import HomeLanding from "./components/HomeLanding";
import { PlanMyRouteHeader } from "./components/PlanMyRouteHeader";
import RouteList from "./components/RouteList";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <HomeLanding />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-zinc-50 dark:bg-black/95">
      <PlanMyRouteHeader />
      <main className="flex-1 overflow-y-auto">
        <RouteList />
      </main>
    </div>
  );
}
