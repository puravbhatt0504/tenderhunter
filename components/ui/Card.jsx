import { cn } from "../../lib/utils"

export function Card({ className, children, ...props }) {
    return (
        <div
            className={cn(
                "bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CardHeader({ className, children, ...props }) {
    return <div className={cn("px-6 py-4 border-b border-slate-100/50", className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }) {
    return <h3 className={cn("text-lg font-semibold text-slate-900 tracking-tight", className)} {...props}>{children}</h3>
}

export function CardContent({ className, children, ...props }) {
    return <div className={cn("p-6", className)} {...props}>{children}</div>
}
