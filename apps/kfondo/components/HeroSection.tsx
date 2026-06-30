import { SearchBar } from "@/components/SearchBar";

interface HeroSectionProps {
  initialQuery?: string;
}

export function HeroSection({ initialQuery = "" }: HeroSectionProps) {
  return (
    <div className="bg-gradient-to-b from-emerald-50 to-white dark:from-background dark:to-background py-16 md:py-20 transition-colors">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center space-y-6">
          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-50">
            내 기록은 몇 등일까?
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
            2026 그란폰도 대회에서 순위와 백분율을 확인하세요
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            목표 기록을 시뮬레이션하고 순위를 예측하세요
          </p>
          
          {/* Search Bar - Client Component */}
          <SearchBar initialQuery={initialQuery} />
        </div>
      </div>
    </div>
  );
}
