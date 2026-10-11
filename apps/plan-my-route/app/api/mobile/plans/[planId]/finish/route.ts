import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-authenticated-user";
import { supabaseAdmin } from "@/lib/supabase";
import { parseStageFinishInput } from "@/lib/stage-finish-input";
export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
	const user = await getAuthenticatedUser(request);
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	const { planId } = await params;
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
	const input = parseStageFinishInput(body);
	if (!input)
		return NextResponse.json(
			{ error: "종료 지점과 변경 미리보기를 확인해 주세요." },
			{ status: 400 },
		);
	const { data, error } = await supabaseAdmin.rpc("finish_plan_stage_atomic", {
		p_plan_id: planId,
		p_user_id: user.id,
		p_request_id: input.requestId,
		p_input: input,
	});
	if (error) {
		const missing = ["42883", "PGRST202"].includes(error.code);
		const conflict = error.code === "P0001";
		return NextResponse.json(
			{
				error: missing
					? "종료 복구 기능의 데이터베이스 업데이트가 필요합니다."
					: conflict
						? "플랜이 변경되었습니다. 새로 불러온 뒤 종료 지점을 다시 지정해 주세요."
						: "저장하지 못했습니다. 같은 종료 지점으로 다시 시도해 주세요.",
			},
			{ status: missing ? 503 : conflict ? 409 : 500 },
		);
	}
	return NextResponse.json(data);
}
