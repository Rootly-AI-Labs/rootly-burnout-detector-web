"use client"

import { Activity, X, Play, AlertTriangle, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AnalysisProgressSectionProps {
  analysisRunning: boolean
  analysisStage: string
  analysisProgress: number
  currentAnalysis: any
  shouldShowInsufficientDataCard: () => boolean
  getAnalysisStages: () => any[]
  cancelRunningAnalysis: () => void
  startAnalysis: () => void
  openDeleteDialog: (analysis: any, e: any) => void
}

export function AnalysisProgressSection({
  analysisRunning,
  analysisStage, 
  analysisProgress,
  currentAnalysis,
  shouldShowInsufficientDataCard,
  getAnalysisStages,
  cancelRunningAnalysis,
  startAnalysis,
  openDeleteDialog
}: AnalysisProgressSectionProps) {
  return (
    <>
      {/* Analysis Running State */}
      {analysisRunning && (
        <Card className="mb-6 bg-gradient-to-b from-purple-50 to-white border-purple-200 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-md">
              <Activity className="w-10 h-10 text-purple-600 animate-spin" />
            </div>
            {(() => {
              const currentStage = getAnalysisStages().find((s) => s.key === analysisStage)
              return (
                <>
                  <h3 className="text-xl font-bold mb-2 text-purple-900">
                    {currentStage?.label}
                  </h3>
                  <p className="text-sm text-purple-600 mb-6 font-medium">
                    {currentStage?.detail}
                  </p>
                </>
              )
            })()}
            
            {/* Enhanced Progress Bar */}
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="relative">
                <div className="w-full h-4 bg-purple-100 rounded-full border border-purple-200 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${analysisProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white opacity-30 animate-pulse rounded-full"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-ping rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <p className="text-lg font-semibold text-purple-800">
                {Math.round(analysisProgress)}% complete
              </p>
            </div>
            
            <Button variant="outline" onClick={cancelRunningAnalysis} className="border-purple-300 hover:bg-purple-50 text-purple-700">
              <X className="w-4 h-4 mr-2" />
              Cancel Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Failed Analysis - Show Specific Error or Insufficient Data Message */}
      {shouldShowInsufficientDataCard() && currentAnalysis?.status === 'failed' && (
        <Card className="text-center p-8 border-red-200 bg-red-50">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-red-800">
            {currentAnalysis.error_message?.includes('permission') || currentAnalysis.error_message?.includes('access') ? 
              'API Permission Error' : 'Insufficient Data'}
          </h3>
          <p className="text-red-700 mb-4">
            {currentAnalysis.error_message?.includes('permission') || currentAnalysis.error_message?.includes('access') ? 
              currentAnalysis.error_message : 
              'This analysis has insufficient data to generate meaningful burnout insights. This could be due to lack of organization member data, incident history, or API access issues.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={startAnalysis} 
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Rerun Analysis
            </Button>
            <Button 
              variant="outline" 
              onClick={(e) => {
                if (currentAnalysis) {
                  openDeleteDialog(currentAnalysis, e)
                }
              }}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Selection
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}