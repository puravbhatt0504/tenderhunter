import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export function Button({
    className,
    variant = "primary",
    size = "md",
    isLoading,
    children,
    onClick,
    disabled,
    type = "button",
    ...props
}) {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"

    const variants = {
        primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-lg shadow-primary-500/30",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200 shadow-sm",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/30",
        outline: "border-2 border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
        gradient: "bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:opacity-90 shadow-lg shadow-primary-500/20 border-0"
    }

    const sizes = {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-lg",
        icon: "h-10 w-10 p-2"
    }

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            type={type}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            onClick={onClick}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </motion.button>
    )
}
