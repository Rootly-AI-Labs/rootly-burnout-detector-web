"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Play,
  Clock,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Download,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Integration {
  id: number
  name: string
  organization_name: string
  total_users: number
  is_default: boolean
  created_at: string
  last_used_at: string | null
  token_suffix: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string
  burnoutScore: number
  riskLevel: 'high' | 'medium' | 'low'
  trend: 'up' | 'down' | 'stable'
  incidentsHandled: number
  avgResponseTime: string
  factors: {
    workload: number
    afterHours: number
    weekendWork: number
    incidentLoad: number
    responseTime: number
  }
}

interface AnalysisResult {
  id: string
  integration_id: number
  created_at: string
  status: string
  time_range: number
  teamName?: string // For display purposes
  timeRange?: string // For display purposes
  overallScore?: number // For display purposes
  trend?: "up" | "down" | "stable" // For display purposes
  atRiskCount?: number // For display purposes
  totalMembers?: number // For display purposes
  lastAnalysis?: string // For display purposes
  trends?: {
    daily: Array<{ date: string; score: number }>
    weekly: Array<{ week: string; score: number }>
    monthly: Array<{ month: string; score: number }>
  } // For display purposes
  teamMembers?: TeamMember[] // For display purposes
  burnoutFactors?: Array<{ factor: string; value: number }> // For display purposes
  analysis_data?: {
    team_health: {
      overall_score: number
      risk_distribution: {
        low: number
        medium: number
        high: number
        critical: number
      }
      health_status: string
    }
    individual_analysis: Array<{
      user_id: string
      name: string
      email: string
      burnout_score: number
      risk_level: string
      factors: {
        workload: number
        after_hours: number
        weekend_work: number
        incident_load: number
        response_time: number
      }
      incident_count: number
      avg_response_time_hours: number
    }>
    insights: Array<{
      type: string
      message: string
      severity: string
    }>
    recommendations: Array<{
      type: string
      message: string
      priority: string
    }>
  }
}

type AnalysisStage = "loading" | "fetching" | "calculating" | "preparing" | "complete"

