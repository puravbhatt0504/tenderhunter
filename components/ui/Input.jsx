import { cn } from "../../lib/utils"

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                "flex h-10 w-full rounded-md border border-slate-200 bg-white/50 px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 focus:bg-white",
                className
            )}
            {...props}
        />
    )
}
