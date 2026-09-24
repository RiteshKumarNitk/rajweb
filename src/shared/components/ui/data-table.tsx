import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/components/ui/empty-state";

export type ColumnDef<T> = {
  header: ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string | number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
};

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  emptyTitle = "No results found",
  emptyDescription,
  emptyAction,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn("pb-3 pr-4 font-semibold text-slate-600", col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  action={emptyAction}
                  className="p-4"
                />
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="border-b border-slate-100">
                {columns.map((col, i) => (
                  <td key={i} className={cn("py-3 pr-4", col.className)}>
                    {col.cell ? col.cell(item) : col.accessorKey ? (item[col.accessorKey] as ReactNode) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
