import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

export type DashboardCardProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  headerAction?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardCard({ title, icon, children, headerAction, className, contentClassName }: DashboardCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          {icon && <div className="text-slate-500">{icon}</div>}
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </CardHeader>
      <CardContent className={cn(contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
