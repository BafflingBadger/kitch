import { Suspense } from "react";

import { listUsersForSearch } from "@/app/(dashboard)/discover/actions";
import { DiscoverUserList } from "@/components/discover/discover-user-list";

async function DiscoverContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const result = await listUsersForSearch();
  const users = result.ok ? result.users : [];

  return <DiscoverUserList users={users} initialQuery={q} />;
}

export default function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div>
      <h1 className="font-literata text-4xl font-semibold text-kitch-charcoal">
        Discover
      </h1>
      <p className="mt-2 text-sm text-kitch-grey">Find people to follow.</p>

      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-kitch-grey">Loading…</p>}>
          <DiscoverContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
