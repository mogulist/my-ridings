"use client";

import { useState, useRef, useEffect } from "react";
import posthog from "posthog-js";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Share2, Link2 } from "lucide-react";
import { toast } from "sonner";

type ShareRecordMenuProps = {
  eventId: string;
  courseId: string;
  year: string;
  time: string;
  recordScope: "full" | "kom";
  title: string;
  description: string;
};

export default function ShareRecordMenu({
  eventId,
  courseId,
  year,
  time,
  recordScope,
  title,
  description,
}: ShareRecordMenuProps) {
  const [open, setOpen] = useState(false);
  const shareActionTakenRef = useRef(false);

  const isPastYear = Number(year) !== new Date().getFullYear();
  const captureProps = {
    event_id: eventId,
    course_id: courseId,
    year,
    time,
    record_scope: recordScope,
    is_past_year: isPastYear,
  };

  const basePath = `/find-by-record/${eventId}/${courseId}/${year}/${time}`;
  const getShareUrl = () =>
    typeof window !== "undefined"
      ? (() => {
          const url = new URL(basePath, window.location.origin);
          if (recordScope === "kom") {
            url.searchParams.set("scope", "kom");
          }
          return url.toString();
        })()
      : "";

  const handleCopyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      posthog.capture("record_share_link_copied", captureProps);
      shareActionTakenRef.current = true;
      toast.success("링크가 복사되었습니다.");
      setOpen(false);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleShare = async () => {
    const url = getShareUrl();
    if (!url) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        posthog.capture("record_share_native_shared", captureProps);
        shareActionTakenRef.current = true;
        toast.success("공유되었습니다.");
        setOpen(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("공유에 실패했습니다.");
        }
      }
    } else {
      await handleCopyLink();
    }
  };

  const handleShareMenuOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      shareActionTakenRef.current = false;
      posthog.capture("record_share_menu_opened", captureProps);
    } else if (!shareActionTakenRef.current) {
      posthog.capture("record_share_menu_dismissed", captureProps);
    }
  };

  useEffect(() => {
    if (!open) return;
    const closeOnScroll = () => handleShareMenuOpenChange(false);
    window.addEventListener("scroll", closeOnScroll, { capture: true, passive: true });
    return () =>
      window.removeEventListener("scroll", closeOnScroll, { capture: true });
  }, [open]);

  return (
    <Popover open={open} onOpenChange={handleShareMenuOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="공유"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-1">
        <div className="flex flex-col gap-0.5">
          <Button
            variant="ghost"
            className="justify-start gap-2 h-9 px-2 text-sm font-normal"
            onClick={handleCopyLink}
          >
            <Link2 className="h-4 w-4 shrink-0" />
            링크 복사
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 h-9 px-2 text-sm font-normal"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 shrink-0" />
            공유하기
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
