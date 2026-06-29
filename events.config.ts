import type { Event } from "./lib/types";

// 그란폰도 이벤트 목록
export const events: Event[] = [
  {
    id: "muju",
    location: "무주",
    years: [2025],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "무주 그란폰도 통계 | K-Fondo",
      description:
        "무주 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/muju-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.10.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 126.2,
            elevation: 1872,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 69.7,
            elevation: 816,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "gapyeong",
    location: "가평",
    years: [2025, 2026],
    color: {
      from: "#eab308",
      to: "#a16207",
    },
    status: "ready",
    meta: {
      title: "트렉가평자라섬 그란폰도 통계 | K-Fondo",
      description:
        "트렉가평자라섬 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/gapyeong-og.jpg",
    },
    comment:
      "그란폰도 참가자 중 78km 하오재 계측 기록이 없는 244명은 DNF로 분류하였습니다. 기록 업데이트: 5.25 15:50",
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.5.9",
        status: "upcoming",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 108.1,
            elevation: 2231,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 65.1,
            elevation: 1305,
            registered: 0,
          },
        ],
        totalRegistered: 0,
        url: "https://xcworks.com/sub/race.html?type=view&wrNo=18",
      },
      2025: {
        year: 2025,
        date: "2025.5.24",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 118,
            elevation: 2441,
            registered: 806,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 75,
            elevation: 1393,
            registered: 392,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "seorak",
    location: "설악",
    years: [2022, 2023, 2024, 2025, 2026],
    color: {
      from: "#0d9488",
      to: "#0f766e",
    },
    status: "ready",
    meta: {
      title: "설악 그란폰도 통계 | K-Fondo",
      description:
        "설악 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2020년부터 2024년까지의 데이터를 제공합니다.",
      image: "/images/seorak-og.jpg",
    },
    comment:
      "2025년 코스제외자 551명은 그란폰도 DNF로 분류하였습니다. 기록 업데이트: 5.20 21:00",
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.6.20",
        status: "upcoming",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 208,
            elevation: 3800,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 105,
            elevation: 1700,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2025: {
        year: 2025,
        date: "2025.5.17",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 208,
            elevation: 3800,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 105,
            elevation: 1700,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2024: {
        year: 2024,
        date: "2024.5.18",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 208,
            elevation: 3800,
            registered: 3370,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 105,
            elevation: 1700,
            registered: 2470,
          },
        ],
        totalRegistered: 5840,
      },
      2023: {
        year: 2023,
        date: "2023.5.18",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 208,
            elevation: 3800,
            registered: 2926,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 105,
            elevation: 1700,
            registered: 2995,
          },
        ],
        totalRegistered: 5921,
      },
      2022: {
        year: 2022,
        date: "2022.5.18",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 208,
            elevation: 3800,
            registered: 2125,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 105,
            elevation: 1700,
            registered: 2175,
          },
        ],
        totalRegistered: 4300,
      },
    },
  },
  // 홍천 (이미 변환됨)
  {
    id: "hongcheon",
    location: "홍천",
    years: [2022, 2023, 2024, 2025],
    color: {
      from: "#f43f5e",
      to: "#e11d48",
    },
    status: "ready",
    meta: {
      title: "홍천 그란폰도 통계 | K-Fondo",
      description:
        "홍천 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2022년부터 2025년까지의 데이터를 제공합니다.",
      image: "/images/hongcheon-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.4.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122,
            elevation: 1594,
            registered: 1876,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 79,
            elevation: 1144,
            registered: 1204,
          },
        ],
        totalRegistered: 3080,
      },
      2024: {
        year: 2024,
        date: "2024.4.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122,
            elevation: 1594,
            registered: 1986,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 79,
            elevation: 1144,
            registered: 1178,
          },
        ],
        totalRegistered: 3164,
      },
      2023: {
        year: 2023,
        date: "2023.4.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122,
            elevation: 1594,
            registered: 2580,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 79,
            elevation: 1144,
            registered: 1350,
          },
        ],
        totalRegistered: 3930,
      },
      2022: {
        year: 2022,
        date: "2022.4.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122,
            elevation: 1594,
            registered: 3228,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 79,
            elevation: 1144,
            registered: 772,
          },
        ],
        totalRegistered: 4000,
      },
    },
  },
  // 양양
  {
    id: "yangyang",
    location: "양양",
    years: [2024, 2025],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "양양 그란폰도 통계 | K-Fondo",
      description:
        "양양 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2024년부터 2025년까지의 데이터를 제공합니다.",
      image: "/images/yangyang-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.4.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 151,
            elevation: 2380,
            registered: 1241,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 68,
            elevation: 630,
            registered: 809,
          },
        ],
        totalRegistered: 2050,
      },
      2024: {
        year: 2024,
        date: "2024.4.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 151,
            elevation: 2380,
            registered: 1200,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 68,
            elevation: 630,
            registered: 700,
          },
        ],
        totalRegistered: 1900,
      },
    },
  },
  // 영산강
  {
    id: "yeongsan",
    location: "영산강",
    years: [2023, 2024, 2025],
    color: {
      from: "#a855f7",
      to: "#6d28d9",
    },
    status: "ready",
    meta: {
      title: "영산 그란폰도 통계 | K-Fondo",
      description:
        "영산 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2023년부터 2025년까지의 데이터를 제공합니다.",
      image: "/images/yeongsan-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.4.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 121,
            elevation: 1000,
            registered: 1241,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 104,
            elevation: 757,
            registered: 809,
          },
        ],
        totalRegistered: 2050,
      },
      2024: {
        year: 2024,
        date: "2024.4.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 121,
            elevation: 1000,
            registered: 1200,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 104,
            elevation: 757,
            registered: 700,
          },
        ],
        totalRegistered: 1900,
      },
      2023: {
        year: 2023,
        date: "2023.4.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 121,
            elevation: 1000,
            registered: 1373,
          },
        ],
        totalRegistered: 1373,
      },
    },
  },
  // 문경새재
  {
    id: "mungyeong",
    location: "문경새재",
    years: [2023, 2024, 2025],
    color: {
      from: "#22c55e",
      to: "#15803d",
    },
    status: "ready",
    meta: {
      title: "문경새재 그란폰도 통계 | K-Fondo",
      description:
        "문경새재 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2023년부터 2024년까지의 데이터를 제공합니다.",
      image: "/images/mungyeong-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.9.6",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 152.5,
            elevation: 1970,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 107.6,
            elevation: 1480,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2024: {
        year: 2024,
        date: "2024.9.1",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 152.5,
            elevation: 2025,
            registered: 1099,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 110.4,
            elevation: 1817,
            registered: 1429,
          },
        ],
        totalRegistered: 2528,
      },
      2023: {
        year: 2023,
        date: "2023.9.1",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 152.5,
            elevation: 2025,
            registered: 1196,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 110.4,
            elevation: 1817,
            registered: 1110,
          },
        ],
        totalRegistered: 2306,
      },
    },
  },
  {
    id: "jeongeup",
    location: "정읍내장산",
    years: [2023, 2024, 2025, 2026],
    color: {
      from: "#f59e42",
      to: "#ea580c",
    },
    status: "ready",
    meta: {
      title: "정읍내장산 그란폰도 통계 | K-Fondo",
      description:
        "정읍내장산 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2023년부터 2024년까지의 데이터를 제공합니다.",
      image: "/images/jeongeup-og.jpg",
    },
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.5.16",
        status: "upcoming",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 118.4,
            elevation: 1717,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 82.23,
            elevation: 1171,
            registered: 0,
          },
        ],
        totalRegistered: 0,
        url: "https://www.thebike.co.kr/race/view.php?r_idx=327",
      },
      2025: {
        year: 2025,
        date: "2025.6.1",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 139,
            elevation: 2076,
            registered: 930,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 96,
            elevation: 1489,
            registered: 635,
          },
        ],
        totalRegistered: 1565,
      },
      2024: {
        year: 2024,
        date: "2024.5.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 139,
            elevation: 2076,
            registered: 809,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 96,
            elevation: 1489,
            registered: 630,
          },
        ],
        totalRegistered: 1439,
      },
      2023: {
        year: 2023,
        date: "2023.5.26",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 139,
            elevation: 2076,
            registered: 731,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 96,
            elevation: 1489,
            registered: 426,
          },
        ],
        totalRegistered: 1157,
      },
    },
  },
  // 삼척 (등록자 수 없음)
  {
    id: "samcheok",
    location: "삼척",
    years: [2024, 2025],
    color: {
      from: "#10b981",
      to: "#047857",
    },
    status: "ready",
    meta: {
      title: "삼척 그란폰도 통계 | K-Fondo",
      description:
        "삼척 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요.",
      image: "/images/samcheok-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.6.7",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 128,
            elevation: 1668,
            registered: 750,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 102,
            elevation: 1201,
            registered: 660,
          },
        ],
        totalRegistered: 1410,
      },
      2024: {
        year: 2024,
        date: "2024.6.9",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 128,
            elevation: 1668,
            registered: 1003,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 102,
            elevation: 1201,
            registered: 317,
          },
        ],
        totalRegistered: 1320,
      },
    },
  },
  // 화천 DMZ 랠리
  {
    id: "hwacheon",
    location: "화천",
    years: [2022, 2023, 2025],
    color: {
      from: "#8b5cf6",
      to: "#6d28d9",
    },
    status: "ready",
    meta: {
      title: "화천 DMZ 랠리 통계 | K-Fondo",
      description:
        "화천 DMZ 랠리의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2022년부터 2025년까지의 데이터를 제공합니다.",
      image: "/images/hwacheon-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.5.11",
        courses: [
          {
            id: "single",
            name: "DMZ 랠리",
            distance: 71.35,
            elevation: 1244,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2023: {
        year: 2023,
        date: "2023",
        courses: [
          {
            id: "single",
            name: "DMZ 랠리",
            distance: 0,
            elevation: 0,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2022: {
        year: 2022,
        date: "2022",
        courses: [
          {
            id: "single",
            name: "DMZ 랠리",
            distance: 0,
            elevation: 0,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "jeosu",
    location: "예천저수령",
    years: [2025, 2026],
    color: {
      from: "#8b5cf6",
      to: "#6d28d9",
    },
    status: "ready",
    meta: {
      title: "예천저수령 그란폰도 통계 | K-Fondo",
      description:
        "예천저수령 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/jeosu-og.jpg",
    },
    comment:
      "Challenge A 참가자 중 5번째 체크포인트 기록이 없는 302명은 DNF로 분류하였습니다.",
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.4.18",
        status: "upcoming",
        courses: [
          {
            id: "challenge-a",
            name: "Challenge A",
            distance: 103.6,
            registered: 0,
          },
          {
            id: "challenge-b",
            name: "Challenge B",
            distance: 93.3,
            registered: 0,
          },
        ],
        totalRegistered: 0,
        url: "https://xcworks.com/sub/race.html?type=view&wrNo=13",
      },
      2025: {
        year: 2025,
        date: "2025.5.31",
        courses: [
          {
            id: "challenge-a",
            name: "Challenge A",
            distance: 103.6,
            elevation: 2020,
            registered: 2109,
          },
          {
            id: "challenge-b",
            name: "Challenge B",
            distance: 93.3,
            elevation: 1754,
            registered: 191,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "yeonchun",
    location: "연천DMZ",
    years: [2025],
    color: {
      from: "#ec4899",
      to: "#be185d",
    },
    status: "ready",
    meta: {
      title: "연천 그란폰도 통계 | K-Fondo",
      description:
        "연천 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/yeonchu-og.jpg",
    },
    comment: "Cycle과 MTB 종목을 통합하였습니다",
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.6.21",
        courses: [
          {
            id: "rally",
            name: "랠리",
            distance: 76,
            elevation: 557,
            registered: 1400,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "jeongseon",
    location: "정선 동강",
    years: [2025],
    color: {
      from: "#8b5cf6",
      to: "#6d28d9",
    },
    status: "ready",
    meta: {
      title: "정선 그란폰도 통계 | K-Fondo",
      description:
        "정선 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/jeongseon-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.6.29",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 92,
            elevation: 1033,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 47.1,
            elevation: 413,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "goseong",
    location: "Tour de DMZ 고성",
    years: [2025],
    color: {
      from: "#f97316",
      to: "#ea580c",
    },
    status: "ready",
    meta: {
      title: "Tour de DMZ 고성 그란폰도 통계 | K-Fondo",
      description:
        "Tour de DMZ 고성 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/jeongseon-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.8.30",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 93,
            elevation: 1319,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 63.83,
            elevation: 870,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "yangpyeong",
    location: "양평",
    years: [2025],
    color: {
      from: "#2563eb",
      to: "#1e40af",
    },
    status: "ready",
    meta: {
      title: "양평 그란폰도 통계 | K-Fondo",
      description:
        "양평 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/yangpyeong-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.9.6",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 95.59,
            elevation: 1247,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "gongju",
    location: "공주백제",
    years: [2025],
    color: {
      from: "#dc2626",
      to: "#991b1b",
    },
    status: "ready",
    meta: {
      title: "공주백제   그란폰도 통계 | K-Fondo",
      description:
        "공주백제 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/gongju-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.9.14",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 135,
            elevation: 1500,
            registered: 1875,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 79,
            elevation: 616,
            registered: 915,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "wanju",
    location: "완주만경강",
    years: [2025],
    color: {
      from: "#f97316",
      to: "#ea580c",
    },
    status: "ready",
    meta: {
      title: "완주만경강 메디오폰도 통계 | K-Fondo",
      description:
        "완주만경강 메디오폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/wanju-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.9.20",
        courses: [
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 93.5,
            elevation: 1071,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "chungju",
    location: "충주",
    years: [2025, 2026],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "충주 그란폰도 통계 | K-Fondo",
      description:
        "충주 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/chungju-og.jpg",
    },
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.10.3",
        status: "upcoming",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 112,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 84,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
      2025: {
        year: 2025,
        date: "2025.9.20",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 119,
            elevation: 1605,
            registered: 1356,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 67,
            elevation: 870,
            registered: 673,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "taebaek",
    location: "어라운드 태백",
    years: [2025],
    color: {
      from: "#10b981",
      to: "#047857",
    },
    status: "ready",
    meta: {
      title: "어라운드 태백 그란폰도 통계 | K-Fondo",
      description:
        "어라운드 태백 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/taebaek-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.9.27",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 100,
            elevation: 1470,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 72,
            elevation: 1250,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "sangju",
    location: "상주",
    years: [2025],
    color: {
      from: "#f59e0b",
      to: "#d97706",
    },
    status: "ready",
    meta: {
      title: "상주 그란폰도 통계 | K-Fondo",
      description:
        "상주 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/sangju-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.10.11",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 101.5,
            elevation: 1245,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 61.1,
            elevation: 663,
            registered: 0,
          },
        ],
        totalRegistered: 2207,
      },
    },
  },
  // 부여 굿뜨래 그란폰도
  {
    id: "buyeo",
    location: "부여 굿뜨래",
    years: [2023, 2024, 2025],
    color: {
      from: "#8b5cf6",
      to: "#6d28d9",
    },
    status: "ready",
    meta: {
      title: "부여 굿뜨래 그란폰도 통계 | K-Fondo",
      description:
        "부여 굿뜨래 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/buyeo-og.jpg",
    },
    yearDetails: {
      2023: {
        year: 2023,
        date: "2023.10.21",
        status: "completed",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 105.6,
            elevation: 1225.4,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 54.8,
            elevation: 649.3,
            registered: 0,
          },
        ],
        totalRegistered: 1142,
      },
      2024: {
        year: 2024,
        date: "2024.10.12",
        status: "completed",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 105.6,
            elevation: 1225.4,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 54.8,
            elevation: 649.3,
            registered: 0,
          },
        ],
        totalRegistered: 1365,
      },
      2025: {
        year: 2025,
        date: "2025.10.18",
        status: "completed",
        courses: [
          {
            id: "mediofondo",
            name: "우중폰도",
            distance: 0,
            elevation: 0,
            registered: 1062,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  // 비앙키 춘천 그란폰도
  {
    id: "chuncheon",
    location: "비앙키 춘천",
    years: [2024, 2025],
    color: {
      from: "#54b9b1",
      to: "#3a8a84",
    },
    status: "ready",
    meta: {
      title: "비앙키 춘천 그란폰도 통계 | K-Fondo",
      description:
        "비앙키 춘천 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/bianchi-chuncheon-og.jpg",
    },
    comment:
      "2025년 데이터는 10월21일 공개된 엑셀파일의 내용을 토대로 업데이트하였습니다.",
    yearDetails: {
      2024: {
        year: 2024,
        date: "2024.10.20",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122.91,
            elevation: 2788,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 81.68,
            elevation: 1202,
            registered: 0,
          },
        ],
        totalRegistered: 1839,
      },
      2025: {
        year: 2025,
        date: "2025.10.19",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 122.91,
            elevation: 2788,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 81.68,
            elevation: 1202,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "tongyeong",
    location: "통영",
    years: [2025],
    color: {
      from: "#fb7185",
      to: "#be123c",
    },
    status: "ready",
    meta: {
      title: "통영 그란폰도 통계 | K-Fondo",
      description:
        "통영 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/tongyeong-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.11.8",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 97,
            elevation: 1701,
            registered: 2276,
          },
        ],
        totalRegistered: 2276,
      },
    },
  },
  {
    id: "yeosu",
    location: "섬섬 여수",
    years: [2025],
    color: {
      from: "#f97316",
      to: "#c2410c",
    },
    status: "ready",
    meta: {
      title: "섬섬 여수 그란폰도 통계 | K-Fondo",
      description:
        "섬섬 여수 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요.",
      image: "/images/yeosu-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.10.25",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 113,
            elevation: 1650,
            registered: 0,
          },
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 93,
            elevation: 1500,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
  },
  {
    id: "daegu",
    location: "대구 그란페스타",
    years: [2025],
    color: {
      from: "#22c55e",
      to: "#15803d",
    },
    status: "ready",
    meta: {
      title: "대구 그란페스타 그란폰도 통계 | K-Fondo",
      description:
        "대구 그란페스타 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/daegu-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.11.15",
        courses: [
          {
            id: "granfondo",
            name: "그란폰도",
            distance: 110.9,
            elevation: 1228,
            registered: 1301,
          },
        ],
        totalRegistered: 1301,
      },
    },
    dataSource: "Marazone",
  },
  {
    id: "iksan",
    location: "익산",
    name: "익산 미륵사지 메디오폰도",
    years: [2025],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "익산 미륵사지 메디오폰도 통계 | K-Fondo",
      description:
        "익산 미륵사지 메디오폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2025년의 데이터를 제공합니다.",
      image: "/images/iksan-og.jpg",
    },
    yearDetails: {
      2025: {
        year: 2025,
        date: "2025.11.16",
        courses: [
          {
            id: "mediofondo",
            name: "메디오폰도",
            distance: 95.7,
            elevation: 609.5,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
    dataSource: "my.raceresult.com",
  },
  {
    id: "dinosour",
    location: "공룡나라",
    years: [2026],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "공룡나라 그란폰도 통계 | K-Fondo",
      description:
        "공룡나라 그란폰도의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2026년의 데이터를 제공합니다.",
      image: "/images/dinosour-og.jpg",
    },
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.4.4",
        status: "upcoming",
        courses: [
          {
            id: "course-a",
            name: "코스 A",
            distance: 120.2,
            elevation: 1326.9,
            registered: 0,
          },
          {
            id: "course-b",
            name: "코스 B",
            distance: 118.9,
            elevation: 1274.9,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
    dataSource: "my.raceresult.com",
  },
  {
    id: "yeosu-major-cup",
    location: "여수시장배 전국 MTB&ROAD",
    name: "여수시장배 전국 MTB&ROAD",
    years: [2026],
    color: {
      from: "#0ea5e9",
      to: "#0369a1",
    },
    status: "ready",
    meta: {
      title: "여수시장배 전국 MTB&ROAD 통계 | K-Fondo",
      description:
        "여수시장배 전국 MTB&ROAD의 연도별 참가자 통계와 기록 분포를 확인해보세요. 2026년의 데이터를 제공합니다.",
      image: "/images/yeosu-major-cup-og.jpg",
    },
    yearDetails: {
      2026: {
        year: 2026,
        date: "2026.3.8",
        status: "upcoming",
        courses: [
          {
            id: "road",
            name: "로드",
            distance: 69,
            elevation: 1368,
            registered: 0,
          },
          {
            id: "mtb",
            name: "MTB",
            distance: 37,
            elevation: 1467,
            registered: 0,
          },
        ],
        totalRegistered: 0,
      },
    },
    dataSource: "my.raceresult.com",
  },
];
