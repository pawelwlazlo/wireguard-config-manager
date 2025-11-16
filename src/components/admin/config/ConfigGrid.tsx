/**
 * ConfigGrid component - responsive grid layout for config cards
 */

import type { ConfigItemVM } from "@/types";
import { ConfigCard } from "./ConfigCard";

interface ConfigGridProps {
  items: ConfigItemVM[];
}

export function ConfigGrid({ items }: ConfigGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Configuration items"
    >
      {items.map((item) => (
        <div key={item.key} role="listitem">
          <ConfigCard item={item} />
        </div>
      ))}
    </div>
  );
}

