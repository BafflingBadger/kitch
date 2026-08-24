import { Bell, Plus, Search } from "lucide-react";

export function CookbookTopbar() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex w-full max-w-md items-center gap-2 rounded-full border border-kitch-charcoal/10 bg-kitch-cream-dark px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-kitch-grey" />
        <input
          type="text"
          placeholder="Search recipes, ingredients..."
          className="w-full bg-transparent text-sm text-kitch-charcoal placeholder:text-kitch-grey focus:outline-none"
        />
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-kitch-charcoal/70 hover:bg-kitch-cream-dark"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-kitch-red" />
        </button>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-kitch-orange-from to-kitch-orange-to px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Recipe
        </button>
      </div>
    </div>
  );
}
