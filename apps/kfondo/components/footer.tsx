"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function Footer() {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });

    if (res.ok) {
      setStatus("done");
    } else {
      setStatus("error");
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setName("");
      setEmail("");
      setMessage("");
      setStatus("idle");
    }
  };

  return (
    <footer className="border-t mt-12">
      <div className="max-w-screen-xl mx-auto px-4 py-8 flex flex-col items-center gap-2">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("feedback.title")}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("feedback.title")}</DialogTitle>
            </DialogHeader>
            {status === "done" ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-2xl">🙏</p>
                <p className="font-medium">{t("feedback.thanks")}</p>
                <p className="text-sm text-muted-foreground">{t("feedback.received")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("feedback.name")}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("feedback.namePlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("feedback.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t("feedback.message")}</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("feedback.placeholder")}
                    rows={4}
                    required
                  />
                </div>
                {status === "error" && (
                  <p className="text-sm text-destructive">{t("feedback.error")}</p>
                )}
                <Button type="submit" className="w-full" disabled={status === "sending"}>
                  {status === "sending" ? t("feedback.sending") : t("feedback.send")}
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
