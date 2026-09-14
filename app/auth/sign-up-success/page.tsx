import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { authLinkClassName } from "@/components/auth/styles";

export default function Page() {
  return (
    <AuthCard
      title="Check Your Email"
      description="We've sent you a confirmation link."
    >
      <p className="text-center text-sm text-kitch-grey">
        Your account has been created. Confirm your email address before signing
        in for the first time.
      </p>
      <p className="mt-7 text-center text-sm text-kitch-charcoal">
        <Link href="/auth/login" className={authLinkClassName}>
          Back to log in.
        </Link>
      </p>
    </AuthCard>
  );
}
