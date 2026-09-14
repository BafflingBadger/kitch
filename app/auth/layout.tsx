export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-kitch-cream p-6">
      {/* Warm bloom behind the card. Pointer-events off so it never eats clicks. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-kitch-peach/70 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[32rem] w-[32rem] rounded-full bg-kitch-orange-from/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-kitch-cream-dark/80 blur-3xl" />
      </div>

      <main className="relative w-full max-w-md">{children}</main>
    </div>
  );
}
