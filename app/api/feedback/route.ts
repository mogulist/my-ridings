import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const { name, email, message } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: '내용을 입력해주세요.' }, { status: 400 });
  }

  const { error } = await resend.emails.send({
    from: 'K-Fondo 피드백 <feedback@kfondo.cc>',
    to: process.env.FEEDBACK_TO_EMAIL!,
    replyTo: email || undefined,
    subject: `[K-Fondo 피드백] ${name || '익명'}`,
    html: `
      <p><strong>이름:</strong> ${name || '익명'}</p>
      <p><strong>이메일:</strong> ${email || '미입력'}</p>
      <hr />
      <p>${message.replace(/\n/g, '<br />')}</p>
    `,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
