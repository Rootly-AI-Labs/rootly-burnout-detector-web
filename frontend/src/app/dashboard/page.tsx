"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Activity,
  Users,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  User,
  Flame,
  Shield,
  Zap,
  Brain,
  Heart,
  AlertCircle,
  BarChart3,
  Building,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Integration {
  id: number
  name: string
  organization_name: string
  total_users: number
  is_default: boolean
  created_at: string
  last_used_at: string | null
}

interface AnalysisProgress {
  stage: 'idle' | 'loading' | 'fetching' | 'calculating' | 'preparing' | 'complete' | 'error'
  message: string
  percentage: number
}

interface TeamMember {
  id: string
  name: string
  email: string
  burnoutScore: number
  trend: 'up' | 'down' | 'stable'
  factors: {
    workload: number
    afterHours: number
    weekendWork: number
    incidentLoad: number
    responseTime: number
  }
  recentIncidents: number
  avgResponseTime: string
}

interface AnalysisResult {
  id: string
  integration_id: number
  created_at: string
  team_health_score: number
  at_risk_count: number
  total_members: number
  trends: {
    daily: Array<{ date: string; score: number }>
    weekly: Array<{ week: string; score: number }>
  }
  team_members: TeamMember[]
  recommendations: string[]
}

export default function DashboardPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<string>("")
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'idle',
    message: '',
    percentage: 0
  })
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisResult[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadIntegrations()
    loadPreviousAnalyses()
  }, [])

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
        setPreviousAnalyses(data.analyses)
      }
    } catch (error) {
      console.error('Failed to load previous analyses:', error)
    }
  }

  const runAnalysis = async () => {
    if (!selectedIntegration) {
      toast({
        title: "No integration selected",
        description: "Please select a Rootly integration to analyze",
        variant: "destructive",
      })
      return
    }

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      // Start progress
      setProgress({ stage: 'loading', message: 'Initializing analysis...', percentage: 10 })

      // Simulate progress stages
      setTimeout(() => {
        setProgress({ stage: 'fetching', message: 'Fetching incident data from Rootly...', percentage: 30 })
      }, 1000)

      setTimeout(() => {
        setProgress({ stage: 'calculating', message: 'Calculating burnout indicators...', percentage: 60 })
      }, 3000)

      setTimeout(() => {
        setProgress({ stage: 'preparing', message: 'Preparing analysis report...', percentage: 80 })
      }, 5000)

      const response = await fetch(`${API_BASE}/analyses/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          integration_id: parseInt(selectedIntegration),
          days_back: 30
        })
      })

      if (response.ok) {
        const result = await response.json()
        setCurrentAnalysis(result)
        setProgress({ stage: 'complete', message: 'Analysis complete!', percentage: 100 })
        
        toast({
          title: "Analysis complete",
          description: "Burnout analysis has been completed successfully",
        })

        // Reload previous analyses
        loadPreviousAnalyses()
      } else {
        throw new Error('Analysis failed')
      }
    } catch (error) {
      setProgress({ stage: 'error', message: 'Analysis failed. Please try again.', percentage: 0 })
      toast({
        title: "Analysis failed",
        description: "Unable to complete the analysis. Please try again.",
        variant: "destructive",
      })
    }
  }

  const exportResults = () => {
    if (!currentAnalysis) return

    const dataStr = JSON.stringify(currentAnalysis, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `burnout-analysis-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const getBurnoutLevel = (score: number) => {
    if (score >= 80) return { level: 'Critical', color: 'text-red-600', bg: 'bg-red-100' }
    if (score >= 60) return { level: 'High', color: 'text-orange-600', bg: 'bg-orange-100' }
    if (score >= 40) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { level: 'Low', color: 'text-green-600', bg: 'bg-green-100' }
  }

  // Mock data for demonstration
  const mockAnalysis: AnalysisResult = {
    id: "1",
    integration_id: 1,
    created_at: new Date().toISOString(),
    team_health_score: 72,
    at_risk_count: 3,
    total_members: 12,
    trends: {
      daily: [
        { date: '2024-06-24', score: 65 },
        { date: '2024-06-25', score: 68 },
        { date: '2024-06-26', score: 70 },
        { date: '2024-06-27', score: 69 },
        { date: '2024-06-28', score: 72 },
        { date: '2024-06-29', score: 74 },
        { date: '2024-06-30', score: 72 },
      ],
      weekly: [
        { week: 'Week 1', score: 62 },
        { week: 'Week 2', score: 65 },
        { week: 'Week 3', score: 68 },
        { week: 'Week 4', score: 72 },
      ]
    },
    team_members: [
      {
        id: "1",
        name: "Alex Chen",
        email: "alex@company.com",
        burnoutScore: 85,
        trend: 'up',
        factors: {
          workload: 90,
          afterHours: 85,
          weekendWork: 80,
          incidentLoad: 88,
          responseTime: 82
        },
        recentIncidents: 24,
        avgResponseTime: "8m"
      },
      {
        id: "2",
        name: "Sarah Johnson",
        email: "sarah@company.com",
        burnoutScore: 72,
        trend: 'stable',
        factors: {
          workload: 75,
          afterHours: 70,
          weekendWork: 65,
          incidentLoad: 78,
          responseTime: 72
        },
        recentIncidents: 18,
        avgResponseTime: "12m"
      },
      {
        id: "3",
        name: "Mike Wilson",
        email: "mike@company.com",
        burnoutScore: 45,
        trend: 'down',
        factors: {
          workload: 50,
          afterHours: 40,
          weekendWork: 35,
          incidentLoad: 55,
          responseTime: 45
        },
        recentIncidents: 8,
        avgResponseTime: "15m"
      }
    ],
    recommendations: [
      "Consider implementing on-call rotation limits for high-risk team members",
      "Review incident distribution - some team members are handling 3x more incidents",
      "Establish quiet hours to reduce after-hours alerts",
      "Consider adding automation for common incident types"
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/images/rootly-logo.svg"
              alt="Rootly"
              width={120}
              height={35}
              className="h-8 w-auto"
            />
            <span className="text-xl font-bold text-gray-900">Burnout Detector</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/setup/rootly')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Analysis Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Run Burnout Analysis</CardTitle>
            <CardDescription>
              Select a Rootly integration and run analysis to detect burnout indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select
                value={selectedIntegration}
                onValueChange={setSelectedIntegration}
                disabled={loadingIntegrations || progress.stage !== 'idle'}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select an integration" />
                </SelectTrigger>
                <SelectContent>
                  {integrations.map((integration) => (
                    <SelectItem key={integration.id} value={integration.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4" />
                        <span>{integration.name}</span>
                        {integration.is_default && (
                          <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={runAnalysis}
                disabled={!selectedIntegration || progress.stage !== 'idle'}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              >
                {progress.stage === 'idle' ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                )}
              </Button>

              {currentAnalysis && (
                <Button
                  variant="outline"
                  onClick={exportResults}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              )}
            </div>

            {/* Progress Bar */}
            {progress.stage !== 'idle' && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{progress.message}</span>
                  <span className="text-gray-600">{progress.percentage}%</span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {(currentAnalysis || true) && ( // Using mock data for now
          <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Team Health Score</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {mockAnalysis.team_health_score}%
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${getBurnoutLevel(mockAnalysis.team_health_score).bg}`}>
                      <Heart className={`w-6 h-6 ${getBurnoutLevel(mockAnalysis.team_health_score).color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">At Risk Members</p>
                      <p className="text-3xl font-bold text-red-600">
                        {mockAnalysis.at_risk_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-red-100">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Members</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {mockAnalysis.total_members}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Analysis Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100">
                      <Calendar className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Team Members */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="team">Team Members</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Burnout Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={mockAnalysis.trends.daily}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#f97316" 
                            strokeWidth={2}
                            dot={{ fill: '#f97316' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Burnout Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={mockAnalysis.trends.weekly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Area 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#f97316" 
                            fill="#fed7aa"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Team Members List */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Team Members</CardTitle>
                        <CardDescription>
                          Click on a team member to view detailed analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {mockAnalysis.team_members.map((member) => {
                            const burnoutLevel = getBurnoutLevel(member.burnoutScore)
                            return (
                              <div
                                key={member.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  selectedMember?.id === member.id 
                                    ? 'border-orange-500 bg-orange-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setSelectedMember(member)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">{member.name}</p>
                                      <p className="text-sm text-gray-600">{member.email}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center space-x-2">
                                      <Badge className={`${burnoutLevel.bg} ${burnoutLevel.color}`}>
                                        {burnoutLevel.level}
                                      </Badge>
                                      {member.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                                      {member.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                      {member.burnoutScore}%
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Flame className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      {member.recentIncidents} incidents
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">
                                      {member.avgResponseTime} avg response
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Selected Member Details */}
                  <div>
                    {selectedMember && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Burnout Factors</CardTitle>
                          <CardDescription>{selectedMember.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={[
                              { factor: 'Workload', value: selectedMember.factors.workload },
                              { factor: 'After Hours', value: selectedMember.factors.afterHours },
                              { factor: 'Weekend Work', value: selectedMember.factors.weekendWork },
                              { factor: 'Incident Load', value: selectedMember.factors.incidentLoad },
                              { factor: 'Response Time', value: selectedMember.factors.responseTime },
                            ]}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="factor" />
                              <PolarRadiusAxis domain={[0, 100]} />
                              <Radar 
                                name="Burnout Factors" 
                                dataKey="value" 
                                stroke="#f97316" 
                                fill="#fed7aa" 
                                fillOpacity={0.6} 
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>
                      AI-powered suggestions to reduce team burnout
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockAnalysis.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="mt-0.5">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          </div>
                          <p className="text-gray-700">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}