// Mock data generator
const generateMockAnalysis = (integration: Integration): AnalysisResult => {
  // Add some randomness to make each analysis unique
  const baseScore = 72 + Math.floor(Math.random() * 10) - 5
  const mockMembers: TeamMember[] = [
    {
      id: "1",
      name: "Alex Chen",
      email: "alex.chen@rootly.com",
      role: "Senior Engineer",
      avatar: "/placeholder.svg?height=40&width=40",
      burnoutScore: 85,
      riskLevel: "high",
      trend: "up",
      incidentsHandled: 23,
      avgResponseTime: "12m",
      factors: {
        workload: 90,
        afterHours: 85,
        weekendWork: 70,
        incidentLoad: 95,
        responseTime: 60,
      },
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.johnson@rootly.com",
      role: "Staff Engineer",
      avatar: "/placeholder.svg?height=40&width=40",
      burnoutScore: 78,
      riskLevel: "high",
      trend: "up",
      incidentsHandled: 19,
      avgResponseTime: "8m",
      factors: {
        workload: 80,
        afterHours: 90,
        weekendWork: 85,
        incidentLoad: 75,
        responseTime: 45,
      },
    },
    {
      id: "3",
      name: "Mike Rodriguez",
      email: "mike.rodriguez@rootly.com",
      role: "Engineering Manager",
      avatar: "/placeholder.svg?height=40&width=40",
      burnoutScore: 68,
      riskLevel: "medium",
      trend: "stable",
      incidentsHandled: 15,
      avgResponseTime: "15m",
      factors: {
        workload: 70,
        afterHours: 65,
        weekendWork: 60,
        incidentLoad: 80,
        responseTime: 70,
      },
    },
    {
      id: "4",
      name: "Emily Davis",
      email: "emily.davis@rootly.com",
      role: "Senior Engineer",
      avatar: "/placeholder.svg?height=40&width=40",
      burnoutScore: 45,
      riskLevel: "low",
      trend: "down",
      incidentsHandled: 12,
      avgResponseTime: "10m",
      factors: {
        workload: 50,
        afterHours: 40,
        weekendWork: 30,
        incidentLoad: 60,
        responseTime: 45,
      },
    },
  ]

  return {
    id: `analysis-${Date.now()}`,
    integration_id: integration.id,
    created_at: new Date().toISOString(),
    status: "completed",
    time_range: 30,
    teamName: integration.name,
    timeRange: "30", // This will be set from the actual selected range
    overallScore: baseScore,
    trend: baseScore > 72 ? "up" : baseScore < 72 ? "down" : "stable",
    atRiskCount: baseScore > 75 ? 3 : baseScore > 65 ? 2 : 1,
    totalMembers: mockMembers.length,
    lastAnalysis: new Date().toISOString(),
    trends: {
      daily: [
        { date: "Jan 1", score: 65 },
        { date: "Jan 8", score: 68 },
        { date: "Jan 15", score: 72 },
        { date: "Jan 22", score: 75 },
        { date: "Jan 29", score: 72 },
      ],
      weekly: [
        { week: "Week 1", score: 65 },
        { week: "Week 2", score: 68 },
        { week: "Week 3", score: 72 },
        { week: "Week 4", score: 75 },
      ],
      monthly: [
        { month: "Dec", score: 68 },
        { month: "Jan", score: 72 },
        { month: "Feb", score: 75 },
      ],
    },
    teamMembers: mockMembers,
    burnoutFactors: [
      { factor: "Workload", value: 75 },
      { factor: "After Hours", value: 70 },
      { factor: "Weekend Work", value: 60 },
      { factor: "Incident Load", value: 80 },
      { factor: "Response Time", value: 55 },
    ],
  }
}

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<string>("")
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("loading")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisResult[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [timeRange, setTimeRange] = useState("30")
  const [chartType, setChartType] = useState("daily")
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadIntegrations()
    loadPreviousAnalyses()
  }, [])

  const loadPreviousAnalyses = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE}/analyses`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPreviousAnalyses(data.analyses || [])
      }
    } catch (error) {
      console.error('Failed to load previous analyses:', error)
    }
  }

  const loadIntegrations = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${API_BASE}/rootly/integrations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations)
        
        // Set default integration
        const defaultIntegration = data.integrations.find((i: Integration) => i.is_default)
        if (defaultIntegration) {
          setSelectedIntegration(defaultIntegration.id.toString())
        } else if (data.integrations.length > 0) {
          setSelectedIntegration(data.integrations[0].id.toString())
        }
      } else if (response.status === 401) {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
      toast({
        title: "Failed to load integrations",
        description: "Please try refreshing the page",
        variant: "destructive",
      })
    } finally {
      setLoadingIntegrations(false)
    }
  }

  const analysisStages = [
    { key: "loading", label: "Loading data", duration: 1000 },
    { key: "fetching", label: "Fetching incidents", duration: 1500 },
    { key: "calculating", label: "Calculating metrics", duration: 2000 },
    { key: "preparing", label: "Preparing insights", duration: 1000 },
    { key: "complete", label: "Complete", duration: 500 },
  ]

  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState("30")

  const startAnalysis = () => {
    if (!selectedIntegration) {
      toast({
        title: "No integration selected",
        description: "Please select a Rootly integration to analyze",
        variant: "destructive",
      })
      return
    }

    setShowTimeRangeDialog(true)
  }

  const runAnalysisWithTimeRange = async () => {
    setShowTimeRangeDialog(false)
    setTimeRange(selectedTimeRange)
    setAnalysisRunning(true)
    setAnalysisStage("loading")
    setAnalysisProgress(0)

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('No authentication token found')
      }

      // Start the analysis
      const response = await fetch(`${API_BASE}/analyses/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          integration_id: parseInt(selectedIntegration),
          time_range: parseInt(selectedTimeRange),
          include_weekends: true
        }),
      })

      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.detail || 'Failed to start analysis')
      }

      const { id: analysis_id } = responseData
      
      if (!analysis_id) {
        throw new Error('No analysis ID returned from server')
      }

      console.log('Started analysis with ID:', analysis_id)
      
      // Refresh the analyses list to show the new running analysis in sidebar
      await loadPreviousAnalyses()

      // Poll for analysis completion
      let currentStageIndex = 0
      let pollRetryCount = 0
      const maxRetries = 10 // Stop after 10 failed polls
      
      const pollAnalysis = async () => {
        try {
          if (!analysis_id) {
            console.error('Analysis ID is undefined, stopping polling')
            setAnalysisRunning(false)
            return
          }
          
          const pollResponse = await fetch(`${API_BASE}/analyses/${analysis_id}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          })

          if (pollResponse.ok) {
            const analysisData = await pollResponse.json()
            
            if (analysisData.status === 'completed') {
              setAnalysisRunning(false)
              setCurrentAnalysis(analysisData)
              
              // Reload previous analyses from API to ensure sidebar is up-to-date
              await loadPreviousAnalyses()
              
              toast({
                title: "Analysis completed!",
                description: "Your team burnout analysis is ready.",
              })
              return
            } else if (analysisData.status === 'failed') {
              setAnalysisRunning(false)
              toast({
                title: "Analysis failed",
                description: analysisData.error_message || "The analysis could not be completed. Please try again.",
                variant: "destructive",
              })
              return
            }
          }

          // Simulate progress through stages
          if (currentStageIndex < analysisStages.length - 1) {
            const stage = analysisStages[currentStageIndex]
            setAnalysisStage(stage.key as AnalysisStage)
            setAnalysisProgress((currentStageIndex + 1) * (100 / analysisStages.length))
            currentStageIndex++
          }

          // Continue polling
          pollRetryCount = 0 // Reset retry count on successful poll
          setTimeout(pollAnalysis, 2000)
        } catch (error) {
          console.error('Polling error:', error)
          pollRetryCount++
          
          if (pollRetryCount >= maxRetries) {
            console.error('Max polling retries reached, stopping analysis')
            setAnalysisRunning(false)
            toast({
              title: "Analysis polling failed",
              description: "Unable to get analysis status. Please try running the analysis again.",
              variant: "destructive",
            })
            return
          }
          
          // Continue polling with exponential backoff
          setTimeout(pollAnalysis, Math.min(2000 * pollRetryCount, 10000))
        }
      }

      // Start polling after a short delay
      setTimeout(pollAnalysis, 1000)

    } catch (error) {
      console.error('Analysis error:', error)
      setAnalysisRunning(false)
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to run analysis",
        variant: "destructive",
      })
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "text-red-800 bg-red-100 border-red-300"
      case "high":
        return "text-red-600 bg-red-50 border-red-200"
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "low":
        return "text-green-600 bg-green-50 border-green-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-red-500" />
      case "down":
        return <TrendingDown className="w-4 h-4 text-green-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const exportAsJSON = () => {
    if (!currentAnalysis) return
    
    // Create a clean export object
    const exportData = {
      analysis_id: currentAnalysis.id,
      export_date: new Date().toISOString(),
      integration_id: currentAnalysis.integration_id,
      time_range_days: currentAnalysis.time_range,
      team_name: selectedIntegrationData?.name,
      ...currentAnalysis.analysis_data
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `burnout-analysis-${selectedIntegrationData?.name || 'team'}-${new Date().toISOString().split('T')[0]}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleManageIntegrations = () => {
    router.push('/setup/rootly')
  }

  if (loadingIntegrations) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading integrations...</p>
        </div>
      </div>
    )
  }

  if (integrations.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Integrations Found</CardTitle>
            <CardDescription>
              You need to connect at least one Rootly integration to start analyzing team burnout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleManageIntegrations} className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedIntegrationData = integrations.find(i => i.id.toString() === selectedIntegration)
  
  // Generate chart data from real analysis results
  const chartData = currentAnalysis?.analysis_data?.team_health ? [
    { date: "Week 4", score: Math.max(0, currentAnalysis.analysis_data.team_health.overall_score * 10 - 10) },
    { date: "Week 3", score: Math.max(0, currentAnalysis.analysis_data.team_health.overall_score * 10 - 5) },
    { date: "Week 2", score: Math.max(0, currentAnalysis.analysis_data.team_health.overall_score * 10) },
    { date: "Week 1", score: currentAnalysis.analysis_data.team_health.overall_score * 10 },
  ] : []
  
  const memberBarData = currentAnalysis?.analysis_data?.individual_analysis?.map((member) => ({
    name: member.name.split(" ")[0],
    score: member.burnout_score * 10, // Convert 0-10 scale to 0-100 for display
    fill: member.risk_level === "high" || member.risk_level === "critical" ? "#ef4444" : 
          member.risk_level === "medium" ? "#f59e0b" : "#10b981",
  })) || []
  
  const burnoutFactors = currentAnalysis?.analysis_data?.individual_analysis ? [
    { factor: "Workload", value: currentAnalysis.analysis_data.individual_analysis.reduce((avg, m) => avg + m.factors.workload, 0) / currentAnalysis.analysis_data.individual_analysis.length * 10 },
    { factor: "After Hours", value: currentAnalysis.analysis_data.individual_analysis.reduce((avg, m) => avg + m.factors.after_hours, 0) / currentAnalysis.analysis_data.individual_analysis.length * 10 },
    { factor: "Weekend Work", value: currentAnalysis.analysis_data.individual_analysis.reduce((avg, m) => avg + m.factors.weekend_work, 0) / currentAnalysis.analysis_data.individual_analysis.length * 10 },
    { factor: "Incident Load", value: currentAnalysis.analysis_data.individual_analysis.reduce((avg, m) => avg + m.factors.incident_load, 0) / currentAnalysis.analysis_data.individual_analysis.length * 10 },
    { factor: "Response Time", value: currentAnalysis.analysis_data.individual_analysis.reduce((avg, m) => avg + m.factors.response_time, 0) / currentAnalysis.analysis_data.individual_analysis.length * 10 },
  ] : []

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-60"} bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <Image
                  src="/images/rootly-logo.svg"
                  alt="Rootly"
                  width={24}
                  height={24}
                  className="h-6 w-6 invert"
                />
                <span className="font-semibold text-sm">Burnout Detector</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Team Selector */}
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-gray-700">
            <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {integrations.map((integration) => (
                  <SelectItem key={integration.id} value={integration.id.toString()}>
                    {integration.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 flex flex-col p-4 space-y-2">
          <div className="flex-1 space-y-2">
            <Button
              onClick={startAnalysis}
              disabled={analysisRunning}
              className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {!sidebarCollapsed && "New Analysis"}
            </Button>

            <div className="space-y-1">
              {!sidebarCollapsed && previousAnalyses.length > 0 && (
                <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1 mt-4">Recent</p>
              )}
              {previousAnalyses.slice(0, 5).map((analysis) => {
                const analysisDate = new Date(analysis.created_at)
                const timeStr = analysisDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                const dateStr = analysisDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
                const teamName = integrations.find(i => i.id === analysis.integration_id)?.name || 'Unknown Team'
                return (
                  <Button 
                    key={analysis.id}
                    variant="ghost" 
                    className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 py-2 h-auto"
                    onClick={() => setCurrentAnalysis(analysis)}
                  >
                    {sidebarCollapsed ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <div className="flex flex-col items-start w-full text-xs">
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className="font-medium">{teamName}</span>
                          <span className="text-gray-500">{analysis.time_range || 30}d</span>
                        </div>
                        <div className="flex justify-between items-center w-full text-gray-400">
                          <span>{dateStr}</span>
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Separator className="bg-gray-700" />
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleManageIntegrations}
            >
              <Settings className="w-4 h-4 mr-2" />
              {!sidebarCollapsed && "Manage Integrations"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Burnout Analysis</h1>
              <p className="text-gray-600">
                {selectedIntegrationData ? `${selectedIntegrationData.name} - ${selectedIntegrationData.organization_name}` : 'Select a team to analyze'}
              </p>
            </div>
          </div>

          {/* Analysis Running State */}
          {analysisRunning && (
            <Card className="mb-6">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-purple-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {analysisStages.find((s) => s.key === analysisStage)?.label}
                </h3>
                <Progress value={analysisProgress} className="w-full max-w-md mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-4">{Math.round(analysisProgress)}% complete</p>
                <Button variant="outline" onClick={() => setAnalysisRunning(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Analysis Complete State */}
          {!analysisRunning && currentAnalysis && (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">Team Health Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAnalysis?.analysis_data?.team_health ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-gray-900">{Math.round(currentAnalysis.analysis_data.team_health.overall_score * 10)}/100</div>
                          <div className="text-sm font-medium text-purple-600">{currentAnalysis.analysis_data.team_health.health_status}</div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Based on {currentAnalysis.time_range || 30} days of data
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-500">Analysis in progress...</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">At-Risk Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAnalysis?.analysis_data?.team_health ? (
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="text-2xl font-bold text-red-600">{currentAnalysis.analysis_data.team_health.risk_distribution.high + currentAnalysis.analysis_data.team_health.risk_distribution.critical}</div>
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">Out of {currentAnalysis.analysis_data.individual_analysis?.length || 0} members</p>
                      </div>
                    ) : (
                      <div className="text-gray-500">Analysis in progress...</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">Last Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {currentAnalysis.created_at ? new Date(currentAnalysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {currentAnalysis.created_at ? (
                        <>
                          {new Date(currentAnalysis.created_at).toLocaleDateString('en-US', { year: 'numeric' })}, 
                          {' ' + new Date(currentAnalysis.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </>
                      ) : 'No date available'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Trend Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Burnout Trend</CardTitle>
                      <Select value={chartType} onValueChange={setChartType}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey={chartType === 'daily' ? 'date' : 'week'} />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Member Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Member Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberBarData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Burnout Factors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={burnoutFactors}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="factor" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Export Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={exportAsJSON}>
                      <Download className="w-4 h-4 mr-2" />
                      Export as JSON
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled>
                      <Download className="w-4 h-4 mr-2" />
                      Generate PDF Report
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Team Members Grid */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Click on a member to view detailed analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentAnalysis?.analysis_data?.individual_analysis?.map((member) => (
                      <Card
                        key={member.user_id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedMember({
                          id: member.user_id,
                          name: member.name,
                          email: member.email,
                          burnoutScore: member.burnout_score * 10,
                          riskLevel: member.risk_level as 'high' | 'medium' | 'low',
                          trend: 'stable' as const,
                          incidentsHandled: member.incident_count,
                          avgResponseTime: `${Math.round(member.avg_response_time_hours * 60)}m`,
                          factors: {
                            workload: member.factors.workload * 10,
                            afterHours: member.factors.after_hours * 10,
                            weekendWork: member.factors.weekend_work * 10,
                            incidentLoad: member.factors.incident_load * 10,
                            responseTime: member.factors.response_time * 10,
                          }
                        })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">{member.name}</h3>
                                <p className="text-sm text-gray-500">{member.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getRiskColor(member.risk_level)}>{member.risk_level.toUpperCase()}</Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Burnout Score</span>
                              <span className="font-medium">{Math.round(member.burnout_score * 10)}/100</span>
                            </div>
                            <Progress value={member.burnout_score * 10} className="h-2" />
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{member.incident_count} incidents</span>
                              <span>{Math.round(member.avg_response_time_hours * 60)}m avg response</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )) || (
                      <div className="col-span-full text-center text-gray-500 py-8">
                        No team member data available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!analysisRunning && !currentAnalysis && (
            <Card className="text-center p-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
              <p className="text-gray-600 mb-4">
                Click "New Analysis" to start analyzing your team's burnout metrics
              </p>
              <Button onClick={startAnalysis} className="bg-purple-600 hover:bg-purple-700">
                <Play className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Time Range Selection Dialog */}
      <Dialog open={showTimeRangeDialog} onOpenChange={setShowTimeRangeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Analysis Time Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose the time period for analyzing burnout metrics:
            </p>
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowTimeRangeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={runAnalysisWithTimeRange} className="bg-purple-600 hover:bg-purple-700">
                <Play className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={selectedMember?.avatar} />
                <AvatarFallback>
                  {selectedMember?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{selectedMember?.name}</span>
                <p className="text-sm text-gray-500 font-normal">{selectedMember?.role || selectedMember?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Burnout Score</p>
                  <p className="text-2xl font-bold">{selectedMember.burnoutScore}/100</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Risk Level</p>
                  <Badge className={getRiskColor(selectedMember.riskLevel)}>
                    {selectedMember.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Burnout Factors</p>
                <div className="space-y-2">
                  {Object.entries(selectedMember.factors).map(([factor, value]) => (
                    <div key={factor} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{factor.replace(/([A-Z])/g, " $1")}</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={value} className="w-20 h-2" />
                        <span className="text-sm font-medium w-8">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Incidents Handled</p>
                  <p className="font-medium">{selectedMember.incidentsHandled}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Response Time</p>
                  <p className="font-medium">{selectedMember.avgResponseTime}</p>
                </div>
              </div>
              {currentAnalysis?.analysis_data?.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">Recommendations:</p>
                  {currentAnalysis.analysis_data.recommendations.slice(0, 3).map((rec, index) => (
                    <Alert key={index}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{rec.priority} Priority:</strong> {rec.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}