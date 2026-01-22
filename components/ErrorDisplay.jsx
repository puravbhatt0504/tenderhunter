import { AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export function ErrorDisplay({ error }) {
    if (!error) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm"
        >
            <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
            </div>
        </motion.div>
    )
}
