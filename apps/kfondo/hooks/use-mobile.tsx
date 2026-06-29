"use client"

import { useEffect, useState } from "react"

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // 초기 체크
    checkMobile()

    // 리사이즈 이벤트 리스너 추가
    window.addEventListener("resize", checkMobile)

    // 클린업
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [breakpoint])

  return isMobile
}
