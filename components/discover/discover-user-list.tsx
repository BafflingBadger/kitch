"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import type { UserSearchResult } from "@/app/(dashboard)/discover/actions";
import { Avatar } from "@/components/ui/avatar";

export function DiscoverUserList({
  users,
  initialQuery,
}: {
  users: UserSearchResult[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");

  // Next.js can reuse this component across navigations that only change the
  // `q` param (e.g. searching again from the topbar while already on this
  // page), so the initial-value useState above won't pick up later prop
  // changes on its own — re-sync whenever a fresh initialQuery arrives.
  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  const filteredUsers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed
      ? users.filter(
          (user) =>
            user.displayName.toLowerCase().includes(trimmed) ||
            user.username.toLowerCase().includes(trimmed),
        )
      : users;
  }, [users, query]);

  return (
    <div>
      <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-3.5 py-2 focus-within:border-kitch-red/40">
        <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users..."
          className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
        />
      </div>

      <div className="mt-6 max-w-md">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-kitch-grey">
            {query.trim() ? `No users match "${query.trim()}"` : "No other users yet."}
          </p>
        ) : (
          <ul>
            {filteredUsers.map((user) => (
              <li key={user.id} className="border-b border-kitch-charcoal/10 last:border-b-0">
                <Link
                  href={`/users/${user.id}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-kitch-cream-dark"
                >
                  <Avatar
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    sizeClassName="h-10 w-10"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-literata text-base font-semibold text-kitch-charcoal">
                      {user.displayName}
                    </span>
                    <span className="block truncate text-xs text-kitch-grey">
                      @{user.username}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
