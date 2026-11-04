"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/language-switch";
import { LogoMark, Wordmark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeToggle } from "@/components/text-size-toggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute top-4 end-4 flex gap-2">
        <TextSizeToggle />
        <ThemeToggle />
        <LanguageSwitch />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <LogoMark size={56} className="mx-auto mb-3 rounded-2xl shadow-lg shadow-brand-600/30" />
            <span className="text-2xl">
              <Wordmark />
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {children}
        {footer && <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>}
      </div>
    </main>
  );
}
