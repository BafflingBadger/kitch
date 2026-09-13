import { cn } from "@/lib/utils";

export function Avatar({
  displayName,
  avatarUrl,
  sizeClassName = "h-9 w-9",
  className,
}: {
  displayName: string;
  avatarUrl?: string | null;
  sizeClassName?: string;
  className?: string;
}) {
  const initials =
    displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        className={cn(
          "shrink-0 rounded-full border border-kitch-charcoal/15 object-cover",
          sizeClassName,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-kitch-charcoal/15 bg-kitch-peach text-sm font-semibold text-kitch-peach-foreground",
        sizeClassName,
        className,
      )}
    >
      {initials}
    </span>
  );
}
