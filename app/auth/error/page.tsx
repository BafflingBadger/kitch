import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { authLinkClassName } from "@/components/auth/styles";

async function ErrorDetail({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-center text-sm text-kitch-grey">
      {params?.error ?? "An unspecified error occurred."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthCard title="Something Went Wrong">
      <Suspense
        fallback={
          <p className="text-center text-sm text-kitch-grey">
            An unspecified error occurred.
          </p>
        }
      >
        <ErrorDetail searchParams={searchParams} />
      </Suspense>
      <p className="mt-7 text-center text-sm text-kitch-charcoal">
        <Link href="/auth/login" className={authLinkClassName}>
          Back to log in.
        </Link>
      </p>
    </AuthCard>
  );
}
