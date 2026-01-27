'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/Button'

export function PDFUploader({ onPDFAnalyzed, profile }) {
    const [file, setFile] = useState(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [error, setError] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const [progress, setProgress] = useState('')

    const handleDragOver = useCallback((e) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type === 'application/pdf') {
            setFile(droppedFile)
            setError('')
        } else {
            setError('Please upload a PDF file')
        }
    }, [])

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile)
            setError('')
        } else {
            setError('Please upload a PDF file')
        }
    }

    const removeFile = () => {
        setFile(null)
        setError('')
    }

    const analyzePDF = async () => {
        if (!file) return

        setIsAnalyzing(true)
        setError('')
        setProgress('Reading PDF...')

        try {
            // Convert PDF to base64
            const base64 = await fileToBase64(file)

            setProgress('Analyzing with AI...')

            // Send to API for analysis
            const response = await fetch('/api/analyze-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pdfData: base64,
                    fileName: file.name,
                    profile: profile
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to analyze PDF')
            }

            const result = await response.json()

            setProgress('Analysis complete!')

            // Pass the analysis result to parent component
            if (onPDFAnalyzed) {
                onPDFAnalyzed(result.analysis)
            }

            // Reset after success
            setTimeout(() => {
                setFile(null)
                setProgress('')
            }, 2000)

        } catch (err) {
            console.error('PDF Analysis Error:', err)
            setError(err.message || 'Failed to analyze PDF. Please try again.')
            setProgress('')
        } finally {
            setIsAnalyzing(false)
        }
    }

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                // Remove the data:application/pdf;base64, prefix
                const base64 = reader.result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = (error) => reject(error)
        })
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">PDF Analyzer</h3>
                    <p className="text-xs text-slate-500">Upload tender documents for deep analysis</p>
                </div>
            </div>

            {/* Upload Area */}
            {!file ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all
            ${isDragging
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-purple-50/50'
                        }
          `}
                >
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-purple-600' : 'text-slate-400'}`} />

                    <p className="text-sm font-medium text-slate-700 mb-1">
                        Drop PDF here or click to browse
                    </p>
                    <p className="text-xs text-slate-500">
                        Maximum file size: 10MB
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* File Preview */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <FileText className="w-8 h-8 text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        {!isAnalyzing && (
                            <button
                                onClick={removeFile}
                                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        )}
                    </div>

                    {/* Progress */}
                    {progress && (
                        <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 p-3 rounded-lg">
                            {isAnalyzing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>{progress}</span>
                        </div>
                    )}

                    {/* Analyze Button */}
                    <Button
                        onClick={analyzePDF}
                        disabled={isAnalyzing}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        isLoading={isAnalyzing}
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Analyze PDF with AI'}
                    </Button>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                    <strong>💡 Tip:</strong> Upload the complete tender document for best results. The AI will extract requirements, deadlines, and eligibility criteria automatically.
                </p>
            </div>
        </div>
    )
}
