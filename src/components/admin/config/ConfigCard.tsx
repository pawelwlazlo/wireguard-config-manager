/**
 * ConfigCard component - displays a single configuration key-value pair
 */

import type { ConfigItemVM } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ConfigCardProps {
  item: ConfigItemVM;
}

export function ConfigCard({ item }: ConfigCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isLongValue = item.value.length > 50;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {item.key}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <p
            className={cn(
              "break-words font-mono text-sm",
              isLongValue && "cursor-help"
            )}
            onMouseEnter={() => isLongValue && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            title={isLongValue ? item.value : undefined}
          >
            {isLongValue ? `${item.value.slice(0, 47)}...` : item.value}
          </p>
          {showTooltip && isLongValue && (
            <div className="absolute left-0 top-full z-10 mt-2 max-w-xs rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
              <p className="break-all font-mono">{item.value}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

