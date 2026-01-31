import { ExternalLink, Loader2, CheckCircle2, XCircle, Building2, Calendar, MapPin } from 'lucide-react'
import { Badge } from './ui/Badge'
import { motion } from 'framer-motion'

export function TenderCard({ tender, onSelectTender }) {
    const getEligibilityBadge = () => {
        if (tender.isEligible === true) {
            return (
                <Badge variant="success" className="animate-fade-in bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm hover-glow">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Eligible
                </Badge>
            )
        } else if (tender.isEligible === false) {
            return (
                <Badge variant="destructive" className="animate-fade-in bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-sm">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Eligible
                </Badge>
            )
        } else if (tender.isCheckingEligibility) {
            return (
                <Badge variant="warning" className="animate-pulse bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 shimmer">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Checking...
                </Badge>
            )
        }
        return null
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            onClick={() => onSelectTender(tender)}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer overflow-hidden hover-tilt spotlight"
        >
            {/* Decorative gradient accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Hover background effect with shimmer */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3 gap-4">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-base font-semibold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors line-clamp-2">
                                {tender.title}
                            </h3>
                            {getEligibilityBadge()}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            {tender.authority && (
                                <div className="flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-medium text-slate-600">{tender.authority}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {tender.url && (
                        <a
                            href={tender.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 hover:scale-110 hover:shadow-md magnetic ripple group/link"
                            title="Open tender portal (search for this tender on the portal)"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span className="absolute right-0 top-full mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover/link:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                Opens portal search page
                            </span>
                        </a>
                    )}
                </div>

                {tender.summary && (
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/50 rounded-lg p-3 border border-slate-100 group-hover:bg-white transition-colors">
                        {tender.summary}
                    </p>
                )}

                {tender.eligibilityReason && tender.isEligible !== undefined && (
                    <div className={`mt-3 text-xs px-3 py-2 rounded-lg animate-fade-in ${tender.isEligible
                        ? 'bg-green-50 text-green-700 border border-green-200/60'
                        : 'bg-red-50 text-red-700 border border-red-200/60'
                        }`}>
                        <span className="font-medium">Reason:</span> {tender.eligibilityReason}
                    </div>
                )}
            </div>
        </motion.div>
    )
}
