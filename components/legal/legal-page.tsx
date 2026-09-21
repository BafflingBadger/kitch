import { SUPPORT_EMAIL } from "@/lib/support";

export { SUPPORT_EMAIL };

/** Shell shared by the public legal pages. */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-kitch-cream px-6 py-16">
      <article className="mx-auto w-full max-w-2xl">
        <h1 className="font-literata text-4xl font-semibold text-kitch-charcoal">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-kitch-grey">{intro}</p>

        {children}
      </article>
    </main>
  );
}

export const legalLinkClassName =
  "text-sm font-semibold text-kitch-red transition-colors hover:text-kitch-red/80 hover:underline";

export function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-literata text-xl font-semibold text-kitch-charcoal">
        {number}. {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-kitch-charcoal/80">
        {children}
      </div>
    </section>
  );
}

export function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 text-sm font-semibold text-kitch-charcoal">{children}</h3>
  );
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-kitch-grey">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ContactLine({ lead }: { lead: string }) {
  return (
    <p>
      {lead}{" "}
      <a href={`mailto:${SUPPORT_EMAIL}`} className={legalLinkClassName}>
        {SUPPORT_EMAIL}
      </a>
    </p>
  );
}
