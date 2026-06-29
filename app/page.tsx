import { getFilteredEvents } from "@/app/eventFilter";
import { HomePageContent } from "@/components/HomePageContent";

/** 30일 (Next.js segment config는 리터럴만 허용) */
export const revalidate = 2592000;

const HomePage = async () => {
  const initialData = await getFilteredEvents();

  return <HomePageContent initialData={initialData} />;
};

export default HomePage;
