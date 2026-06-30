/**
 * 기록 찾기 OG 이미지 - Landscape (1200×630)
 * SNS 링크 미리보기용. 기록 결과 페이지(밝은 히어로)와 동일한 톤.
 * Satori 호환: inline style만 사용, 수치는 number, 다중 자식 div엔 display:flex.
 */
export type RecordOGImageLandscapeProps = {
  year: string;
  eventName: string;
  category: string;
  distance: string;
  elevation: string;
  record: string;
  rank: number | null;
  participantPct: string;
  finisherPct: string;
  totalParticipants: number;
  finishers: number;
  eventDate: string;
  recordLabel?: string;
  rankLabel?: string;
  participantLabel?: string;
  finisherLabel?: string;
  scopeLabel?: string;
  isKom?: boolean;
};

export function RecordOGImageLandscape(props: RecordOGImageLandscapeProps) {
  const {
    year,
    eventName,
    category,
    distance,
    elevation,
    record,
    rank,
    participantPct,
    finisherPct,
    totalParticipants,
    finishers,
    eventDate,
    recordLabel = "완주 기록",
    rankLabel = "순위",
    participantLabel = "참가자 기준",
    finisherLabel = "완주자 기준",
    scopeLabel = "완주",
    isKom = false,
  } = props;

  const rankStr = rank != null ? String(rank) : "-";

  const solidPill = (text: string, bg: string) => (
    <span
      style={{
        display: "flex",
        paddingTop: 7,
        paddingBottom: 7,
        paddingLeft: 16,
        paddingRight: 16,
        background: bg,
        color: "#ffffff",
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 800,
      }}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "SUIT, -apple-system, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingTop: 48,
        paddingBottom: 40,
        paddingLeft: 64,
        paddingRight: 64,
      }}
    >
      {/* 배경 장식 원 (인증 이미지와 동일하게 은은하게) */}
      <div
        style={{
          position: "absolute",
          top: -260,
          right: -240,
          width: 640,
          height: 640,
          borderRadius: "50%",
          background: "#34d399",
          opacity: 0.12,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -240,
          left: -220,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: "#34d399",
          opacity: 0.1,
          display: "flex",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* 상단: 날짜 + 제목 + 뱃지 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 48,
                color: "#0f172a",
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              {year}년 {eventName}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 22,
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              {eventDate}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {category && solidPill(category, "#2563eb")}
            {scopeLabel &&
              (isKom ? (
                <span
                  style={{
                    display: "flex",
                    paddingTop: 7,
                    paddingBottom: 7,
                    paddingLeft: 16,
                    paddingRight: 16,
                    background: "#ede9fe",
                    color: "#6d28d9",
                    border: "1px solid #c4b5fd",
                    borderRadius: 8,
                    fontSize: 20,
                    fontWeight: 800,
                  }}
                >
                  {scopeLabel}
                </span>
              ) : (
                solidPill(scopeLabel, "#059669")
              ))}
            {distance && solidPill(distance, "#16a34a")}
            {elevation && solidPill(elevation, "#f97316")}
          </div>
        </div>

        {/* 중앙: 메인 기록 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#64748b",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            {recordLabel}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 132,
              color: "#059669",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {record}
          </div>
        </div>

        {/* 하단: 순위 & 퍼센타일 3종 */}
        <div style={{ display: "flex", gap: 18 }}>
          <StatCard label={rankLabel}>
            <span
              style={{
                display: "flex",
                fontSize: 52,
                color: "#0f172a",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {rankStr}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 28,
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              위
            </span>
          </StatCard>

          <StatCard label={participantLabel} sub={`${totalParticipants.toLocaleString()}명`}>
            <span
              style={{
                display: "flex",
                fontSize: 52,
                color: "#0f172a",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {participantPct}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 28,
                color: "#0f172a",
                fontWeight: 800,
              }}
            >
              %
            </span>
          </StatCard>

          <StatCard
            label={finisherLabel}
            sub={`${finishers.toLocaleString()}명`}
            accent
          >
            <span
              style={{
                display: "flex",
                fontSize: 52,
                color: "#059669",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {finisherPct}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 28,
                color: "#059669",
                fontWeight: 800,
              }}
            >
              %
            </span>
          </StatCard>
        </div>

        {/* 하단 브랜드 워드마크 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#059669",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            kfondo.cc
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  sub,
  accent = false,
  children,
}: {
  label: string;
  sub?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 16,
        paddingTop: 22,
        paddingBottom: 22,
        paddingLeft: 28,
        paddingRight: 28,
        border: accent ? "1px solid #6ee7b7" : "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 18,
          color: "#64748b",
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        {children}
      </div>
      {sub ? (
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: "#94a3b8",
            fontWeight: 700,
            marginTop: 8,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}
