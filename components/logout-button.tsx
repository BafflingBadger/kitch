"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    // Server components still hold the signed-in session until revalidated.
    router.refresh();
  };

  return (
    <Button onClick={logout} className={className}>
      {children ?? "Logout"}
    </Button>
  );
}
