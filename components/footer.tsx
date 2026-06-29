'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function Footer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    });

    if (res.ok) {
      setStatus('done');
    } else {
      setStatus('error');
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setName('');
      setEmail('');
      setMessage('');
      setStatus('idle');
    }
  };

  return (
    <footer className="border-t mt-12">
      <div className="max-w-screen-xl mx-auto px-4 py-8 flex flex-col items-center gap-2">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              피드백 보내기
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>피드백 보내기</DialogTitle>
            </DialogHeader>
            {status === 'done' ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-2xl">🙏</p>
                <p className="font-medium">감사합니다!</p>
                <p className="text-sm text-muted-foreground">소중한 의견 잘 받았어요.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">이름 (선택)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">이메일 (선택, 답변을 원하시면 입력)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">내용 *</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="기능 요청, 오류 신고, 이벤트 제보 등 무엇이든 환영합니다."
                    rows={4}
                    required
                  />
                </div>
                {status === 'error' && (
                  <p className="text-sm text-destructive">전송 중 오류가 발생했어요. 다시 시도해주세요.</p>
                )}
                <Button type="submit" className="w-full" disabled={status === 'sending'}>
                  {status === 'sending' ? '전송 중...' : '보내기'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
        <p className="text-center text-sm text-muted-foreground">
          © 2025-{new Date().getFullYear()} K-Fondo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
