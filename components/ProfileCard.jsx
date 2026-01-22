import { FileText, Save, IndianRupee, Briefcase, Award, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Button } from './ui/Button'
import { useState } from 'react'

export function ProfileCard({ profile, setProfile }) {
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }))
        setSaved(false)
    }

    const handleSave = () => {
        setIsSaving(true)
        setTimeout(() => {
            localStorage.setItem('tenderProfile', JSON.stringify(profile))
            setIsSaving(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }, 500)
    }

    return (
        <Card className="h-full border-l-4 border-l-violet-500 bg-gradient-to-br from-white to-violet-50/30">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Company Profile</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">Your business details</p>
                        </div>
                    </div>
                    {saved && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium animate-fade-in">
                            ✓ Saved
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Industry Keywords
                    </label>
                    <Input
                        value={profile.keywords || ''}
                        onChange={(e) => handleChange('keywords', e.target.value)}
                        placeholder="IT services, infrastructure, healthcare..."
                        className="bg-white/80"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                        Annual Turnover
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                        <Input
                            value={profile.annualTurnover || ''}
                            onChange={(e) => handleChange('annualTurnover', e.target.value)}
                            placeholder="e.g., 1 Cr - 10 Cr"
                            className="pl-8 bg-white/80"
                        />
                    </div>
                    <p className="text-xs text-slate-400">Enter in Crores (Cr) or Lakhs (L)</p>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Years of Experience
                    </label>
                    <Input
                        type="number"
                        value={profile.yearsOfExperience || ''}
                        onChange={(e) => handleChange('yearsOfExperience', e.target.value)}
                        placeholder="e.g., 10"
                        className="bg-white/80"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        Certifications & Registrations
                    </label>
                    <Textarea
                        value={profile.certifications || ''}
                        onChange={(e) => handleChange('certifications', e.target.value)}
                        placeholder="ISO 9001, MSME, GST Registered, GeM Seller..."
                        rows={3}
                        className="bg-white/80"
                    />
                </div>

                <Button
                    onClick={handleSave}
                    variant="gradient"
                    className="w-full mt-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/25"
                    isLoading={isSaving}
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
            </CardContent>
        </Card>
    )
}
