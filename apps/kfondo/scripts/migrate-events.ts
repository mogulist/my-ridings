/**
 * Phase 2: Events, Editions, Courses 마이그레이션 스크립트
 * 사용법: bun run scripts/migrate-events.ts
 *
 * 주의: 이 스크립트는 기존 events 테이블의 데이터가 스키마 변경으로 인해
 * 호환되지 않는다고 가정하고, 새로운 구조에 맞춰 데이터를 삽입합니다.
 */

import { createClient } from "@supabase/supabase-js";
import { events } from "../events.config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role Key 필요

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "❌ .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("🚀 Phase 2 마이그레이션 시작...");

  // 1. Events 테이블 데이터 준비
  for (const event of events) {
    console.log(`\n📦 처리 중: ${event.id} (${event.location})`);

    // 대회 이름 생성 로직 (meta.title 활용 또는 location + 그란폰도)
    const name = event.meta.title.split("|")[0].trim();

    // 1-1. Events 테이블 Insert (Upsert)
    // slug가 conflict target
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .upsert(
        {
          slug: event.id, // 기존 id를 slug로 사용
          name: name,
          location: event.location,
          color_from: event.color.from,
          color_to: event.color.to,
          meta_title: event.meta.title,
          meta_description: event.meta.description,
          meta_image: event.meta.image,
          comment: event.comment,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (eventError) {
      console.error(`❌ Event 삽입 실패 (${event.id}):`, eventError.message);
      continue;
    }

    const eventId = eventData.id;
    console.log(`   ✅ Event 완료: ${name} (ID: ${eventId})`);

    // 2. Event Editions 처리
    if (event.yearDetails) {
      for (const yearStr in event.yearDetails) {
        const yearDetail = event.yearDetails[yearStr];
        const year = Number(yearStr);

        // 날짜 형식 변환 (YYYY.M.D -> YYYY-MM-DD)
        const formattedDate = yearDetail.date.replace(/\./g, "-");

        // 2-1. Edition Insert
        const { data: editionData, error: editionError } = await supabase
          .from("event_editions")
          .upsert(
            {
              event_id: eventId,
              year: year,
              date: formattedDate,
              status: yearDetail.status || "completed", // 기본값
              url: yearDetail.url,
            },
            { onConflict: "event_id, year" } // 복합 유니크 키
          )
          .select()
          .single();

        if (editionError) {
          console.error(
            `   ❌ Edition 삽입 실패 (${year}):`,
            editionError.message
          );
          continue;
        }

        const editionId = editionData.id;
        console.log(`      ✅ Edition 완료: ${year}년 (ID: ${editionId})`);

        // 3. Courses 처리
        if (yearDetail.courses) {
            // 해당 에디션의 기존 코스 삭제 (중복 방지를 위해 단순 삭제 후 재생성 전략 사용)
            // upsert를 쓰려면 course_type 같은 고유 키가 필요하지만, edition_id + course_type 유니크 제약이 없어서
            // 삭제 후 생성이 안전함.
            await supabase.from("courses").delete().eq("edition_id", editionId);

          for (const course of yearDetail.courses) {
            const { error: courseError } = await supabase
              .from("courses")
              .insert({
                edition_id: editionId,
                course_type: course.id,
                name: course.name,
                distance: course.distance,
                elevation: Math.round(course.elevation || 0),
                registered_count: Math.round(course.registered || 0),
              });

            if (courseError) {
              console.error(
                `      ❌ Course 삽입 실패 (${course.name}):`,
                courseError.message
              );
            } else {
              console.log(`         ✅ Course 완료: ${course.name}`);
            }
          }
        }
      }
    }
  }

  console.log("\n✨ 마이그레이션 완료!");
}

migrate();
