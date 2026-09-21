"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Full reload rather than router.push: a client transition leaves the page
    // you were on in Next's router cache with its React state intact, and
    // router.refresh() only revalidates server components -- it preserves
    // client state by design. That carried one person's settings state, an
    // open delete dialog included, into whoever signed in next. A real page
    // load tears the tree down and re-renders the server with no session.
    window.location.href = "/auth/login";
  };

  return (
    <Button onClick={logout} className={className}>
      {children ?? "Logout"}
    </Button>
  );
}
