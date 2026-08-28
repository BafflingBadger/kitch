export function useDragReorder<T>(items: T[], onChange: (next: T[]) => void) {
  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return { reorder };
}
