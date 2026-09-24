import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  trend?: {
    value: string | number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  iconClassName?: string;
};

export function StatCard({ title, value, icon, description, trend, className, iconClassName }: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        {icon && <div className={cn("h-5 w-5", iconClassName)}>{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">{value}</div>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        {trend && (
          <p className="mt-1 text-xs text-slate-500">
            <span className={cn("font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
              {trend.value}
            </span>{" "}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
