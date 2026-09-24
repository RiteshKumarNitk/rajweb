import { ReactNode } from "react";
import { UseFormRegister, FieldValues, Path, FieldErrors } from "react-hook-form";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

export type FormField<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  type?: "text" | "number" | "date" | "email" | "password" | "textarea" | "select" | "tel";
  placeholder?: string;
  options?: { label: string; value: string | number }[];
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  className?: string;
};

export type FormBuilderProps<T extends FieldValues> = {
  fields: FormField<T>[];
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
};

export function FormBuilder<T extends FieldValues>({ fields, register, errors }: FormBuilderProps<T>) {
  return (
    <>
      {fields.map((field) => {
        const error = errors?.[field.name]?.message as string | undefined;
        
        return (
          <div key={field.name} className={`space-y-2 w-full ${field.className || ""}`}>
            <Label htmlFor={field.name}>{field.label}</Label>
            
            {field.type === "textarea" ? (
              <Textarea
                id={field.name}
                placeholder={field.placeholder}
                disabled={field.disabled}
                {...register(field.name)}
              />
            ) : field.type === "select" ? (
              <select
                id={field.name}
                disabled={field.disabled}
                className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:bg-slate-100 disabled:opacity-50"
                {...register(field.name)}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={field.name}
                type={field.type || "text"}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                disabled={field.disabled}
                {...register(field.name)}
              />
            )}
            
            {error && <p className="text-sm text-secondary">{error}</p>}
          </div>
        );
      })}
    </>
  );
}
