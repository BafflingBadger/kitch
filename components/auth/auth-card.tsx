import Image from "next/image";

import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-kitch-charcoal/10 bg-white p-8 shadow-lg sm:p-10",
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-kitch-peach/60">
          <Image
            src="/logo.png"
            alt=""
            width={40}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </div>
        <h1 className="mt-5 font-literata text-4xl font-bold text-kitch-charcoal">
          {title}
        </h1>
        {description ? (
          <p className="mt-3.5 text-sm text-kitch-grey">{description}</p>
        ) : null}
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}

export function AuthLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-xs font-bold uppercase tracking-wide text-kitch-charcoal",
        className,
      )}
    >
      {children}
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-kitch-red">
      {message}
    </p>
  );
}
