import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
}

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <section className="bg-primary py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {eyebrow && (
          <span className="text-sm font-bold uppercase tracking-wider text-accent">{eyebrow}</span>
        )}
        <h1 className="mt-2 text-3xl font-extrabold text-white md:text-4xl lg:text-5xl">{title}</h1>
        {description && (
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">{description}</p>
        )}
      </div>
    </section>
  );
}

export function PageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8", className)}>{children}</div>
  );
}
