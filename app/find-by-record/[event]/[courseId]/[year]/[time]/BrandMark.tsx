type BrandMarkProps = {
  /** 텍스트 크기 변형 */
  size?: "sm" | "md";
  className?: string;
};

/**
 * kfondo.cc 워드마크 (텍스트 전용).
 * 캡처 시 브랜드를 노출하기 위해 결과 패널 하단에 둔다.
 */
const BrandMark = ({ size = "md", className = "" }: BrandMarkProps) => {
  const text = size === "sm" ? "text-xs" : "text-base";
  return (
    <span
      className={`${text} font-bold tracking-tight text-emerald-600 dark:text-emerald-400 ${className}`}
    >
      kfondo.cc
    </span>
  );
};

export default BrandMark;
