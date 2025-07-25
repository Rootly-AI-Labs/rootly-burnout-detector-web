"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  Cell,
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
  Trash2,
  LogOut,
  BookOpen,
  CheckCircle,
  Users,
  Star,
  Info,
  Heart,
  Shield,
  BarChart3,
  Database,
} from "lucide-react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useBackendHealth } from "@/hooks/use-backend-health"

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
  platform?: 'rootly' | 'pagerduty'
  permissions?: {
    users?: {
      access: boolean
    }
    incidents?: {
      access: boolean
    }
  }
}

interface GitHubIntegration {
  id: number
  github_username: string
  organizations: string[]
  token_source: string
  connected_at: string
  last_updated: string
}

interface SlackIntegration {
  id: number
  slack_user_id: string
  workspace_id: string
  token_source: string
  connected_at: string
  last_updated: string
  total_channels?: number
}

interface OrganizationMember {
  id: string
  name: string
  email: string
  role?: string
  avatar?: string
  burnoutScore: number
  burnout_score?: number // API returns snake_case
  riskLevel: 'high' | 'medium' | 'low'
  trend: 'up' | 'down' | 'stable'
  incidentsHandled: number
  incident_count?: number // API returns this
  avgResponseTime: string
  factors: {
    workload: number
    afterHours: number
    weekendWork: number
    incidentLoad: number
    responseTime: number
    // Snake case versions from API
    after_hours?: number
    weekend_work?: number
    incident_load?: number
    response_time?: number
  }
  metrics?: {
    avg_response_time_minutes: number
    after_hours_percentage: number
    weekend_percentage: number
    status_distribution?: any
  }
  github_activity?: {
    commits_count: number
    pull_requests_count: number
    reviews_count: number
    after_hours_commits: number
    weekend_commits: number
    avg_pr_size: number
    burnout_indicators: {
      excessive_commits: boolean
      late_night_activity: boolean
      weekend_work: boolean
      large_prs: boolean
    }
  }
  slack_activity?: {
    messages_sent: number
    channels_active: number
    after_hours_messages: number
    weekend_messages: number
    avg_response_time_minutes: number
    sentiment_score: number
    burnout_indicators: {
      excessive_messaging: boolean
      poor_sentiment: boolean
      late_responses: boolean
      after_hours_activity: boolean
    }
  }
  // Additional fields from API response
  user_id?: string
  user_name?: string
  user_email?: string
  risk_level?: string
}

interface AnalysisResult {
  id: string
  integration_id: number
  created_at: string
  status: string
  time_range: number
  error_message?: string
  organizationName?: string // For display purposes
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
  organizationMembers?: OrganizationMember[] // For display purposes
  burnoutFactors?: Array<{ factor: string; value: number }> // For display purposes
  analysis_data?: {
    data_sources: {
      incident_data: boolean
      github_data: boolean
      slack_data: boolean
      github_users_analyzed?: number
      slack_users_analyzed?: number
    }
    team_health: {
      overall_score: number
      risk_distribution: {
        low: number
        medium: number
        high: number
      }
      health_status: string
      data_source_contributions?: {
        incident_contribution: number
        github_contribution: number
        slack_contribution: number
      }
    }
    team_summary?: {
      total_users: number
      average_score: number
      highest_score: number
      risk_distribution: {
        high: number
        medium: number
        low: number
      }
      users_at_risk: number
    }
    team_analysis: {
      members: Array<{
        user_id: string
        user_name: string
        user_email: string
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
        metrics: {
          avg_response_time_minutes: number
          after_hours_percentage: number
          weekend_percentage: number
          status_distribution?: any
        }
        github_activity?: any
        slack_activity?: any
      }>
    } | Array<{
      user_id: string
      user_name: string
      user_email: string
      burnout_score: number
      risk_level: string
      incident_count: number
      key_metrics?: {
        incidents_per_week: number
        severity_weighted_per_week?: number
        after_hours_percentage: number
        avg_resolution_hours: number
      }
      recommendations?: string[]
      factors?: any
      metrics?: any
      github_activity?: any
      slack_activity?: any
    }>
    github_insights?: {
      total_commits: number
      total_pull_requests: number
      total_reviews: number
      after_hours_activity_percentage: number
      weekend_activity_percentage: number
      top_contributors: Array<{
        username: string
        commits: number
        prs: number
        reviews: number
      }>
      burnout_indicators: {
        excessive_late_night_commits: number
        large_pr_pattern: number
        weekend_workers: number
      }
    }
    slack_insights?: {
      total_messages: number
      active_channels: number
      avg_response_time_minutes: number
      after_hours_activity_percentage: number
      weekend_activity_percentage: number
      sentiment_analysis: {
        avg_sentiment: number
        negative_sentiment_users: number
      }
      burnout_indicators: {
        excessive_messaging: number
        poor_sentiment_users: number
        after_hours_communicators: number
      }
    }
    insights: Array<{
      type: string
      message: string
      severity: string
      source?: 'incident' | 'github' | 'slack' | 'combined'
    }>
    recommendations: Array<{
      type: string
      message: string
      priority: string
      source?: 'incident' | 'github' | 'slack' | 'combined'
    }>
    partial_data?: {
      users: Array<any>
      incidents: Array<any>
      metadata: any
    }
    error?: string
    data_collection_successful?: boolean
    failure_stage?: string
    session_hours?: number
    total_incidents?: number
    ai_team_insights?: {
      available: boolean
      summary?: string
      recommendations?: string[]
      key_insights?: string[]
      insights?: {
        team_size?: number
        risk_distribution?: {
          high: number
          medium: number
          low: number
        }
        [key: string]: any
      }
    }
    daily_trends?: Array<{
      date: string
      overall_score: number
      incident_count: number
      severity_weighted_count: number
      after_hours_count: number
      users_involved: number
      members_at_risk: number
      total_members: number
      health_status: string
    }>
    period_summary?: {
      average_score: number
      days_analyzed: number
      total_days_with_data: number
    }
  }
}

type AnalysisStage = "loading" | "connecting" | "fetching_users" | "fetching" | "fetching_github" | "fetching_slack" | "calculating" | "analyzing" | "preparing" | "complete"

// Mock data generator
const generateMockAnalysis = (integration: Integration): AnalysisResult => {
  // Add some randomness to make each analysis unique
  const baseScore = 72 + Math.floor(Math.random() * 10) - 5
  const mockMembers: OrganizationMember[] = [
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
    organizationName: integration.name,
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
    organizationMembers: mockMembers,
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
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)
  const [dropdownLoading, setDropdownLoading] = useState(false)
  const [analysisRunning, setAnalysisRunning] = useState(false)
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("loading")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [previousAnalyses, setPreviousAnalyses] = useState<AnalysisResult[]>([])
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)
  const [timeRange, setTimeRange] = useState("30")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [analysisToDelete, setAnalysisToDelete] = useState<AnalysisResult | null>(null)
  const [debugSectionOpen, setDebugSectionOpen] = useState(false)
  const [riskFactorsExpanded, setRiskFactorsExpanded] = useState(false)
  // Removed member view mode - only showing radar chart now
  const [historicalTrends, setHistoricalTrends] = useState<any>(null)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [hasDataFromCache, setHasDataFromCache] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Backend health monitoring - temporarily disabled
  // const { isHealthy, healthStatus } = useBackendHealth({
  //   showToasts: true,
  //   autoStart: true,
  // })

  // Function to update URL with analysis ID
  const updateURLWithAnalysis = (analysisId: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (analysisId) {
      params.set('analysis', analysisId.toString())
    } else {
      params.delete('analysis')
    }
    
    // Update URL without page reload
    router.push(`/dashboard?${params.toString()}`, { scroll: false })
  }

  // Function to clear integration cache
  const clearIntegrationCache = () => {
    localStorage.removeItem('all_integrations')
    localStorage.removeItem('all_integrations_timestamp')
    console.log('Integration cache cleared')
  }

  // Helper function to determine if insufficient data card should be shown
  const shouldShowInsufficientDataCard = () => {
    if (!currentAnalysis || analysisRunning) return false
    
    // Show for failed analyses
    if (currentAnalysis.status === 'failed') return true
    
    // Show for completed analyses with no meaningful data
    if (currentAnalysis.status === 'completed') {
      // Check if we have team_health or team_summary data but with no meaningful content
      if (currentAnalysis.analysis_data?.team_health || currentAnalysis.analysis_data?.team_summary) {
        // Check if the analysis has 0 members - this indicates insufficient data
        const teamAnalysis = currentAnalysis.analysis_data.team_analysis
        
        // Handle both array format (team_analysis directly) and object format (team_analysis.members)
        const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
        const hasNoMembers = !members || members.length === 0
        
        if (hasNoMembers) {
          return true // Show insufficient data card
        }
        
        return false // Has meaningful data - even if 0 incidents, show normal dashboard
      }
      
      // If we have partial data with incidents/users, show the partial data UI
      if (currentAnalysis.analysis_data?.partial_data) {
        return false
      }
      
      // If we have team_analysis with members, we have data
      const teamAnalysis = currentAnalysis.analysis_data?.team_analysis
      const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
      if (members && members.length > 0) {
        return false
      }
      
      // Otherwise, insufficient data
      return true
    }
    
    return false
  }

  useEffect(() => {
    // Check for organization parameter from URL
    const urlParams = new URLSearchParams(window.location.search)
    const orgId = urlParams.get('org')
    const analysisId = urlParams.get('analysis')
    
    // Add event listener for page focus to refresh integrations
    const handlePageFocus = () => {
      console.log('Page focused, checking if integrations need refresh')
      // Force refresh integrations when page regains focus
      loadIntegrations(true, false)
    }

    window.addEventListener('focus', handlePageFocus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handlePageFocus()
      }
    })

    // Load cached integrations first
    const cachedIntegrations = localStorage.getItem('all_integrations')
    const cacheTimestamp = localStorage.getItem('all_integrations_timestamp')
    
    if (cachedIntegrations && cacheTimestamp) {
      // Check if cache is less than 5 minutes old for more frequent updates
      const cacheAge = Date.now() - parseInt(cacheTimestamp)
      const fiveMinutes = 5 * 60 * 1000
      
      if (cacheAge < fiveMinutes) {
        try {
          const parsed = JSON.parse(cachedIntegrations)
          setIntegrations(parsed)
          
          // Also load GitHub and Slack from cache if available
          const cachedGithub = localStorage.getItem('github_integration')
          const cachedSlack = localStorage.getItem('slack_integration')
          
          if (cachedGithub) {
            const githubData = JSON.parse(cachedGithub)
            if (githubData.connected && githubData.integration) {
              setGithubIntegration(githubData.integration)
            } else {
              setGithubIntegration(null)
            }
          }
          
          if (cachedSlack) {
            const slackData = JSON.parse(cachedSlack)
            if (slackData.connected && slackData.integration) {
              setSlackIntegration(slackData.integration)
            } else {
              setSlackIntegration(null)
            }
          }
          
          // Set integration based on URL parameter, saved preference, or first available
          if (orgId) {
            setSelectedIntegration(orgId)
            // Save this selection for future use
            localStorage.setItem('selected_organization', orgId)
          } else {
            // Check for saved organization preference
            const savedOrg = localStorage.getItem('selected_organization')
            if (savedOrg && parsed.find((i: Integration) => i.id.toString() === savedOrg)) {
              setSelectedIntegration(savedOrg)
            } else if (parsed.length > 0) {
              // Fall back to first available organization
              setSelectedIntegration(parsed[0].id.toString())
              localStorage.setItem('selected_organization', parsed[0].id.toString())
            }
          }
        } catch (e) {
          console.error('Failed to parse cached integrations:', e)
        }
        
        // Set loading to false when using cache
        setLoadingIntegrations(false)
        setHasDataFromCache(true)
        
        // Still need to load previous analyses and trends even if integrations are cached
        loadPreviousAnalyses()
        loadHistoricalTrends()
        
        return // Exit early since we used cache
      }
    }
    
    const loadInitialData = async () => {
      try {
        // If we already have cached data, mark as loaded immediately
        if (hasDataFromCache) {
          setInitialDataLoaded(true)
          return
        }
        
        // Load data with individual error handling to prevent blocking
        const results = await Promise.allSettled([
          loadPreviousAnalyses(),
          loadIntegrations(),
          loadHistoricalTrends()
        ])
        
        // Log any failures but don't block the UI
        results.forEach((result, index) => {
          const functionNames = ['loadPreviousAnalyses', 'loadIntegrations', 'loadHistoricalTrends']
          if (result.status === 'rejected') {
            console.error(`${functionNames[index]} failed:`, result.reason)
          }
        })
        
        setInitialDataLoaded(true)
      } catch (error) {
        console.error('Error loading initial data:', error)
        // Always set to true to prevent endless loading, even if some data fails
        setInitialDataLoaded(true)
      }
    }
    
    loadInitialData()
    
    // Fallback timeout to prevent endless loading (max 10 seconds)
    const timeoutId = setTimeout(() => {
      console.warn('Initial data loading timed out after 10 seconds')
      setInitialDataLoaded(true)
    }, 10000)
    
    // Load specific analysis if provided in URL
    if (analysisId) {
      loadSpecificAnalysis(parseInt(analysisId))
    }

    // Listen for localStorage changes (when integrations are updated on other pages)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'all_integrations' && e.newValue) {
        console.log('Detected integration cache update, refreshing...')
        try {
          const updatedIntegrations = JSON.parse(e.newValue)
          setIntegrations(updatedIntegrations)
          
          // Also check for GitHub/Slack updates
          const githubCache = localStorage.getItem('github_integration')
          const slackCache = localStorage.getItem('slack_integration')
          
          if (githubCache) {
            const githubData = JSON.parse(githubCache)
            setGithubIntegration(githubData.connected ? githubData.integration : null)
          }
          
          if (slackCache) {
            const slackData = JSON.parse(slackCache)
            setSlackIntegration(slackData.integration)
          }
        } catch (e) {
          console.error('Failed to parse updated integrations:', e)
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)

    // Cleanup event listeners and timeout
    return () => {
      window.removeEventListener('focus', handlePageFocus)
      document.removeEventListener('visibilitychange', handlePageFocus)
      window.removeEventListener('storage', handleStorageChange)
      clearTimeout(timeoutId)
    }
  }, [])

  // Smooth progress animation effect
  useEffect(() => {
    if (!analysisRunning) return

    const interval = setInterval(() => {
      setAnalysisProgress(currentProgress => {
        if (currentProgress < targetProgress) {
          // Increment by 1 towards target, with small random variations
          const increment = Math.random() > 0.7 ? 2 : 1 // Occasionally jump by 2
          return Math.min(currentProgress + increment, targetProgress)
        }
        return currentProgress
      })
    }, 200) // Update every 200ms for smooth animation

    return () => clearInterval(interval)
  }, [analysisRunning, targetProgress])

  // Load historical trends when current analysis changes
  useEffect(() => {
    if (currentAnalysis?.integration_id) {
      loadHistoricalTrends(currentAnalysis.integration_id)
    }
  }, [currentAnalysis])

  const loadPreviousAnalyses = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.warn('No auth token found, skipping previous analyses load')
        return
      }

      console.log('Loading previous analyses...')
      let response
      try {
        response = await fetch(`${API_BASE}/analyses`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      } catch (networkError) {
        console.error('Network error loading analyses:', networkError)
        throw new Error('Cannot connect to backend server')
      }

      if (response.ok) {
        const data = await response.json()
        console.log('Loaded analyses:', data.analyses?.length || 0, 'analyses')
        console.log('Previous analyses data:', data.analyses)
        setPreviousAnalyses(data.analyses || [])
        
        // If no specific analysis is loaded and we have analyses, load the most recent one
        const urlParams = new URLSearchParams(window.location.search)
        const analysisId = urlParams.get('analysis')
        
        if (!analysisId && data.analyses && data.analyses.length > 0 && !currentAnalysis) {
          const mostRecentAnalysis = data.analyses[0] // Analyses should be ordered by created_at desc
          console.log('Auto-loading most recent analysis:', mostRecentAnalysis.id)
          setCurrentAnalysis(mostRecentAnalysis)
        }
      } else {
        console.error('Failed to load analyses, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to load previous analyses:', error)
      
      // Check if this is a network connectivity issue
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.name === 'TypeError'
      )
      
      if (isNetworkError) {
        toast.error("Cannot connect to backend")
      }
    }
  }

  const loadSpecificAnalysis = async (analysisId: number) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      const response = await fetch(`${API_BASE}/analyses/${analysisId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const analysis = await response.json()
        console.log('Loaded specific analysis from URL:', analysis.id)
        setCurrentAnalysis(analysis)
      } else {
        console.error('Failed to load analysis:', analysisId)
        // Remove invalid analysis ID from URL
        updateURLWithAnalysis(null)
      }
    } catch (error) {
      console.error('Error loading specific analysis:', error)
    }
  }

  const loadHistoricalTrends = async (integrationId?: number) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.error('No auth token found in localStorage')
        return
      }
      
      console.log('Auth token found:', authToken ? `${authToken.substring(0, 10)}...` : 'null')

      setLoadingTrends(true)
      console.log('Loading historical trends...')
      
      // Use the same time range as the current analysis
      const analysisTimeRange = currentAnalysis?.time_range || 30
      const params = new URLSearchParams({ days_back: analysisTimeRange.toString() })
      if (integrationId) {
        params.append('integration_id', integrationId.toString())
      }

      const fullUrl = `${API_BASE}/analyses/trends/historical?${params}`
      console.log('Making request to:', fullUrl)
      console.log('API_BASE:', API_BASE)
      console.log('Params:', params.toString())
      
      // Test the main analyses endpoint with same auth token to verify auth works
      console.log('Testing main analyses endpoint with same token...')
      try {
        const testResponse = await fetch(`${API_BASE}/analyses`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        console.log('Main analyses endpoint test status:', testResponse.status)
      } catch (testError) {
        console.log('Main analyses endpoint test error:', testError)
      }
      
      let response
      try {
        response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      } catch (networkError) {
        console.error('Network error loading trends:', networkError)
        throw new Error('Cannot connect to backend server')
      }

      if (response.ok) {
        const data = await response.json()
        console.log('Loaded historical trends:', data)
        setHistoricalTrends(data)
      } else {
        console.error('Failed to load trends, status:', response.status)
        console.error('Response URL:', response.url)
        console.error('Response headers:', [...response.headers.entries()])
        const errorText = await response.text()
        console.error('Response body:', errorText)
      }
    } catch (error) {
      console.error('Failed to load historical trends:', error)
    } finally {
      setLoadingTrends(false)
    }
  }

  const openDeleteDialog = (analysis: AnalysisResult, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the analysis selection
    setAnalysisToDelete(analysis)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteAnalysis = async () => {
    if (!analysisToDelete) return

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      console.log('Deleting analysis:', analysisToDelete.id)
      
      const response = await fetch(`${API_BASE}/analyses/${analysisToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      console.log('Delete response status:', response.status)

      if (response.ok) {
        console.log('Delete successful, updating local state...')
        console.log('Current analyses before delete:', previousAnalyses.map(a => ({id: a.id, integration_id: a.integration_id})))
        console.log('Deleting analysis with ID:', analysisToDelete.id, 'type:', typeof analysisToDelete.id)
        
        // Immediately remove from local state - be more explicit about ID matching
        setPreviousAnalyses(prev => {
          const filtered = prev.filter(a => {
            const match = a.id === analysisToDelete.id || String(a.id) === String(analysisToDelete.id)
            console.log(`Comparing ${a.id} (${typeof a.id}) with ${analysisToDelete.id} (${typeof analysisToDelete.id}): ${match ? 'REMOVE' : 'KEEP'}`)
            return !match
          })
          console.log('Filtered analyses:', filtered.map(a => ({id: a.id, integration_id: a.integration_id})))
          return filtered
        })
        
        // If the deleted analysis was currently selected, clear it
        if (currentAnalysis?.id === analysisToDelete.id) {
          console.log('Clearing currently selected analysis')
          setCurrentAnalysis(null)
          updateURLWithAnalysis(null)
        }
        
        toast.success("Analysis deleted")
        
        // Close dialog and reset state
        setDeleteDialogOpen(false)
        setAnalysisToDelete(null)
        
        // Also reload from server to ensure consistency
        console.log('Reloading analyses list from server...')
        setTimeout(() => loadPreviousAnalyses(), 500)
        
      } else {
        const errorData = await response.json()
        console.error('Delete failed:', errorData)
        throw new Error(errorData.detail || 'Failed to delete analysis')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : "Failed to delete analysis")
      setDeleteDialogOpen(false)
      setAnalysisToDelete(null)
    }
  }

  const loadIntegrations = async (forceRefresh = false, showGlobalLoading = true) => {
    // Check if we have valid cached data and don't need to refresh
    if (!forceRefresh && integrations.length > 0) {
      return
    }

    // Check localStorage cache
    if (!forceRefresh) {
      const cachedIntegrations = localStorage.getItem('all_integrations')
      const cacheTimestamp = localStorage.getItem('all_integrations_timestamp')
      
      if (cachedIntegrations && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp)
        const fiveMinutes = 5 * 60 * 1000
        
        if (cacheAge < fiveMinutes) {
          try {
            const cached = JSON.parse(cachedIntegrations)
            setIntegrations(cached)
            
            // Also load GitHub and Slack from cache if available
            const cachedGithub = localStorage.getItem('github_integration')
            const cachedSlack = localStorage.getItem('slack_integration')
            
            if (cachedGithub) {
              const githubData = JSON.parse(cachedGithub)
              if (githubData.connected && githubData.integration) {
                setGithubIntegration(githubData.integration)
              } else {
                setGithubIntegration(null)
              }
            }
            
            if (cachedSlack) {
              const slackData = JSON.parse(cachedSlack)
              if (slackData.connected && slackData.integration) {
                setSlackIntegration(slackData.integration)
              } else {
                setSlackIntegration(null)
              }
            }
            
            // Set integration based on saved preference
            const savedOrg = localStorage.getItem('selected_organization')
            if (savedOrg && cached.find((i: Integration) => i.id.toString() === savedOrg)) {
              setSelectedIntegration(savedOrg)
            } else if (cached.length > 0) {
              setSelectedIntegration(cached[0].id.toString())
              localStorage.setItem('selected_organization', cached[0].id.toString())
            }
            
            // Set loading to false when using cache
            setLoadingIntegrations(false)
            setHasDataFromCache(true)
            
            // Still need to load previous analyses and trends even if integrations are cached
            loadPreviousAnalyses()
            loadHistoricalTrends()
            
            return
          } catch (error) {
            console.error('Failed to parse cached integrations:', error)
            // Continue to fetch fresh data
          }
        }
      }
    }

    // Only show global loading if requested and we don't have any integrations yet
    if (showGlobalLoading && integrations.length === 0) {
      setLoadingIntegrations(true)
    }

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        router.push('/auth/login')
        return
      }

      // Load both Rootly, PagerDuty, GitHub, and Slack integrations
      console.log('Fetching integrations from:', {
        rootlyUrl: `${API_BASE}/rootly/integrations`,
        pagerdutyUrl: `${API_BASE}/pagerduty/integrations`,
        githubUrl: `${API_BASE}/integrations/github/status`,
        slackUrl: `${API_BASE}/integrations/slack/status`
      })
      
      let rootlyResponse, pagerdutyResponse, githubResponse, slackResponse
      try {
        [rootlyResponse, pagerdutyResponse, githubResponse, slackResponse] = await Promise.all([
          fetch(`${API_BASE}/rootly/integrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }),
          fetch(`${API_BASE}/pagerduty/integrations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }),
          fetch(`${API_BASE}/integrations/github/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          }),
          fetch(`${API_BASE}/integrations/slack/status`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          })
        ])
      } catch (networkError) {
        console.error('Network error fetching integrations:', networkError)
        throw new Error('Cannot connect to backend server. Please check if the backend is running and try again.')
      }

      const rootlyData = rootlyResponse.ok ? await rootlyResponse.json() : { integrations: [] }
      const pagerdutyData = pagerdutyResponse.ok ? await pagerdutyResponse.json() : { integrations: [] }
      const githubData = githubResponse.ok ? await githubResponse.json() : { connected: false, integration: null }
      const slackData = slackResponse.ok ? await slackResponse.json() : { connected: false, integration: null }

      console.log('Raw API responses:', {
        rootlyResponse: { ok: rootlyResponse.ok, status: rootlyResponse.status },
        pagerdutyResponse: { ok: pagerdutyResponse.ok, status: pagerdutyResponse.status },
        githubResponse: { ok: githubResponse.ok, status: githubResponse.status },
        slackResponse: { ok: slackResponse.ok, status: slackResponse.status },
        rootlyData: rootlyData,
        pagerdutyData: pagerdutyData,
        githubData: githubData,
        slackData: slackData
      })

      // Set GitHub and Slack integration states
      if (githubData.connected && githubData.integration) {
        setGithubIntegration(githubData.integration)
      } else {
        setGithubIntegration(null)
      }
      
      if (slackData.connected && slackData.integration) {
        setSlackIntegration(slackData.integration)
      } else {
        setSlackIntegration(null)
      }
      
      // Cache GitHub and Slack integration status separately
      localStorage.setItem('github_integration', JSON.stringify(githubData))
      localStorage.setItem('slack_integration', JSON.stringify(slackData))

      // Ensure platform is set
      const rootlyIntegrations = (rootlyData.integrations || []).map((i: Integration, index: number) => {
        console.log(`Rootly integration ${index}:`, { id: i.id, name: i.name, originalPlatform: i.platform })
        return { ...i, platform: 'rootly' as const }
      })
      const pagerdutyIntegrations = (pagerdutyData.integrations || []).map((i: Integration, index: number) => {
        console.log(`PagerDuty integration ${index}:`, { id: i.id, name: i.name, originalPlatform: i.platform })
        return { ...i, platform: 'pagerduty' as const }
      })
      
      const allIntegrations = [...rootlyIntegrations, ...pagerdutyIntegrations]
      
      console.log('Processed integrations:', {
        rootlyCount: rootlyIntegrations.length,
        pagerdutyCount: pagerdutyIntegrations.length,
        totalCount: allIntegrations.length,
        rootlyIntegrations: rootlyIntegrations.map(i => ({ id: i.id, name: i.name, platform: i.platform })),
        pagerdutyIntegrations: pagerdutyIntegrations.map(i => ({ id: i.id, name: i.name, platform: i.platform }))
      })
      setIntegrations(allIntegrations)
      
      // Cache the integrations
      localStorage.setItem('all_integrations', JSON.stringify(allIntegrations))
      localStorage.setItem('all_integrations_timestamp', Date.now().toString())
        
      // Set integration based on saved preference if not already set
      if (!selectedIntegration) {
        const savedOrg = localStorage.getItem('selected_organization')
        if (savedOrg && allIntegrations.find((i: Integration) => i.id.toString() === savedOrg)) {
          setSelectedIntegration(savedOrg)
        } else if (allIntegrations.length > 0) {
          setSelectedIntegration(allIntegrations[0].id.toString())
          localStorage.setItem('selected_organization', allIntegrations[0].id.toString())
        }
      }
    } catch (error) {
      console.error('Failed to load integrations:', error)
      
      // Check if this is a network connectivity issue
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.name === 'TypeError'
      )
      
      toast.error(isNetworkError ? "Cannot connect to backend server" : "Failed to load integrations")
    } finally {
      setLoadingIntegrations(false)
    }
  }

  // Dynamic analysis stages based on selected data sources
  const getAnalysisStages = () => {
    const stages = [
      { key: "loading", label: "Initializing Analysis", detail: "Setting up analysis parameters", progress: 5 },
      { key: "connecting", label: "Connecting to Platform", detail: "Validating API credentials", progress: 10 },
      { key: "fetching_users", label: "Fetching Organization Members", detail: "Loading user profiles", progress: 15 },
      { key: "fetching", label: "Collecting Incident Data", detail: "Gathering incident history", progress: 35 }
    ]

    let currentProgress = 35
    const remainingProgress = 50 // Leave 50% for processing/analysis phases
    const additionalSources = (includeGithub && githubIntegration ? 1 : 0) + (includeSlack && slackIntegration ? 1 : 0)
    const progressPerSource = additionalSources > 0 ? remainingProgress / (additionalSources + 2) : remainingProgress / 2

    // Add GitHub data collection if enabled
    if (includeGithub && githubIntegration) {
      currentProgress += progressPerSource
      stages.push({
        key: "fetching_github",
        label: "Collecting GitHub Data",
        detail: "Gathering code activity and review patterns",
        progress: Math.round(currentProgress)
      })
    }

    // Add Slack data collection if enabled
    if (includeSlack && slackIntegration) {
      currentProgress += progressPerSource
      stages.push({
        key: "fetching_slack",
        label: "Collecting Slack Data", 
        detail: "Gathering communication patterns and activity",
        progress: Math.round(currentProgress)
      })
    }

    // Add final processing stages
    currentProgress += progressPerSource
    stages.push({
      key: "calculating",
      label: "Processing Patterns",
      detail: `Analyzing ${getAnalysisDescription()}`,
      progress: Math.round(currentProgress)
    })

    stages.push({
      key: "analyzing",
      label: "Calculating Metrics",
      detail: "Computing burnout scores",
      progress: 85
    })

    stages.push({
      key: "preparing",
      label: "Finalizing Analysis",
      detail: "Preparing results",
      progress: 95
    })

    stages.push({
      key: "complete",
      label: "Analysis Complete",
      detail: "Results ready",
      progress: 100
    })

    return stages
  }

  const getAnalysisDescription = () => {
    const sources = []
    sources.push("incident response patterns")
    if (includeGithub && githubIntegration) sources.push("code activity")
    if (includeSlack && slackIntegration) sources.push("communication patterns")
    
    if (sources.length === 1) return sources[0]
    if (sources.length === 2) return `${sources[0]} and ${sources[1]}`
    return `${sources.slice(0, -1).join(", ")}, and ${sources[sources.length - 1]}`
  }

  const [showTimeRangeDialog, setShowTimeRangeDialog] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState("30")
  const [dialogSelectedIntegration, setDialogSelectedIntegration] = useState<string>("")
  
  // GitHub/Slack integration states
  const [githubIntegration, setGithubIntegration] = useState<GitHubIntegration | null>(null)
  const [slackIntegration, setSlackIntegration] = useState<SlackIntegration | null>(null)
  const [includeGithub, setIncludeGithub] = useState(true)
  const [includeSlack, setIncludeSlack] = useState(true)
  const [enableAI, setEnableAI] = useState(true)
  const [llmConfig, setLlmConfig] = useState<{has_token: boolean, provider?: string} | null>(null)
  const [isLoadingGitHubSlack, setIsLoadingGitHubSlack] = useState(false)

  // Load LLM configuration
  const loadLlmConfig = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      let response
      try {
        response = await fetch(`${API_BASE}/llm/token`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
      } catch (networkError) {
        console.error('Network error loading LLM config:', networkError)
        throw new Error('Cannot connect to backend server')
      }

      if (response.ok) {
        const config = await response.json()
        setLlmConfig(config)
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error)
      
      // Check if this is a network connectivity issue
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.name === 'TypeError'
      )
      
      if (isNetworkError) {
        toast.error("Cannot connect to backend")
      }
    }
  }

  const startAnalysis = async () => {
    // Check if we have basic integrations cached
    if (integrations.length === 0) {
      // No integrations cached, need to load them first
      await loadIntegrations(true, true)
      
      if (integrations.length === 0) {
        toast.error("No integrations found - please add an integration first")
        return
      }
    }

    // If no integration selected but we have integrations available, auto-select the first one
    let integrationToUse = selectedIntegration
    if (!integrationToUse && integrations.length > 0) {
      // Use saved preference or first available
      const savedOrg = localStorage.getItem('selected_organization')
      if (savedOrg && integrations.find(i => i.id.toString() === savedOrg)) {
        integrationToUse = savedOrg
      } else {
        integrationToUse = integrations[0].id.toString()
        localStorage.setItem('selected_organization', integrationToUse)
      }
      setSelectedIntegration(integrationToUse)
    }

    if (!integrationToUse) {
      toast.error("No integration available")
      return
    }

    // Set the dialog integration to the currently selected one by default
    setDialogSelectedIntegration(integrationToUse)
    setShowTimeRangeDialog(true)

    // Only load GitHub/Slack data if we don't already have it or if LLM config is missing
    const needsGitHubSlackData = !githubIntegration && !slackIntegration
    const needsLlmConfig = !llmConfig
    
    if (needsGitHubSlackData || needsLlmConfig) {
      setIsLoadingGitHubSlack(true)
      
      const promises = []
      if (needsGitHubSlackData) {
        promises.push(loadIntegrations(true, false)) // Refresh integrations without showing loading
      }
      if (needsLlmConfig) {
        promises.push(loadLlmConfig())
      }
      
      Promise.all(promises).then(() => {
        setIsLoadingGitHubSlack(false)
      }).catch(err => {
        console.error('Error loading modal data:', err)
        setIsLoadingGitHubSlack(false)
      })
    }
  }

  const runAnalysisWithTimeRange = async () => {
    // Check permissions before running - only for Rootly integrations
    const selectedIntegration = integrations.find(i => i.id.toString() === dialogSelectedIntegration);
    
    // Only check permissions for Rootly integrations, not PagerDuty
    if (selectedIntegration?.platform === 'rootly') {
      const hasUserPermission = selectedIntegration?.permissions?.users?.access;
      const hasIncidentPermission = selectedIntegration?.permissions?.incidents?.access;
      
      if (!hasUserPermission || !hasIncidentPermission) {
        toast.error("Missing required permissions - update API token")
        return;
      }
    }
    
    setShowTimeRangeDialog(false)
    setTimeRange(selectedTimeRange)
    setAnalysisRunning(true)
    setAnalysisStage("loading")
    setAnalysisProgress(0)
    setTargetProgress(5) // Initial target
    setCurrentStageIndex(0)

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        throw new Error('No authentication token found')
      }

      // Start the analysis
      let response
      try {
        response = await fetch(`${API_BASE}/analyses/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            integration_id: parseInt(dialogSelectedIntegration),
            time_range: parseInt(selectedTimeRange),
            include_weekends: true,
            include_github: githubIntegration ? includeGithub : false,
            include_slack: slackIntegration ? includeSlack : false,
            enable_ai: enableAI && llmConfig?.has_token
          }),
        })
      } catch (networkError) {
        console.error('Network error:', networkError)
        throw new Error('Cannot connect to backend server. Please check if the backend is running and try again.')
      }

      if (!response) {
        throw new Error('No response from server. Please check if the backend is running.')
      }

      let responseData
      try {
        responseData = await response.json()
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        throw new Error(`Server returned invalid response (${response.status}). The backend may be experiencing issues.`)
      }
      
      if (!response.ok) {
        throw new Error(responseData.detail || responseData.message || `Analysis failed with status ${response.status}`)
      }

      const { id: analysis_id } = responseData
      
      if (!analysis_id) {
        throw new Error('No analysis ID returned from server')
      }

      console.log('Started analysis with ID:', analysis_id)
      
      // Refresh the analyses list to show the new running analysis in sidebar
      await loadPreviousAnalyses()

      // Poll for analysis completion
      let pollRetryCount = 0
      const maxRetries = 10 // Stop after 10 failed polls
      
      // Set initial progress target
      setTargetProgress(10)
      setAnalysisStage("loading")
      
      const pollAnalysis = async () => {
        try {
          if (!analysis_id) {
            console.error('Analysis ID is undefined, stopping polling')
            setAnalysisRunning(false)
            return
          }
          
          let pollResponse
          try {
            pollResponse = await fetch(`${API_BASE}/analyses/${analysis_id}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            })
          } catch (networkError) {
            console.error('Network error during polling:', networkError)
            throw new Error('Cannot connect to backend server during polling')
          }

          if (pollResponse.ok) {
            const analysisData = await pollResponse.json()
            
            if (analysisData.status === 'completed') {
              console.log('Analysis completed. Full data structure:', analysisData)
              console.log('analysis_data:', analysisData.analysis_data)
              console.log('metadata:', analysisData.analysis_data?.metadata)
              console.log('total_incidents from metadata:', analysisData.analysis_data?.metadata?.total_incidents)
              
              // Set progress to 95% first, then jump to 100% right before showing data
              setTargetProgress(95)
              setAnalysisStage("complete")
              
              // Wait for progress to reach 95%, then show 100% briefly before showing data
              setTimeout(() => {
                setTargetProgress(100)
                setTimeout(() => {
                  setAnalysisRunning(false)
                  setCurrentAnalysis(analysisData)
                  updateURLWithAnalysis(parseInt(analysisData.id))
                }, 500) // Show 100% for just 0.5 seconds before showing data
              }, 800) // Wait 0.8 seconds to reach 95%
              
              // Reload previous analyses from API to ensure sidebar is up-to-date
              await loadPreviousAnalyses()
              
              toast.success("Analysis completed!")
              return
            } else if (analysisData.status === 'failed') {
              setAnalysisRunning(false)
              
              // Check if we have partial data to display
              if (analysisData.analysis_data?.partial_data) {
                setCurrentAnalysis(analysisData)
                updateURLWithAnalysis(analysisData.id)
                toast("Analysis completed with partial data")
                await loadPreviousAnalyses()
              } else {
                toast.error(analysisData.error_message || "Analysis failed - please try again")
              }
              return
            } else if (analysisData.status === 'running') {
              // Update progress through stages based on analysis status
              console.log('Analysis running, checking progress...', {
                hasProgress: analysisData.progress !== undefined,
                hasStage: !!analysisData.stage,
                status: analysisData.status
              })
              
              // Check if we have progress information from the API
              if (analysisData.progress !== undefined) {
                console.log('Using API progress:', analysisData.progress)
                setTargetProgress(Math.min(analysisData.progress, 85))
              } else if (analysisData.stage) {
                // If the API provides a stage, use it
                const stageData = getAnalysisStages().find(s => s.key === analysisData.stage)
                if (stageData) {
                  console.log('Using API stage:', analysisData.stage, 'progress:', stageData.progress)
                  setAnalysisStage(analysisData.stage as AnalysisStage)
                  
                  // If we're fetching users and have progress info
                  if (analysisData.stage === 'fetching_users' && analysisData.users_processed && analysisData.total_users) {
                    // Calculate progress between 20% and 40% based on users processed
                    const userProgress = (analysisData.users_processed / analysisData.total_users) * 20
                    setTargetProgress(20 + userProgress)
                  } else if (analysisData.stage === 'fetching' && analysisData.incidents_processed) {
                    // Calculate progress between 40% and 60% based on incidents processed
                    const baseProgress = 40
                    const progressRange = 20
                    // Assume we'll process ~100-200 incidents, scale accordingly
                    const incidentProgress = Math.min((analysisData.incidents_processed / 100) * progressRange, progressRange)
                    setTargetProgress(baseProgress + incidentProgress)
                  } else {
                    setTargetProgress(stageData.progress)
                  }
                }
              } else {
                // Simulate progress through stages - advance conservatively with random increments
                console.log('Using simulated progress, advancing stages...')
                setCurrentStageIndex(prevIndex => {
                  // Don't advance past "analyzing" stage (index 5) without API confirmation
                  const maxSimulatedIndex = 6 // Stop at "Finalizing Analysis" (50%)
                  const currentStages = getAnalysisStages()
                  const stageIndex = Math.min(prevIndex, currentStages.length - 1)
                  const stage = currentStages[stageIndex]
                  console.log('Advancing to stage:', stage.key, 'progress:', stage.progress, 'index:', prevIndex)
                  setAnalysisStage(stage.key as AnalysisStage)
                  
                  // Add some randomness to the target progress
                  const baseProgress = stage.progress
                  const randomOffset = Math.floor(Math.random() * 5) // 0-4 random offset
                  const targetWithRandomness = Math.min(baseProgress + randomOffset, 70) // Cap at 70% for simulation
                  setTargetProgress(targetWithRandomness)
                  
                  // Only advance if we haven't reached the max simulated stage
                  if (prevIndex < maxSimulatedIndex) {
                    const nextIndex = prevIndex + 1
                    console.log('Next stage index will be:', nextIndex)
                    return nextIndex
                  } else {
                    console.log('Reached max simulated progress, waiting for API confirmation...')
                    return prevIndex
                  }
                })
              }
            }
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
            toast.error("Analysis polling failed - please try again")
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
      toast.error(error instanceof Error ? error.message : "Failed to run analysis")
    }
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
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

  const getProgressColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
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
      organization_name: selectedIntegrationData?.name,
      ...currentAnalysis.analysis_data
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `burnout-analysis-${selectedIntegrationData?.name || 'organization'}-${new Date().toISOString().split('T')[0]}.json`
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const handleManageIntegrations = () => {
    router.push('/integrations')
  }

  const ensureIntegrationsLoaded = async () => {
    if (integrations.length === 0 && !dropdownLoading) {
      setDropdownLoading(true)
      try {
        await loadIntegrations(true, false) // Force refresh, no global loading
      } finally {
        setDropdownLoading(false)
      }
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('auth_token')
    router.push('/')
  }

  const selectedIntegrationData = integrations.find(i => i.id.toString() === selectedIntegration)
  
  // Generate chart data from real historical analysis results
  const chartData = historicalTrends?.daily_trends?.length > 0 
    ? historicalTrends.daily_trends.slice(-7).map((trend: any) => ({
        date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round(trend.overall_score * 10) // Convert 0-10 scale to 0-100 for display
      }))
    : currentAnalysis?.analysis_data?.team_health 
      ? [{ 
          date: "Current", 
          score: Math.round(currentAnalysis.analysis_data.team_health.overall_score * 10) 
        }] 
      : []
  
  const memberBarData = (() => {
    const teamAnalysis = currentAnalysis?.analysis_data?.team_analysis
    const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
    return members
      ?.filter((member) => member.incident_count > 0) // Filter out users with no incidents
      ?.map((member) => ({
        name: member.user_name.split(" ")[0],
        fullName: member.user_name,
        score: member.burnout_score * 10, // Convert 0-10 scale to 0-100 for display
        riskLevel: member.risk_level,
        fill: member.risk_level === "high" ? "#dc2626" :      // Red for high
              member.risk_level === "medium" ? "#f59e0b" :    // Amber for medium
              "#10b981",                                       // Green for low
      }))
      ?.sort((a, b) => b.score - a.score) // Sort by score descending (highest risk first)
      || []
  })();
  
  const members = (() => {
    const teamAnalysis = currentAnalysis?.analysis_data?.team_analysis
    return Array.isArray(teamAnalysis) ? teamAnalysis : (teamAnalysis?.members || [])
  })();
  
  // Helper function to get color based on severity
  const getFactorColor = (value) => {
    if (value >= 7) return '#DC2626' // Red - Critical
    if (value >= 5) return '#F59E0B' // Orange - Warning  
    if (value >= 3) return '#10B981' // Green - Good
    return '#6B7280' // Gray - Low risk
  }
  
  // Helper function to get recommendations
  const getRecommendation = (factor) => {
    switch(factor.toLowerCase()) {
      case 'workload':
        return 'Consider redistributing incidents or adding team members'
      case 'after hours':
        return 'Implement on-call rotation limits and recovery time'
      case 'weekend work':
        return 'Establish weekend work policies and coverage plans'
      case 'incident load':
        return 'Review incident prevention and escalation procedures'
      case 'response time':
        return 'Review escalation procedures and skill gaps'
      default:
        return 'Monitor this factor closely and consider intervention'
    }
  }
  
  // Calculate burnout factors with color coding - Backend returns 0-10 scale
  // Filter to only include members with at least one incident
  const membersWithIncidents = members.filter((m: any) => (m?.incident_count || 0) > 0);
  
  const burnoutFactors = membersWithIncidents.length > 0 ? [
    { 
      factor: "After Hours", 
      value: Number(((membersWithIncidents as any[]).reduce((avg: number, m: any) => {
        // Use consistent after-hours percentage data
        const afterHoursPercent = m?.metrics?.after_hours_percentage || m?.key_metrics?.after_hours_percentage || 0;
        // Convert percentage to factor scale using backend logic: percentage * 20
        const val = m?.factors?.after_hours || Math.min(afterHoursPercent * 20, 10); // 39% = 7.8 factor
        console.log(`RADAR: Member ${m?.user_name}: after_hours = ${val} (factors: ${m?.factors?.after_hours}, after_hours_percentage: ${afterHoursPercent}%)`);
        return avg + val;
      }, 0) / membersWithIncidents.length).toFixed(1)),
      metrics: `Avg after-hours: ${Math.round((membersWithIncidents as any[]).reduce((avg: number, m: any) => avg + (m?.metrics?.after_hours_percentage || m?.key_metrics?.after_hours_percentage || 0), 0) / membersWithIncidents.length)}%`
    },
    { 
      factor: "Weekend Work", 
      value: Number(((membersWithIncidents as any[]).reduce((avg: number, m: any) => {
        // Use authoritative weekend percentage data first, fallback to factors only if needed
        const weekendPercent = m?.metrics?.weekend_percentage ?? m?.key_metrics?.weekend_percentage ?? null;
        let val;
        
        if (weekendPercent !== null) {
          // Use actual weekend incident percentage (authoritative source)
          val = Math.min(weekendPercent * 0.25, 10); // Backend uses weekend_percentage * 25 scaling
          console.log(`RADAR: Member ${m?.user_name}: Using weekend_percentage = ${weekendPercent}% -> factor = ${val}`);
        } else if (m?.factors?.weekend_work !== undefined) {
          // Fallback to pre-calculated factor
          val = m.factors.weekend_work;
          console.log(`RADAR: Member ${m?.user_name}: Using factors.weekend_work = ${val}`);
        } else {
          // No weekend data available
          val = 0;
          console.log(`RADAR: Member ${m?.user_name}: No weekend work data available, using 0`);
        }
        
        console.log(`  - Final weekend_work value: ${val}`);
        console.log(`  - Available data: weekend_percentage=${m?.metrics?.weekend_percentage}, factors.weekend_work=${m?.factors?.weekend_work}`);
        return avg + val;
      }, 0) / membersWithIncidents.length).toFixed(1)),
      metrics: `Avg weekend work: ${Math.round((membersWithIncidents as any[]).reduce((avg: number, m: any) => avg + (m?.metrics?.weekend_percentage || m?.key_metrics?.weekend_percentage || 0), 0) / membersWithIncidents.length)}%`
    },
    { 
      factor: "Incident Load", 
      value: Number(((membersWithIncidents as any[]).reduce((avg: number, m: any) => {
        // Combine workload and incident severity into one metric
        const incidentsPerWeek = m?.key_metrics?.incidents_per_week || (m?.incident_count / 4.3) || 0;
        const severityWeighted = m?.key_metrics?.severity_weighted_per_week || 0;
        
        // Calculate workload component (40% weight)
        let workloadScore = 0;
        if (incidentsPerWeek <= 2) {
          workloadScore = incidentsPerWeek * 1.5;
        } else if (incidentsPerWeek <= 5) {
          workloadScore = 3 + ((incidentsPerWeek - 2) / 3) * 4;
        } else if (incidentsPerWeek <= 8) {
          workloadScore = 7 + ((incidentsPerWeek - 5) / 3) * 3;
        } else {
          workloadScore = 10;
        }
        
        // Calculate severity component (60% weight)
        const severityScore = Math.min(severityWeighted * 1.5, 10);
        
        // Combined score
        const val = m?.factors?.incident_load || (workloadScore * 0.4 + severityScore * 0.6);
        console.log(`RADAR: Member ${m?.user_name}: incident_load = ${val} (workload: ${workloadScore}, severity: ${severityScore})`);
        return avg + val;
      }, 0) / membersWithIncidents.length).toFixed(1)),
      metrics: `Total: ${(membersWithIncidents as any[]).reduce((total: number, m: any) => total + (m?.incident_count || 0), 0)} incidents (${Math.round((membersWithIncidents as any[]).reduce((avg: number, m: any) => avg + (m?.key_metrics?.incidents_per_week || 0), 0) / membersWithIncidents.length)}/week)`
    },
    { 
      factor: "Response Time", 
      value: Number(((membersWithIncidents as any[]).reduce((avg: number, m: any) => {
        // Try factors first, fallback using backend logic: avg_response_time_minutes / 6
        const responseTimeMinutes = m?.metrics?.avg_response_time_minutes || (m?.key_metrics?.avg_resolution_hours ? m.key_metrics.avg_resolution_hours * 60 : 0);
        // Industry standard: <30 min = excellent (2), <60 min = good (4), <120 min = acceptable (6), >240 min = critical (9+)
        const val = m?.factors?.response_time || (() => {
          if (responseTimeMinutes <= 30) return 2.0;      // Excellent
          if (responseTimeMinutes <= 60) return 4.0;      // Good
          if (responseTimeMinutes <= 120) return 6.0;     // Acceptable
          if (responseTimeMinutes <= 240) return 8.0;     // Poor
          if (responseTimeMinutes <= 480) return 9.0;     // Very Poor
          return 10.0;  // Critical (>8 hours)
        })()
        console.log(`RADAR: Member ${m?.user_name}: response_time = ${val} (factors: ${m?.factors?.response_time}, key_metrics: ${m?.key_metrics?.avg_resolution_hours})`);
        return avg + val;
      }, 0) / membersWithIncidents.length).toFixed(1)),
      metrics: `Avg response: ${Math.round((membersWithIncidents as any[]).reduce((avg: number, m: any) => avg + (m?.metrics?.avg_response_time_minutes || (m?.key_metrics?.avg_resolution_hours ? m.key_metrics.avg_resolution_hours * 60 : 0)), 0) / membersWithIncidents.length)} min`
    },
  ].map(factor => ({
    ...factor,
    color: getFactorColor(factor.value),
    recommendation: getRecommendation(factor.factor),
    severity: factor.value >= 7 ? 'Critical' : factor.value >= 5 ? 'Warning' : factor.value >= 3 ? 'Good' : 'Low Risk'
  })) : [];
  
  // Get high-risk factors for emphasis (temporarily lowered threshold to test)
  const highRiskFactors = burnoutFactors.filter(f => f.value >= 2).sort((a, b) => b.value - a.value);

  // Debug log to check the actual values
  useEffect(() => {
    console.log('🔍 DEBUG: Radar chart burnout factors:', burnoutFactors)
    console.log('🔍 DEBUG: Members raw factors:', (members as any[]).map((m: any) => ({ name: m.user_name, factors: m.factors })))
    console.log('🔍 DEBUG: Organization burnout score:', membersWithIncidents.length > 0 ? (membersWithIncidents as any[]).reduce((avg: number, m: any) => avg + (m.burnout_score || 0), 0) / membersWithIncidents.length * 10 : 0, '%')
    console.log('🔍 DEBUG: Members with incidents:', membersWithIncidents.length, '/', members.length)
    console.log('🔍 DEBUG: Selected member factors:', selectedMember ? selectedMember.factors : 'None selected')
    console.log('🔍 DEBUG: Selected member slack activity:', selectedMember?.slack_activity)
    console.log('🔍 DEBUG: Selected member github activity:', selectedMember?.github_activity)
    
    // Additional debugging for radar chart zeros
    if (members.length > 0) {
      console.log('🔍 RADAR DEBUG: First member structure:', JSON.stringify(members[0], null, 2))
      const firstMember = members[0] as any
      console.log('🔍 RADAR DEBUG: First member factors check:', {
        hasFactors: !!firstMember?.factors,
        workload: firstMember?.factors?.workload,
        afterHours: firstMember?.factors?.after_hours,
        weekendWork: firstMember?.factors?.weekend_work,
        incidentLoad: firstMember?.factors?.incident_load,
        responseTime: firstMember?.factors?.response_time
      })
      console.log('🔍 RADAR DEBUG: Team analysis structure keys:', Object.keys(currentAnalysis?.analysis_data?.team_analysis || {}))
      if (currentAnalysis?.analysis_data?.team_analysis && !Array.isArray(currentAnalysis.analysis_data.team_analysis)) {
        console.log('🔍 RADAR DEBUG: Team analysis object keys:', Object.keys(currentAnalysis.analysis_data.team_analysis))
        console.log('🔍 RADAR DEBUG: Team analysis members array length:', currentAnalysis.analysis_data.team_analysis.members?.length || 0)
      }
    }
  }, [burnoutFactors, members, selectedMember, currentAnalysis])

  // Show full-screen loading when loading integrations
  if (loadingIntegrations) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Activity className="w-8 h-8 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show main page loader while initial data loads (but not if we have cached data)
  if (!initialDataLoaded && !hasDataFromCache) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-60"} bg-gray-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="relative h-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`text-gray-400 hover:text-white hover:bg-gray-800 absolute top-2 ${sidebarCollapsed ? 'left-2' : 'right-2'}`}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Removed organization selector - moved to integrations page */}

        {/* Navigation */}
        {!sidebarCollapsed && (
          <div className="flex-1 flex flex-col p-4 space-y-2">
            <div className="flex-1 space-y-2">
              <Button
                onClick={startAnalysis}
                disabled={analysisRunning}
                className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                New Analysis
              </Button>

            <div className="space-y-1">
              {!sidebarCollapsed && previousAnalyses.length > 0 && (
                <p className="text-xs text-gray-400 uppercase tracking-wide px-2 py-1 mt-4">Recent</p>
              )}
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {previousAnalyses.slice(0, 50).map((analysis) => {
                const analysisDate = new Date(analysis.created_at)
                const timeStr = analysisDate.toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true,
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
                const dateStr = analysisDate.toLocaleDateString([], { 
                  month: 'short', 
                  day: 'numeric',
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
                
                // Load integrations if needed for team name display
                const matchingIntegration = integrations.find(i => i.id === Number(analysis.integration_id)) || 
                                          integrations.find(i => String(i.id) === String(analysis.integration_id))
                
                const organizationName = matchingIntegration?.name || `Organization ${analysis.integration_id}`
                const isSelected = currentAnalysis?.id === analysis.id
                const platformColor = matchingIntegration?.platform === 'rootly' ? 'bg-purple-500' : 'bg-green-500'
                return (
                  <div key={analysis.id} className={`relative group ${isSelected ? 'bg-gray-800' : ''} rounded`}>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 py-2 h-auto ${isSelected ? 'bg-gray-800 text-white' : ''}`}
                      onClick={async () => {
                        console.log('Clicking historical analysis:', analysis.id)
                        
                        // If analysis doesn't have full data, fetch it
                        if (!analysis.analysis_data || !analysis.analysis_data.team_analysis) {
                          try {
                            const authToken = localStorage.getItem('auth_token')
                            if (!authToken) return
                            
                            console.log('Fetching full analysis details for:', analysis.id)
                            const response = await fetch(`${API_BASE}/analyses/${analysis.id}`, {
                              headers: {
                                'Authorization': `Bearer ${authToken}`
                              }
                            })
                            
                            if (response.ok) {
                              const fullAnalysis = await response.json()
                              console.log('Fetched full analysis:', {
                                id: fullAnalysis.id,
                                hasAnalysisData: !!fullAnalysis.analysis_data,
                                hasTeamAnalysis: !!fullAnalysis.analysis_data?.team_analysis,
                                memberCount: fullAnalysis.analysis_data?.team_analysis?.members?.length || 0
                              })
                              setCurrentAnalysis(fullAnalysis)
                              updateURLWithAnalysis(parseInt(fullAnalysis.id))
                            } else {
                              console.error('Failed to fetch full analysis')
                              setCurrentAnalysis(analysis)
                              updateURLWithAnalysis(parseInt(analysis.id))
                            }
                          } catch (error) {
                            console.error('Error fetching full analysis:', error)
                            setCurrentAnalysis(analysis)
                            updateURLWithAnalysis(parseInt(analysis.id))
                          }
                        } else {
                          console.log('Analysis already has data:', {
                            hasTeamAnalysis: !!analysis.analysis_data.team_analysis,
                            memberCount: Array.isArray(analysis.analysis_data.team_analysis) ? analysis.analysis_data.team_analysis.length : (analysis.analysis_data.team_analysis?.members?.length || 0)
                          })
                          setCurrentAnalysis(analysis)
                          updateURLWithAnalysis(parseInt(analysis.id))
                        }
                      }}
                    >
                      {sidebarCollapsed ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <div className="flex flex-col items-start w-full text-xs pr-8">
                          <div className="flex justify-between items-center w-full mb-1">
                            <div className="flex items-center space-x-2">
                              {matchingIntegration && (
                                <div className={`w-2 h-2 rounded-full ${platformColor}`}></div>
                              )}
                              <span className="font-medium">{organizationName}</span>
                            </div>
                            <span className="text-gray-500">{analysis.time_range || 30}d</span>
                          </div>
                          <div className="flex justify-between items-center w-full text-gray-400">
                            <span>{dateStr}</span>
                            <span>{timeStr}</span>
                          </div>
                        </div>
                      )}
                    </Button>
                    {!sidebarCollapsed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
                        onClick={(e) => openDeleteDialog(analysis, e)}
                        title="Delete analysis"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Separator className="bg-gray-700" />
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={() => router.push('/methodology')}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Methodology
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleManageIntegrations}
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organization Burnout Analysis</h1>
              <p className="text-gray-600">
                {(() => {
                  // If viewing a specific analysis, show the integration used for that analysis
                  if (currentAnalysis) {
                    const analysisIntegration = integrations.find(i => i.id === currentAnalysis.integration_id);
                    if (analysisIntegration) {
                      const platform = analysisIntegration.platform === 'pagerduty' ? 'PagerDuty' : 'Rootly';
                      return `${platform} - ${analysisIntegration.organization_name || analysisIntegration.name}`;
                    }
                    return 'Analysis Dashboard';
                  }
                  // Otherwise show the currently selected integration
                  if (selectedIntegrationData) {
                    const platform = selectedIntegrationData.platform === 'pagerduty' ? 'PagerDuty' : 'Rootly';
                    return `${platform} - ${selectedIntegrationData.organization_name || selectedIntegrationData.name}`;
                  }
                  return 'Organization Burnout Analysis Dashboard';
                })()}
              </p>
            </div>
            {/* Export Dropdown */}
            {!shouldShowInsufficientDataCard() && currentAnalysis && currentAnalysis.analysis_data && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50"
                    title="Export analysis data"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={exportAsJSON} className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Export as JSON</span>
                      <span className="text-xs text-gray-500">Complete analysis data</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="flex items-center space-x-2 opacity-50">
                    <Download className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Export as CSV</span>
                      <span className="text-xs text-gray-500">Organization member scores</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled className="flex items-center space-x-2 opacity-50">
                    <FileText className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Generate PDF Report</span>
                      <span className="text-xs text-gray-500">Executive summary</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Debug Section - Only show in development */}
          {process.env.NODE_ENV === 'development' && currentAnalysis && (
            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-yellow-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Debug: Analysis Data Structure
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugSectionOpen(!debugSectionOpen)}
                    className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                  >
                    {debugSectionOpen ? 'Hide' : 'Show'} Debug Info
                  </Button>
                </div>
                
                {debugSectionOpen && (
                  <div className="space-y-3">
                    <div className="text-xs bg-white p-3 rounded border border-yellow-200">
                      <div className="font-medium text-gray-700 mb-2">Analysis Overview:</div>
                      <div className="space-y-1 text-gray-600">
                        <div>ID: {currentAnalysis.id}</div>
                        <div>Status: {currentAnalysis.status}</div>
                        <div>Created: {new Date(currentAnalysis.created_at).toLocaleString([], {
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                          hour12: true
                        })}</div>
                        <div>Integration ID: {currentAnalysis.integration_id}</div>
                        <div>Has analysis_data: {currentAnalysis.analysis_data ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                    
                    {currentAnalysis.analysis_data && (
                      <div className="text-xs bg-white p-3 rounded border border-yellow-200">
                        <div className="font-medium text-gray-700 mb-2">Analysis Data Structure:</div>
                        <div className="space-y-1 text-gray-600">
                          <div>Has team_health: {currentAnalysis.analysis_data.team_health ? 'Yes' : 'No'}</div>
                          <div>Has team_analysis: {currentAnalysis.analysis_data.team_analysis ? 'Yes' : 'No'}</div>
                          <div>Has partial_data: {currentAnalysis.analysis_data.partial_data ? 'Yes' : 'No'}</div>
                          
                          {currentAnalysis.analysis_data.team_analysis && (
                            <div className="ml-4 space-y-1 mt-2">
                              <div className="font-medium text-gray-700">Team Analysis:</div>
                              <div>Members count: {Array.isArray(currentAnalysis.analysis_data.team_analysis) ? currentAnalysis.analysis_data.team_analysis.length : (currentAnalysis.analysis_data.team_analysis.members?.length || 0)}</div>
                              <div>Has organization_health: {(currentAnalysis.analysis_data.team_analysis as any).organization_health ? 'Yes' : 'No'}</div>
                              <div>Has insights: {(currentAnalysis.analysis_data.team_analysis as any).insights ? 'Yes' : 'No'}</div>
                            </div>
                          )}
                          
                          {(() => {
                            const teamAnalysis = currentAnalysis.analysis_data.team_analysis
                            const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
                            return members && members.length > 0
                          })() && (
                            <div className="ml-4 space-y-1 mt-2">
                              <div className="font-medium text-gray-700">Sample Member Data Sources:</div>
                              {(() => {
                                const teamAnalysis = currentAnalysis.analysis_data.team_analysis
                                const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
                                const member = members[0]
                                return (
                                  <div className="ml-4 space-y-1">
                                    <div>Has GitHub data: {(member as any).github_data ? 'Yes' : 'No'}</div>
                                    <div>Has Slack data: {(member as any).slack_data ? 'Yes' : 'No'}</div>
                                    <div>Has incident data: {member.incident_count !== undefined ? 'Yes' : 'No'}</div>
                                    <div>Has metrics: {member.metrics ? 'Yes' : 'No'}</div>
                                    <div>Has factors: {member.factors ? 'Yes' : 'No'}</div>
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs bg-white p-3 rounded border border-yellow-200">
                      <div className="font-medium text-gray-700 mb-2">Raw Analysis Data (JSON):</div>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded border max-h-60 overflow-y-auto">
                        {JSON.stringify(currentAnalysis.analysis_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                
                <Button variant="outline" onClick={() => setAnalysisRunning(false)} className="border-purple-300 hover:bg-purple-50 text-purple-700">
                  <X className="w-4 h-4 mr-2" />
                  Cancel Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Failed Analysis - Show Specific Error or Insufficient Data Message */}
          {shouldShowInsufficientDataCard() && currentAnalysis.status === 'failed' && (
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

          {/* Analysis Complete State - Only show if analysis has meaningful data */}
          {!shouldShowInsufficientDataCard() && !analysisRunning && currentAnalysis && (currentAnalysis.analysis_data?.team_health || currentAnalysis.analysis_data?.team_summary || currentAnalysis.analysis_data?.partial_data || currentAnalysis.analysis_data?.team_analysis) && (
            <>
              {/* Debug Section - Development Only */}
              {process.env.NODE_ENV === 'development' && (
                <Card className="mb-6 border-yellow-300 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-yellow-800 text-sm">🐛 Debug: Analysis Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-2">
                      <p><strong>Analysis ID:</strong> {currentAnalysis.id}</p>
                      <p><strong>Status:</strong> {currentAnalysis.status}</p>
                      <p><strong>Data Sources Present:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• data_sources object: {currentAnalysis.analysis_data?.data_sources ? '✅ Present' : '❌ Missing'}</li>
                        <li>• github_data flag: {currentAnalysis.analysis_data?.data_sources?.github_data ? '✅ True' : '❌ False/Missing'}</li>
                        <li>• slack_data flag: {currentAnalysis.analysis_data?.data_sources?.slack_data ? '✅ True' : '❌ False/Missing'}</li>
                        <li>• github_insights: {currentAnalysis.analysis_data?.github_insights ? '✅ Present' : '❌ Missing'}</li>
                        <li>• slack_insights: {currentAnalysis.analysis_data?.slack_insights ? '✅ Present' : '❌ Missing'}</li>
                        <li>• team_analysis.members count: {Array.isArray(currentAnalysis.analysis_data?.team_analysis) ? currentAnalysis.analysis_data.team_analysis.length : (currentAnalysis.analysis_data?.team_analysis?.members?.length || 0)}</li>
                      </ul>
                      <p><strong>Metadata Check:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>• metadata.include_github: {(currentAnalysis.analysis_data as any)?.metadata?.include_github ? '✅ True' : '❌ False/Missing'}</li>
                        <li>• metadata.include_slack: {(currentAnalysis.analysis_data as any)?.metadata?.include_slack ? '✅ True' : '❌ False/Missing'}</li>
                        <li>• metadata object: {(currentAnalysis.analysis_data as any)?.metadata ? '✅ Present' : '❌ Missing'}</li>
                      </ul>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900">Raw analysis_data structure</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(currentAnalysis.analysis_data, null, 2)}
                        </pre>
                      </details>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900">GitHub insights data</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(currentAnalysis.analysis_data?.github_insights, null, 2)}
                        </pre>
                      </details>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-yellow-700 hover:text-yellow-900">Slack insights data</summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(currentAnalysis.analysis_data?.slack_insights, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tooltip Portal */}
              <div className="fixed z-[99999] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-900 text-white text-xs rounded-lg p-3 w-64 shadow-lg pointer-events-none"
                   id="health-score-tooltip"
                   style={{ top: '-200px', left: '-200px' }}>
                <div className="space-y-2">
                  <div><strong className="text-green-400">Excellent (90-100%):</strong> Low stress, sustainable workload</div>
                  <div><strong className="text-blue-400">Good (70-89%):</strong> Manageable workload with minor stress</div>
                  <div><strong className="text-yellow-400">Fair (50-69%):</strong> Moderate stress, watch for trends</div>
                  <div><strong className="text-orange-400">Poor (30-49%):</strong> High stress, intervention needed</div>
                  <div><strong className="text-red-400">Critical (&lt;30%):</strong> Severe burnout risk</div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 overflow-visible">
                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg overflow-visible">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700 flex items-center space-x-2">
                      <Heart className="w-4 h-4" />
                      <span>Team Health</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAnalysis?.analysis_data?.team_health || (currentAnalysis?.analysis_data?.team_analysis && currentAnalysis?.status === 'completed') ? (
                      <div>
                        <div className="flex items-start space-x-3">
                          <div>
                            <div className="text-2xl font-bold text-gray-900">{(() => {
                              // Use the latest point from health trends for consistency with chart
                              if (historicalTrends?.daily_trends?.length > 0) {
                                const latestTrend = historicalTrends.daily_trends[historicalTrends.daily_trends.length - 1];
                                return Math.round(latestTrend.overall_score * 10);
                              }
                              // Fallback to current analysis daily trends if available
                              if (currentAnalysis?.analysis_data?.daily_trends?.length > 0) {
                                const latestTrend = currentAnalysis.analysis_data.daily_trends[currentAnalysis.analysis_data.daily_trends.length - 1];
                                return Math.round(latestTrend.overall_score * 10);
                              }
                              // Final fallback to team_health or team_summary
                              if (currentAnalysis?.analysis_data?.team_health) {
                                return Math.round(currentAnalysis.analysis_data.team_health.overall_score * 10);
                              }
                              if (currentAnalysis?.analysis_data?.team_summary) {
                                return Math.round(currentAnalysis.analysis_data.team_summary.average_score * 10);
                              }
                              return 100;
                            })()}%</div>
                            <div className="text-xs text-gray-500">Current</div>
                          </div>
                          {(() => {
                            // Debug: Log what data is available
                            console.log("Debug - historicalTrends:", historicalTrends);
                            console.log("Debug - period_summary:", currentAnalysis?.analysis_data?.period_summary);
                            console.log("Debug - daily_trends length:", currentAnalysis?.analysis_data?.daily_trends?.length);
                            console.log("Debug - team_health:", currentAnalysis?.analysis_data?.team_health);
                            // Always show average section, handle fallbacks inside
                            return true;
                          })() && (
                            <div className="border-l border-gray-200 pl-3">
                              <div className="text-2xl font-bold text-gray-900">{(() => {
                                // Calculate average directly from Health Trends chart data (same source as chart)
                                if (historicalTrends?.daily_trends?.length > 0) {
                                  const dailyScores = historicalTrends.daily_trends.map((d: any) => d.overall_score);
                                  const average = dailyScores.reduce((a: number, b: number) => a + b, 0) / dailyScores.length;
                                  console.log("Debug - calculated average from historicalTrends daily_trends:", average * 10);
                                  return Math.round(average * 10); // Convert 0-10 to 0-100%
                                }
                                // Fallback: Calculate from current analysis daily trends
                                if (currentAnalysis?.analysis_data?.daily_trends?.length > 0) {
                                  const dailyScores = currentAnalysis.analysis_data.daily_trends.map((d: any) => d.overall_score);
                                  const average = dailyScores.reduce((a: number, b: number) => a + b, 0) / dailyScores.length;
                                  console.log("Debug - calculated average from currentAnalysis daily_trends:", average * 10);
                                  return Math.round(average * 10); // Convert 0-10 to 0-100%
                                }
                                // Final fallback: Use current score
                                if (historicalTrends?.daily_trends?.length > 0) {
                                  const latestTrend = historicalTrends.daily_trends[historicalTrends.daily_trends.length - 1];
                                  console.log("Debug - using latest trend as fallback:", latestTrend.overall_score * 10);
                                  return Math.round(latestTrend.overall_score * 10);
                                }
                                console.log("Debug - no data available for average, returning 0");
                                return 0;
                              })()}%</div>
                              <div className="text-xs text-gray-500">{currentAnalysis?.time_range || 30}-day avg</div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 flex items-center space-x-1">
                          <div className="text-sm font-medium text-purple-600">{(() => {
                            // Use the same data source as current score for consistency
                            let currentScore = 0;
                            
                            if (historicalTrends?.daily_trends?.length > 0) {
                              const latestTrend = historicalTrends.daily_trends[historicalTrends.daily_trends.length - 1];
                              currentScore = latestTrend.overall_score;
                            } else if (currentAnalysis?.analysis_data?.daily_trends?.length > 0) {
                              const latestTrend = currentAnalysis.analysis_data.daily_trends[currentAnalysis.analysis_data.daily_trends.length - 1];
                              currentScore = latestTrend.overall_score;
                            } else if (currentAnalysis?.analysis_data?.team_health) {
                              currentScore = currentAnalysis.analysis_data.team_health.overall_score;
                            } else if (currentAnalysis?.analysis_data?.team_summary) {
                              currentScore = currentAnalysis.analysis_data.team_summary.average_score;
                            }
                            
                            // Convert to health status (0-10 scale, higher=better)
                            if (currentScore >= 8) return 'Excellent';
                            if (currentScore >= 6) return 'Good';
                            if (currentScore >= 4) return 'Fair';
                            if (currentScore >= 2) return 'Poor';
                            return 'Critical';
                          })()}</div>
                          <Info className="w-3 h-3 text-purple-500" 
                                  onMouseEnter={(e) => {
                                    const tooltip = document.getElementById('health-score-tooltip')
                                    if (tooltip) {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      tooltip.style.top = `${rect.top - 180}px`
                                      tooltip.style.left = `${rect.left - 120}px`
                                      tooltip.classList.remove('invisible', 'opacity-0')
                                      tooltip.classList.add('visible', 'opacity-100')
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    const tooltip = document.getElementById('health-score-tooltip')
                                    if (tooltip) {
                                      tooltip.classList.add('invisible', 'opacity-0')
                                      tooltip.classList.remove('visible', 'opacity-100')
                                    }
                                  }} />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {(() => {
                            const status = (currentAnalysis.analysis_data.team_health?.health_status || (() => {
                              // Derive health status from average score for team_summary (now health scale 0-10, higher=better)
                              const avgScore = currentAnalysis.analysis_data.team_summary?.average_score;
                              if (!avgScore) return 'excellent';
                              if (avgScore >= 8) return 'excellent';
                              if (avgScore >= 6) return 'good';
                              if (avgScore >= 4) return 'fair';
                              if (avgScore >= 2) return 'poor';
                              return 'critical';
                            })()).toLowerCase()
                            switch(status) {
                              case 'excellent':
                                return 'Low stress, sustainable workload'
                              case 'good':
                                return 'Manageable workload with minor stress'
                              case 'fair':
                                return 'Moderate stress, watch for trends'
                              case 'poor':
                                return 'High stress, intervention needed'
                              case 'critical':
                                return 'Severe burnout risk'
                              default:
                                return 'Measures team workload sustainability and burnout risk levels'
                            }
                          })()}
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        {currentAnalysis?.status === 'failed' ? 'Analysis failed' : 'Analysis in progress...'}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700 flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>At Risk</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentAnalysis?.analysis_data?.team_health || (currentAnalysis?.analysis_data?.team_analysis && currentAnalysis?.status === 'completed') ? (
                      <div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl font-bold text-red-600">{currentAnalysis.analysis_data.team_health?.risk_distribution?.high || currentAnalysis.analysis_data.team_summary?.risk_distribution?.high || 0}</div>
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <span className="text-sm text-gray-600">High risk</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-2xl font-bold text-orange-600">{currentAnalysis.analysis_data.team_health?.risk_distribution?.medium || currentAnalysis.analysis_data.team_summary?.risk_distribution?.medium || 0}</div>
                            <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            </div>
                            <span className="text-sm text-gray-600">Medium risk</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Out of {Array.isArray(currentAnalysis.analysis_data.team_analysis) ? currentAnalysis.analysis_data.team_analysis.length : (currentAnalysis.analysis_data.team_analysis?.members?.length || 0)} members
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        {currentAnalysis?.status === 'failed' ? 'Analysis failed' : 'Analysis in progress...'}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Total Incidents</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900">
                      {(currentAnalysis.analysis_data as any)?.metadata?.total_incidents !== undefined 
                        ? (currentAnalysis.analysis_data as any).metadata.total_incidents
                        : (currentAnalysis.analysis_data as any)?.team_analysis?.total_incidents !== undefined
                        ? (currentAnalysis.analysis_data as any).team_analysis.total_incidents
                        : currentAnalysis.analysis_data?.partial_data?.incidents?.length || 0}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      In the last {currentAnalysis.time_range || 30} days
                    </p>
                    {(currentAnalysis.analysis_data as any)?.metadata?.severity_breakdown && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        <div className="bg-red-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-red-700">SEV1</div>
                          <div className="text-lg font-bold text-red-600">
                            {(currentAnalysis.analysis_data as any).metadata.severity_breakdown.sev1_count || 0}
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-orange-700">SEV2</div>
                          <div className="text-lg font-bold text-orange-600">
                            {(currentAnalysis.analysis_data as any).metadata.severity_breakdown.sev2_count || 0}
                          </div>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-yellow-700">SEV3</div>
                          <div className="text-lg font-bold text-yellow-600">
                            {(currentAnalysis.analysis_data as any).metadata.severity_breakdown.sev3_count || 0}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-semibold text-green-700">SEV4</div>
                          <div className="text-lg font-bold text-green-600">
                            {(currentAnalysis.analysis_data as any).metadata.severity_breakdown.sev4_count || 0}
                          </div>
                        </div>
                      </div>
                    )}
                    {currentAnalysis.analysis_data?.session_hours !== undefined && (
                      <p className="text-xs text-gray-600 mt-1">
                        {currentAnalysis.analysis_data.session_hours?.toFixed(1) || '0.0'} total hours
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Data Sources Card */}
                <Card className="border-2 border-blue-200 bg-white/70 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>Data Sources</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Incident Data */}
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs font-medium text-slate-700">Incident Management</span>
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      </div>
                      
                      {/* GitHub Data */}
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                        <span className="text-xs font-medium text-slate-700">GitHub Activity</span>
                        {currentAnalysis?.analysis_data?.data_sources?.github_data ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Minus className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Slack Data */}
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs font-medium text-slate-700">Slack Communications</span>
                        {currentAnalysis?.analysis_data?.data_sources?.slack_data ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Minus className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Analysis Type Indicator */}
                      <div className="pt-2 border-t border-blue-100">
                        <p className="text-xs text-blue-600 font-medium">
                          {(() => {
                            const dataSources = currentAnalysis?.analysis_data?.data_sources
                            if (!dataSources) return "Single-source analysis"
                            
                            const sources = []
                            if (dataSources.incident_data) sources.push("incidents")
                            if (dataSources.github_data) sources.push("GitHub")
                            if (dataSources.slack_data) sources.push("Slack")
                            
                            if (sources.length === 1) return "Single-source analysis"
                            if (sources.length === 2) return "Multi-source analysis"
                            return "Comprehensive analysis"
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights Card - Text-based summary */}
              {currentAnalysis?.analysis_data?.ai_team_insights?.available && (
                <Card className="mb-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-blue-200 shadow-sm">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      <CardTitle>AI Team Insights</CardTitle>
                      <Badge variant="secondary" className="text-xs">AI Enhanced</Badge>
                    </div>
                    <CardDescription>
                      Analysis generated from {currentAnalysis.analysis_data.ai_team_insights.insights?.team_size || 0} team members
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="prose prose-sm max-w-none">
                    {(() => {
                      const aiInsights = currentAnalysis.analysis_data.ai_team_insights.insights;
                      const teamAnalysis = currentAnalysis.analysis_data.team_analysis;
                      const members = Array.isArray(teamAnalysis) ? teamAnalysis : (teamAnalysis?.members || []);
                      const riskDist = aiInsights?.risk_distribution;
                      const highRiskCount = (riskDist?.high || 0) + ((riskDist as any)?.critical || 0);
                      const mediumRiskCount = riskDist?.medium || 0;
                      const lowRiskCount = riskDist?.low || 0;
                      const highRiskMembers = members.filter(m => m.risk_level === 'high' || m.risk_level === 'critical');
                      const hasPatterns = aiInsights?.common_patterns && aiInsights.common_patterns.length > 0;
                      const hasRecommendations = aiInsights?.team_recommendations && aiInsights.team_recommendations.length > 0;
                      
                      // Calculate average burnout score - only include users with incidents
                      const membersWithIncidentsForInsights = (members as any[]).filter((m: any) => (m?.incident_count || 0) > 0);
                      const avgBurnoutScore = membersWithIncidentsForInsights.length > 0 ? 
                        membersWithIncidentsForInsights.reduce((sum: number, m: any) => sum + (m.burnout_score || 0), 0) / membersWithIncidentsForInsights.length * 10 : 0;
                      
                      // Analyze burnout sources from team factors
                      const analyzeBurnoutSources = () => {
                        if (members.length === 0) return null;
                        
                        const factorTotals = {
                          workload: 0,
                          after_hours: 0,
                          weekend_work: 0,
                          incident_load: 0,
                          response_time: 0
                        };
                        
                        // Sum all factor scores across team members
                        members.forEach(member => {
                          if (member.factors || member.key_metrics) {
                            factorTotals.workload += member.factors?.workload || member.key_metrics?.incidents_per_week || 0;
                            factorTotals.after_hours += member.factors?.after_hours || member.key_metrics?.after_hours_percentage || 0;
                            factorTotals.weekend_work += member.factors?.weekend_work || 0;
                            factorTotals.incident_load += member.factors?.incident_load || member.key_metrics?.incidents_per_week || 0;
                            factorTotals.response_time += member.factors?.response_time || member.key_metrics?.avg_resolution_hours || 0;
                          }
                        });
                        
                        // Calculate averages
                        const factorAverages = Object.entries(factorTotals).map(([key, total]) => ({
                          name: key,
                          average: total / members.length,
                          displayName: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                        }));
                        
                        // Sort by highest average impact
                        return factorAverages.sort((a, b) => b.average - a.average);
                      };
                      
                      const burnoutSources = analyzeBurnoutSources();
                      const topBurnoutFactor = burnoutSources?.[0];
                      const secondaryFactors = burnoutSources?.slice(1, 3).filter(f => f.average > 0.3);
                      
                      return (
                        <div className="space-y-4 text-gray-700">
                          {/* Summary Paragraph */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                            <p className="leading-relaxed">
                              The team has {members.length} members total, with {membersWithIncidentsForInsights.length} handling incidents. Among active incident responders, the average burnout score is {avgBurnoutScore.toFixed(0)}%. 
                              {highRiskCount > 0 ? (
                                <> Currently, <span className="font-semibold text-red-600">{highRiskCount} member{highRiskCount > 1 ? 's are' : ' is'} at high risk</span> of burnout, requiring immediate attention. </>
                              ) : mediumRiskCount > 0 ? (
                                <> The team has <span className="font-semibold text-amber-600">{mediumRiskCount} member{mediumRiskCount > 1 ? 's' : ''} at medium risk</span>, indicating emerging stress patterns that should be monitored. </>
                              ) : (
                                <> The team is in <span className="font-semibold text-green-600">good health</span> with no members currently at high risk. </>
                              )}
                              {topBurnoutFactor && topBurnoutFactor.average > 0.4 && (
                                <> The primary burnout driver is <span className="font-semibold text-red-600">{topBurnoutFactor.displayName.toLowerCase()}</span> (impact: {Math.min(topBurnoutFactor.average * 10, 10).toFixed(1)}/10){secondaryFactors.length > 0 && (
                                  <>, with secondary stress from {secondaryFactors.map(f => f.displayName.toLowerCase()).join(' and ')}</>
                                )}. </>
                              )}
                              {hasPatterns && aiInsights.common_patterns[0] && (
                                <> Analysis reveals {aiInsights.common_patterns[0].description.toLowerCase()} </>
                              )}
                            </p>
                          </div>

                          {/* Standouts Paragraph */}
                          {(highRiskMembers.length > 0 || hasPatterns || (topBurnoutFactor && topBurnoutFactor.average > 0.3)) && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Key Observations</h4>
                              <p className="leading-relaxed">
                                {highRiskMembers.length > 0 && (
                                  <>
                                    <span className="font-semibold">{highRiskMembers[0].user_name}</span> stands out with a burnout score of {((highRiskMembers[0].burnout_score || 0) * 10).toFixed(0)}%, 
                                    having handled {highRiskMembers[0].incident_count || 0} incidents in the analysis period{(() => {
                                      const topMemberFactor = highRiskMembers[0].factors ? 
                                        Object.entries(highRiskMembers[0].factors)
                                          .sort(([,a], [,b]) => (b as number) - (a as number))[0] : null;
                                      if (topMemberFactor && (topMemberFactor[1] as number) > 0.6) {
                                        const factorName = topMemberFactor[0].replace('_', ' ');
                                        return `, primarily driven by ${factorName}`;
                                      }
                                      return '';
                                    })()}. 
                                    {highRiskMembers.length > 1 && (
                                      <> Similarly, {highRiskMembers.slice(1, 3).map(m => m.user_name).join(' and ')} 
                                      {highRiskMembers.length > 3 && ` (and ${highRiskMembers.length - 3} others)`} also show concerning burnout indicators. </>
                                    )}
                                  </>
                                )}
                                {topBurnoutFactor && topBurnoutFactor.average > 0.3 && !highRiskMembers.length && (
                                  <>Across the team, <span className="font-semibold text-amber-600">{topBurnoutFactor.displayName.toLowerCase()}</span> is the most significant stress factor, 
                                  affecting team members with an average impact of {Math.min(topBurnoutFactor.average * 10, 10).toFixed(1)}/10. </>
                                )}
                                {hasPatterns && aiInsights.common_patterns.length > 1 && (
                                  <> The team exhibits {aiInsights.common_patterns.length} distinct burnout patterns, 
                                  with "{aiInsights.common_patterns[0].pattern}" being the most prevalent. </>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Recommendations Paragraph */}
                          {hasRecommendations && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
                              <p className="leading-relaxed">
                                {aiInsights.team_recommendations[0] && (
                                  <>
                                    The highest priority action is to <span className="font-semibold">{aiInsights.team_recommendations[0].title.toLowerCase()}</span>. 
                                    {aiInsights.team_recommendations[0].description} 
                                    {aiInsights.team_recommendations[0].expected_impact && (
                                      <> This is expected to {aiInsights.team_recommendations[0].expected_impact.toLowerCase()}</>
                                    )}
                                  </>
                                )}
                                {aiInsights.team_recommendations.length > 1 && (
                                  <> Additionally, consider {aiInsights.team_recommendations[1].title.toLowerCase()} 
                                  {aiInsights.team_recommendations.length > 2 && 
                                    ` along with ${aiInsights.team_recommendations.length - 2} other recommended actions`}. </>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Partial Data Warning */}
              {currentAnalysis?.analysis_data?.error && currentAnalysis?.analysis_data?.partial_data && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5" />
                      <span>Partial Data Available</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-yellow-700 mb-4">
                      Analysis processing failed, but we successfully collected raw data from Rootly:
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Users collected:</span>
                        <p className="text-lg font-bold text-yellow-800">
                          {currentAnalysis.analysis_data.partial_data.users?.length || 0}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Incidents collected:</span>
                        <p className="text-lg font-bold text-yellow-800">
                          {currentAnalysis.analysis_data.partial_data.incidents?.length || 0}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                      <p className="text-xs text-yellow-600">
                        <strong>Error:</strong> {currentAnalysis.analysis_data.error}
                      </p>
                    </div>
                    <div className="mt-4 flex space-x-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const partialData = {
                            analysis_id: currentAnalysis.id,
                            export_date: new Date().toISOString(),
                            data_collection_successful: currentAnalysis.analysis_data.data_collection_successful,
                            failure_stage: currentAnalysis.analysis_data.failure_stage,
                            error: currentAnalysis.analysis_data.error,
                            users: currentAnalysis.analysis_data.partial_data.users,
                            incidents: currentAnalysis.analysis_data.partial_data.incidents,
                            metadata: currentAnalysis.analysis_data.partial_data.metadata
                          }
                          
                          const blob = new Blob([JSON.stringify(partialData, null, 2)], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `rootly-partial-data-${currentAnalysis.id}.json`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        }}
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Raw Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Organization Member Scores - Full Width */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Individual burnout risk levels and incident metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {memberBarData.length > 0 ? (
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberBarData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="fullName" 
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip 
                            formatter={(value, name, props) => {
                              const data = props.payload;
                              return [
                                `${Number(value).toFixed(2)}%`, 
                                `Burnout Score (${data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1)} Risk)`
                              ];
                            }}
                            labelFormatter={(label, payload) => {
                              const data = payload?.[0]?.payload;
                              return data ? `${data.fullName}` : label;
                            }}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Bar 
                            dataKey="score" 
                            radius={[4, 4, 0, 0]}
                          >
                            {memberBarData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <p className="text-lg font-medium">No incident data available</p>
                        <p className="text-sm mt-2">Members with zero incidents are not displayed in this chart</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Burnout Journey Map */}
                <Card>
                  <CardHeader>
                    <CardTitle>Burnout Timeline</CardTitle>
                    <CardDescription>
                      {historicalTrends?.timeline_events?.length > 0 
                        ? `Real timeline from ${historicalTrends.timeline_events.length} burnout events in your data`
                        : "Timeline of stress patterns and recovery periods"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {loadingTrends ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Loading journey...</p>
                          </div>
                        </div>
                      ) : (
                        (() => {
                        // Calculate high risk members for journey map
                        const highRiskMembers = members.filter(m => m.risk_level === 'high' || m.risk_level === 'critical');
                        
                        // Calculate health score
                        const healthScore = currentAnalysis?.analysis_data?.team_health ? 
                          Math.round(currentAnalysis.analysis_data.team_health.overall_score * 10) : 92;
                        
                        // Use real timeline events from historical data
                        let journeyEvents = [];
                        
                        if (historicalTrends?.timeline_events?.length > 0) {
                          journeyEvents = historicalTrends.timeline_events.map((event: any) => ({
                            date: new Date(event.iso_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            }),
                            status: event.status,
                            title: event.title,
                            description: event.description,
                            color: event.color,
                            impact: event.impact,
                            severity: event.severity,
                            metrics: event.metrics
                          }));
                        } else if (currentAnalysis?.analysis_data?.daily_trends?.length > 0) {
                          // Generate timeline events from daily trends
                          const dailyTrends = currentAnalysis.analysis_data.daily_trends;
                          const significantDays = dailyTrends.filter((day: any) => {
                            // Find days with significant events
                            return day.incident_count > 5 || 
                                   day.members_at_risk > 2 || 
                                   day.health_status === 'critical' || 
                                   day.health_status === 'poor' ||
                                   (day.after_hours_count / day.incident_count > 0.5 && day.incident_count > 0);
                          });
                          
                          journeyEvents = significantDays.slice(-5).map((day: any) => ({
                            date: new Date(day.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            }),
                            status: day.health_status === 'critical' ? 'critical-burnout' : 
                                   day.health_status === 'poor' ? 'medium-risk' : 'current',
                            title: day.incident_count > 5 ? 'High Incident Volume' : 
                                  day.members_at_risk > 2 ? 'Multiple Members at Risk' :
                                  day.health_status === 'critical' ? 'Critical Period' :
                                  'Elevated Activity',
                            description: `${day.incident_count} incidents, ${day.members_at_risk} at risk. Health: ${Math.round(day.overall_score * 10)}%`,
                            color: day.overall_score < 4 ? 'bg-red-600' : 
                                  day.overall_score < 7 ? 'bg-orange-500' : 'bg-green-500',
                            impact: day.overall_score < 4 ? 'negative' : 
                                   day.overall_score < 7 ? 'neutral' : 'positive'
                          }));
                          
                          // Add current state
                          if (journeyEvents.length === 0 || journeyEvents[journeyEvents.length - 1].date !== 'Current') {
                            journeyEvents.push({
                              date: 'Current',
                              status: 'current',
                              title: 'Current State',
                              description: `${healthScore}% organization health score`,
                              color: 'bg-purple-500',
                              impact: healthScore >= 80 ? 'positive' : healthScore >= 60 ? 'neutral' : 'negative'
                            });
                          }
                        } else {
                          // Fallback to single current state
                          journeyEvents = [{
                            date: 'Current',
                            status: 'current',
                            title: 'Current State',
                            description: `${healthScore}% organization health score`,
                            color: 'bg-purple-500',
                            impact: healthScore >= 80 ? 'positive' : healthScore >= 60 ? 'neutral' : 'negative'
                          }];
                        }

                        return (
                          <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                            
                            {journeyEvents.map((event, index) => (
                              <div key={index} className="relative flex items-start space-x-4 pb-6">
                                {/* Timeline dot */}
                                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${(() => {
                                  // Ensure success events have visible round colored backgrounds
                                  if (event.status === 'excellence') return 'bg-emerald-500';
                                  if (event.status === 'recovery') return 'bg-green-500';
                                  if (event.status === 'improvement') return 'bg-blue-500';
                                  if (event.status === 'risk-eliminated') return 'bg-green-500';
                                  if (event.status === 'risk-decrease') return 'bg-green-400';
                                  return event.color || 'bg-gray-500';
                                })()} shadow-sm ring-4 ring-white`}>
                                  {(() => {
                                    // Use more vibrant colors for success icons
                                    let iconColor = 'text-white'; // Default for dark backgrounds
                                    
                                    if (event.impact === 'positive' || event.status === 'risk-decrease' || event.status === 'improvement' || event.status === 'recovery' || event.status === 'excellence' || event.status === 'risk-eliminated') {
                                      // Success icons get vibrant colors based on event type
                                      if (event.status === 'excellence') {
                                        iconColor = 'text-green-800'; // Dark green on emerald for vibrant success
                                      } else if (event.status === 'risk-eliminated' || event.status === 'recovery') {
                                        iconColor = 'text-white'; // White on green for strong contrast
                                      } else if (event.status === 'risk-decrease') {
                                        iconColor = 'text-green-800'; // Dark green on light green
                                      } else if (event.status === 'improvement') {
                                        iconColor = 'text-white'; // White on blue
                                      } else {
                                        iconColor = 'text-white'; // Default white for other positive events
                                      }
                                      return <TrendingUp className={`h-4 w-4 ${iconColor}`} />;
                                    }
                                    if (event.impact === 'negative' || event.status === 'critical-burnout' || event.status === 'medium-risk' || event.status === 'decline' || event.status === 'risk-increase') {
                                      return <TrendingDown className={`h-4 w-4 text-white`} />;
                                    }
                                    if (event.impact === 'neutral' || event.status === 'current') {
                                      return <Minus className={`h-4 w-4 text-white`} />;
                                    }
                                    return null;
                                  })()}
                                </div>
                                
                                {/* Event content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                                    <time className="text-xs text-gray-500">{event.date}</time>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                        })()
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Historical Burnout Score Graph */}
                <Card>
                  <CardHeader>
                    <CardTitle>Health Trends</CardTitle>
                    <CardDescription>
                      {historicalTrends?.daily_trends?.length > 0 
                        ? `Real health trends from ${historicalTrends.daily_trends.length} days of analysis data`
                        : "Organization health score over time"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      {loadingTrends ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Loading trends...</p>
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={(() => {
                          // Use real historical trends data if available
                          if (historicalTrends?.daily_trends?.length > 0) {
                            return historicalTrends.daily_trends.map((trend: any) => ({
                              date: new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                              score: Math.round(trend.overall_score * 10), // Convert 0-10 scale to 0-100 for display
                              riskLevel: trend.overall_score >= 8 ? 'low' : trend.overall_score >= 6 ? 'medium' : 'high',
                              membersAtRisk: trend.members_at_risk,
                              totalMembers: trend.total_members,
                              healthStatus: trend.health_status,
                              incidentCount: trend.incident_count
                            }));
                          }
                          
                          // Use daily_trends from current analysis if available (SimpleBurnoutAnalyzer)
                          if (currentAnalysis?.analysis_data?.daily_trends?.length > 0) {
                            return currentAnalysis.analysis_data.daily_trends.map((trend: any) => ({
                              date: new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                              score: Math.round(trend.overall_score * 10), // Convert 0-10 scale to 0-100 for display
                              riskLevel: trend.overall_score >= 8 ? 'low' : trend.overall_score >= 6 ? 'medium' : 'high',
                              membersAtRisk: trend.members_at_risk,
                              totalMembers: trend.total_members,
                              healthStatus: trend.health_status,
                              incidentCount: trend.incident_count
                            }));
                          }
                          
                          // Fallback: show current analysis as single point if no historical data
                          const healthScore = currentAnalysis?.analysis_data?.team_health ? 
                            Math.round(currentAnalysis.analysis_data.team_health.overall_score * 10) : 92;
                          
                          return [{
                            date: 'Current',
                            score: healthScore,
                            riskLevel: healthScore >= 80 ? 'low' : healthScore >= 60 ? 'medium' : 'high'
                          }];
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis domain={[30, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip 
                            content={({ payload, label }) => {
                              if (payload && payload.length > 0) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{label}</p>
                                    <p className="text-purple-600">Health Score: {Math.round(Number(payload[0].value))}%</p>
                                    <p className={`text-sm font-medium ${
                                      data.riskLevel === 'low' ? 'text-green-600' :
                                      data.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                      Risk Level: {data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1)}
                                    </p>
                                    {data.incidentCount !== undefined && (
                                      <p className="text-sm text-gray-600">
                                        Incidents: {data.incidentCount}
                                      </p>
                                    )}
                                    {data.membersAtRisk !== undefined && (
                                      <p className="text-sm text-gray-600">
                                        At Risk: {data.membersAtRisk}/{data.totalMembers} users with incidents
                                      </p>
                                    )}
                                    {data.healthStatus && (
                                      <p className="text-sm text-gray-600">
                                        Status: {data.healthStatus.charAt(0).toUpperCase() + data.healthStatus.slice(1)}
                                      </p>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#8B5CF6" 
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Burnout Factors Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Radar Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Risk Factors</CardTitle>
                      {highRiskFactors.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">
                            {highRiskFactors.length} factor{highRiskFactors.length > 1 ? 's' : ''} need{highRiskFactors.length === 1 ? 's' : ''} attention
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[450px] p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={burnoutFactors} margin={{ top: 50, right: 70, bottom: 50, left: 70 }}>
                          <PolarGrid gridType="polygon" />
                          <PolarAngleAxis 
                            dataKey="factor" 
                            tick={{ fontSize: 13, fill: '#374151', fontWeight: 500 }}
                            className="text-sm"
                          />
                          <PolarRadiusAxis 
                            domain={[0, 10]} 
                            tick={{ fontSize: 11, fill: '#6B7280' }}
                            tickCount={6}
                            angle={270}
                          />
                          <Radar 
                            dataKey="value" 
                            stroke="#8B5CF6" 
                            fill="#8B5CF6" 
                            fillOpacity={0.2}
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                          />
                          <Tooltip 
                            content={({ payload, label }) => {
                              if (payload && payload.length > 0) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{label}</p>
                                    <p className="text-purple-600">Score: {Math.round(data.value)}/10</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {data.value <= 3 ? 'Low Risk' : 
                                       data.value <= 5 ? 'Moderate Risk' : 
                                       data.value <= 7 ? 'High Risk' : 'Critical Risk'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Top Risk Factors Bar Chart - Only show if there are high-risk factors */}
                {highRiskFactors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span>Critical Risks</span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRiskFactorsExpanded(!riskFactorsExpanded)}
                          className="flex items-center space-x-2"
                        >
                          <span>{riskFactorsExpanded ? 'Hide Details' : `View ${highRiskFactors.length} Risk Factor${highRiskFactors.length > 1 ? 's' : ''}`}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${riskFactorsExpanded ? 'rotate-90' : ''}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {/* Collapsed Summary View */}
                    {!riskFactorsExpanded && (
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 mb-3">
                            <strong>{highRiskFactors.length}</strong> burnout factor{highRiskFactors.length > 1 ? 's' : ''} require{highRiskFactors.length === 1 ? 's' : ''} immediate attention
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {highRiskFactors.slice(0, 4).map((factor) => (
                              <div key={factor.factor} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium">{factor.factor}</span>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    factor.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                    'bg-orange-100 text-orange-700'
                                  }`}>
                                    {factor.value}/10
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                    
                    {/* Expanded Detailed View */}
                    {riskFactorsExpanded && (
                      <CardContent>
                        <div className="space-y-4">
                          {highRiskFactors.map((factor, index) => (
                            <div key={factor.factor} className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">{factor.factor}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    factor.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                    factor.severity === 'Warning' ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {factor.severity}
                                  </span>
                                </div>
                                <span className="text-lg font-bold" style={{ color: factor.color }}>
                                  {factor.value}/10
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="h-2 rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${(factor.value / 10) * 100}%`,
                                    backgroundColor: (() => {
                                      // Standardize colors to match burnout risk levels
                                      if (factor.value <= 3) return '#10B981'; // green-500 - Low Risk
                                      if (factor.value <= 5) return '#F59E0B'; // yellow-500 - Moderate Risk
                                      if (factor.value <= 7) return '#F97316'; // orange-500 - High Risk
                                      return '#EF4444'; // red-500 - Critical Risk
                                    })()
                                  }}
                                ></div>
                              </div>
                              <div className="text-sm text-gray-600">
                                <div>{factor.metrics}</div>
                                <div className="mt-1 text-blue-600">
                                  <strong>Action:</strong> {factor.recommendation}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )}
              </div>

              {/* GitHub and Slack Metrics Section */}
              {(currentAnalysis?.analysis_data?.github_insights || currentAnalysis?.analysis_data?.slack_insights) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* GitHub Metrics Card */}
                  {currentAnalysis?.analysis_data?.github_insights && (
                    <Card className="border-2 border-gray-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-gray-900">GitHub Activity</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const github = currentAnalysis.analysis_data.github_insights
                          return (
                            <>
                              {/* GitHub Metrics Grid */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">Total Commits</p>
                                  <p className="text-lg font-bold text-gray-900">{github.total_commits?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">Pull Requests</p>
                                  <p className="text-lg font-bold text-gray-900">{github.total_pull_requests?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">Code Reviews</p>
                                  <p className="text-lg font-bold text-gray-900">{github.total_reviews?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">After Hours</p>
                                  <p className="text-lg font-bold text-gray-900">{github.after_hours_activity_percentage?.toFixed(1) || 0}%</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">Weekend Commits</p>
                                  <p className="text-lg font-bold text-gray-900">{github.weekend_activity_percentage?.toFixed(1) || 0}%</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-xs text-gray-600 font-medium">Avg PR Size</p>
                                  <p className="text-lg font-bold text-gray-900">{(github as any).avg_pr_size?.toFixed(0) || 0} lines</p>
                                </div>
                              </div>

                              {/* Burnout Indicators */}
                              {github.burnout_indicators && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <h4 className="text-sm font-semibold text-red-800 mb-2">Burnout Risk Indicators</h4>
                                  <div className="space-y-1 text-xs">
                                    {github.burnout_indicators.excessive_late_night_commits > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{github.burnout_indicators.excessive_late_night_commits} members with excessive late-night commits</span>
                                      </div>
                                    )}
                                    {github.burnout_indicators.weekend_workers > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{github.burnout_indicators.weekend_workers} members working weekends</span>
                                      </div>
                                    )}
                                    {github.burnout_indicators.large_pr_pattern > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{github.burnout_indicators.large_pr_pattern} members with large PR patterns</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Top Contributors */}
                              {github.top_contributors && github.top_contributors.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Top Contributors</h4>
                                  <div className="space-y-1">
                                    {github.top_contributors.slice(0, 3).map((contributor, index) => (
                                      <div key={index} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                                        <span className="font-medium text-gray-700">{contributor.username}</span>
                                        <span className="text-gray-600">{contributor.commits} commits, {contributor.prs} PRs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Slack Metrics Card */}
                  {currentAnalysis?.analysis_data?.slack_insights && (
                    <Card className="border-2 border-purple-200 bg-white/70 backdrop-blur-sm shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8" viewBox="0 0 124 124" fill="none">
                              <path d="M26.3996 78.2003C26.3996 84.7003 21.2996 89.8003 14.7996 89.8003C8.29961 89.8003 3.19961 84.7003 3.19961 78.2003C3.19961 71.7003 8.29961 66.6003 14.7996 66.6003H26.3996V78.2003Z" fill="#E01E5A"/>
                              <path d="M32.2996 78.2003C32.2996 71.7003 37.3996 66.6003 43.8996 66.6003C50.3996 66.6003 55.4996 71.7003 55.4996 78.2003V109.2C55.4996 115.7 50.3996 120.8 43.8996 120.8C37.3996 120.8 32.2996 115.7 32.2996 109.2V78.2003Z" fill="#E01E5A"/>
                              <path d="M43.8996 26.4003C37.3996 26.4003 32.2996 21.3003 32.2996 14.8003C32.2996 8.30026 37.3996 3.20026 43.8996 3.20026C50.3996 3.20026 55.4996 8.30026 55.4996 14.8003V26.4003H43.8996Z" fill="#36C5F0"/>
                              <path d="M43.8996 32.3003C50.3996 32.3003 55.4996 37.4003 55.4996 43.9003C55.4996 50.4003 50.3996 55.5003 43.8996 55.5003H12.8996C6.39961 55.5003 1.29961 50.4003 1.29961 43.9003C1.29961 37.4003 6.39961 32.3003 12.8996 32.3003H43.8996Z" fill="#36C5F0"/>
                              <path d="M95.5996 43.9003C95.5996 37.4003 100.7 32.3003 107.2 32.3003C113.7 32.3003 118.8 37.4003 118.8 43.9003C118.8 50.4003 113.7 55.5003 107.2 55.5003H95.5996V43.9003Z" fill="#2EB67D"/>
                              <path d="M89.6996 43.9003C89.6996 50.4003 84.5996 55.5003 78.0996 55.5003C71.5996 55.5003 66.4996 50.4003 66.4996 43.9003V12.9003C66.4996 6.40026 71.5996 1.30026 78.0996 1.30026C84.5996 1.30026 89.6996 6.40026 89.6996 12.9003V43.9003Z" fill="#2EB67D"/>
                              <path d="M78.0996 95.6003C84.5996 95.6003 89.6996 100.7 89.6996 107.2C89.6996 113.7 84.5996 118.8 78.0996 118.8C71.5996 118.8 66.4996 113.7 66.4996 107.2V95.6003H78.0996Z" fill="#ECB22E"/>
                              <path d="M78.0996 89.7003C71.5996 89.7003 66.4996 84.6003 66.4996 78.1003C66.4996 71.6003 71.5996 66.5003 78.0996 66.5003H109.1C115.6 66.5003 120.7 71.6003 120.7 78.1003C120.7 84.6003 115.6 89.7003 109.1 89.7003H78.0996Z" fill="#ECB22E"/>
                            </svg>
                          </div>
                          <span className="text-gray-900">Slack Communications</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(() => {
                          const slack = currentAnalysis.analysis_data.slack_insights || { errors: {} }
                          
                          // Check if this analysis actually has valid Slack data
                          // If no team members have slack_activity, don't show cached/stale data
                          const teamAnalysis = currentAnalysis.analysis_data.team_analysis
                          const teamMembers = Array.isArray(teamAnalysis) ? teamAnalysis : (teamAnalysis?.members || [])
                          const hasRealSlackData = teamMembers.some(member => 
                            member.slack_activity && 
                            (member.slack_activity.messages_sent > 0 || member.slack_activity.channels_active > 0)
                          )
                          
                          // If no real Slack data, reset metrics to 0
                          const slackMetrics = hasRealSlackData ? slack : {
                            total_messages: 0,
                            active_channels: 0,
                            after_hours_activity_percentage: 0,
                            weekend_activity_percentage: 0,
                            sentiment_analysis: { avg_sentiment: null, overall_sentiment: 'Neutral' }
                          }
                          
                          const hasRateLimitErrors = (slack as any).errors?.rate_limited_channels?.length > 0
                          const hasOtherErrors = (slack as any).errors?.other_errors?.length > 0
                          
                          return (
                            <>
                              {/* Error Messages */}
                              {hasRateLimitErrors && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-yellow-800">Rate Limited</span>
                                  </div>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    Some channels were rate limited: {(slack as any).errors.rate_limited_channels.join(", ")}. 
                                    Data may be incomplete. <button 
                                      onClick={() => window.location.reload()} 
                                      className="text-yellow-800 underline hover:text-yellow-900"
                                    >
                                      Refresh to retry
                                    </button>
                                  </p>
                                </div>
                              )}
                              
                              {hasOtherErrors && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-red-800">Connection Issues</span>
                                  </div>
                                  <p className="text-xs text-red-700 mt-1">
                                    {(slack as any).errors.other_errors.slice(0, 2).join("; ")}
                                    {(slack as any).errors.other_errors.length > 2 && ` and ${(slack as any).errors.other_errors.length - 2} more...`}
                                  </p>
                                </div>
                              )}
                              
                              {/* Slack Metrics Grid */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">Total Messages</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).total_messages?.toLocaleString() || 0}</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">Active Channels</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).active_channels || 0}</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">After Hours</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).after_hours_activity_percentage?.toFixed(1) || 0}%</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">Weekend Messages</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).weekend_activity_percentage?.toFixed(1) || 0}%</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">Avg Response Time</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).avg_response_time_minutes?.toFixed(0) || 0}m</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-3">
                                  <p className="text-xs text-purple-600 font-medium">After Hours</p>
                                  <p className="text-lg font-bold text-purple-900">{(slackMetrics as any).after_hours_activity_percentage?.toFixed(1) || 0}%</p>
                                </div>
                              </div>

                              {/* Sentiment Analysis */}
                              {(slackMetrics as any).sentiment_analysis && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Communication Health</h4>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-blue-700">Average Sentiment</span>
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-lg font-bold ${
                                        (slackMetrics as any).sentiment_analysis.avg_sentiment > 0.1 ? 'text-green-600' :
                                        (slackMetrics as any).sentiment_analysis.avg_sentiment < -0.1 ? 'text-red-600' : 'text-yellow-600'
                                      }`}>
                                        {(slackMetrics as any).sentiment_analysis.avg_sentiment > 0.1 ? 'Positive' :
                                         (slackMetrics as any).sentiment_analysis.avg_sentiment < -0.1 ? 'Negative' : 'Neutral'}
                                      </span>
                                      <span className="text-xs text-blue-600">
                                        ({(slackMetrics as any).sentiment_analysis.avg_sentiment?.toFixed(2) || 'N/A'})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Burnout Indicators */}
                              {(slackMetrics as any).burnout_indicators && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <h4 className="text-sm font-semibold text-red-800 mb-2">Communication Risk Indicators</h4>
                                  <div className="space-y-1 text-xs">
                                    {(slackMetrics as any).burnout_indicators.excessive_messaging > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{(slackMetrics as any).burnout_indicators.excessive_messaging} members with excessive messaging</span>
                                      </div>
                                    )}
                                    {(slackMetrics as any).burnout_indicators.poor_sentiment_users > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{(slackMetrics as any).burnout_indicators.poor_sentiment_users} members with poor sentiment</span>
                                      </div>
                                    )}
                                    {(slackMetrics as any).burnout_indicators.after_hours_communicators > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-red-700">{(slackMetrics as any).burnout_indicators.after_hours_communicators} members communicating after hours</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Organization Members Grid */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Overview</CardTitle>
                  <CardDescription>Click on a member to view detailed analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const teamAnalysis = currentAnalysis?.analysis_data?.team_analysis
                      const members = Array.isArray(teamAnalysis) ? teamAnalysis : teamAnalysis?.members
                      return members
                        ?.sort((a, b) => b.burnout_score - a.burnout_score) // Sort by burnout score descending (highest risk first)
                        ?.map((member) => (
                      <Card
                        key={member.user_id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedMember({
                          id: member.user_id || '',
                          name: member.user_name || 'Unknown',
                          email: member.user_email || '',
                          burnoutScore: (member.burnout_score || 0) * 10, // Convert 0-10 scale to 0-100 percentage
                          riskLevel: (member.risk_level || 'low') as 'high' | 'medium' | 'low',
                          trend: 'stable' as const,
                          incidentsHandled: member.incident_count || 0,
                          avgResponseTime: `${Math.round(member.metrics?.avg_response_time_minutes || 0)}m`,
                          factors: {
                            workload: Math.round(((member.factors?.workload || member.key_metrics?.incidents_per_week || 0)) * 10) / 10,
                            afterHours: Math.round(((member.factors?.after_hours || member.key_metrics?.after_hours_percentage || 0)) * 10) / 10,
                            weekendWork: Math.round(((member.factors?.weekend_work || 0)) * 10) / 10,
                            incidentLoad: Math.round(((member.factors?.incident_load || member.key_metrics?.incidents_per_week || 0)) * 10) / 10,
                            responseTime: Math.round(((member.factors?.response_time || member.key_metrics?.avg_resolution_hours || 0)) * 10) / 10,
                          },
                          metrics: member.metrics || {},
                          github_activity: member.github_activity || null,
                          slack_activity: member.slack_activity || null
                        })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {member.user_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">{member.user_name}</h3>
                                <p className="text-sm text-gray-500">{member.user_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getRiskColor(member.risk_level)}>{member.risk_level.toUpperCase()}</Badge>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Burnout Score</span>
                              <span className="font-medium">{((member?.burnout_score || 0) * 10).toFixed(1)}%</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div 
                                className={`h-full transition-all ${getProgressColor(member.risk_level)}`}
                                style={{ width: `${member.burnout_score * 10}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>{member.incident_count} incidents</span>
                              <span>{Math.round(member.metrics?.avg_response_time_minutes || (member.key_metrics?.avg_resolution_hours ? member.key_metrics.avg_resolution_hours * 60 : 0))}m avg response</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      )) || (
                        <div className="col-span-full text-center text-gray-500 py-8">
                          No organization member data available yet
                        </div>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Analysis Selected But Insufficient Data (For completed analyses with no meaningful data) */}
          {shouldShowInsufficientDataCard() && currentAnalysis.status !== 'failed' && (
            <Card className="text-center p-8 border-yellow-200 bg-yellow-50">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-yellow-800">Insufficient Data</h3>
              <p className="text-yellow-700 mb-4">
                This analysis has insufficient data to generate meaningful burnout insights. This could be due to lack of organization member data, incident history, or API access issues.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={startAnalysis} 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Rerun Analysis
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (currentAnalysis) {
                      openDeleteDialog(currentAnalysis, { stopPropagation: () => {} } as React.MouseEvent)
                    }
                  }}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Selection
                </Button>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!analysisRunning && !currentAnalysis && (
            <>
              {/* Check if integrations exist */}
              {integrations.length === 0 ? (
                <Card className="text-center p-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Setup Required</h3>
                  <p className="text-gray-600 mb-4">
                    Connect your first integration to start analyzing burnout metrics. Both Rootly and PagerDuty are supported.
                  </p>
                  <Button onClick={() => router.push('/integrations')} className="bg-blue-600 hover:bg-blue-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Setup Integrations
                  </Button>
                </Card>
              ) : (
                <>
                  {/* Check for missing platforms */}
                  {(() => {
                    const hasRootly = integrations.some(i => i.platform === 'rootly')
                    
                    if (!hasRootly) {
                      return (
                        <div className="space-y-4 mb-6">
                          {!hasRootly && (
                            <Alert className="border-purple-200 bg-purple-50">
                              <Info className="w-4 h-4 text-purple-600" />
                              <AlertDescription className="text-purple-800">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <strong>Rootly Integration Available</strong>
                                    <span className="block text-sm mt-1">
                                      Connect Rootly for comprehensive incident management and team burnout analysis.
                                    </span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    onClick={() => router.push('/integrations')} 
                                    className="bg-purple-600 hover:bg-purple-700 ml-4"
                                  >
                                    Setup Rootly
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  {/* Standard empty state */}
                  <Card className="text-center p-8">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Activity className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Click "New Analysis" to start analyzing your organization's burnout metrics
                    </p>
                    <Button onClick={startAnalysis} className="bg-purple-600 hover:bg-purple-700">
                      <Play className="w-4 h-4 mr-2" />
                      New Analysis
                    </Button>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Time Range Selection Dialog */}
      <Dialog open={showTimeRangeDialog} onOpenChange={setShowTimeRangeDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start New Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Organization
              </label>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                {(() => {
                  const selected = integrations.find(i => i.id.toString() === dialogSelectedIntegration)
                  if (selected) {
                    return (
                      <div>
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            selected.platform === 'rootly' ? 'bg-purple-500' : 'bg-green-500'
                          }`}></div>
                          <span className="font-medium">{selected.name}</span>
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 ml-auto" />
                        </div>
                        <button 
                          onClick={() => {
                            setShowTimeRangeDialog(false)
                            router.push('/integrations')
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 block"
                        >
                          Manage integrations
                        </button>
                      </div>
                    )
                  }
                  return <span className="text-gray-500">No organization selected</span>
                })()}
              </div>
            </div>

            {/* Permission Error Alert - Only for Rootly */}
            {dialogSelectedIntegration && (() => {
              const selectedIntegration = integrations.find(i => i.id.toString() === dialogSelectedIntegration);
              
              // Only check permissions for Rootly integrations, not PagerDuty
              if (selectedIntegration?.platform === 'rootly') {
                const hasUserPermission = selectedIntegration?.permissions?.users?.access;
                const hasIncidentPermission = selectedIntegration?.permissions?.incidents?.access;
                
                if (!hasUserPermission || !hasIncidentPermission) {
                  return (
                    <Alert className="border-red-200 bg-red-50 py-2 px-3">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        <strong>Missing Required Permissions</strong>
                        <span className="block mt-1">
                          {!hasUserPermission && !hasIncidentPermission 
                            ? "User and incident read access required" 
                            : !hasUserPermission 
                            ? "User read access required" 
                            : "Incident read access required"}
                        </span>
                        <span className="text-xs opacity-75">Update API token permissions in Rootly settings</span>
                      </AlertDescription>
                    </Alert>
                  );
                }
              }
              return null;
            })()}

            {/* Additional Data Sources */}
            {true && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Additional Data Sources
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* GitHub Toggle Card */}
                  {true && (
                    <div className={`border rounded-lg p-3 transition-all ${includeGithub && githubIntegration ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}>
                      {isLoadingGitHubSlack ? (
                        /* Skeleton loader for GitHub */
                        <div className="animate-pulse">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-300 rounded"></div>
                              <div className="h-4 bg-gray-300 rounded w-16"></div>
                            </div>
                            <div className="w-10 h-6 bg-gray-300 rounded-full"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-300 rounded w-20"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-900 rounded flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-gray-900">GitHub</h3>
                              </div>
                            </div>
                            <Switch
                              checked={includeGithub && !!githubIntegration}
                              onCheckedChange={(checked) => {
                                if (!githubIntegration) {
                                  toast.error("GitHub not connected - please connect on integrations page")
                                } else {
                                  setIncludeGithub(checked)
                                }
                              }}
                              disabled={isLoadingGitHubSlack}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mb-1">Code patterns & activity</p>
                          <p className="text-xs text-gray-500">{githubIntegration?.github_username || 'Not connected'}</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Slack Toggle Card */}
                  {true && (
                    <div className={`border rounded-lg p-3 transition-all ${includeSlack && slackIntegration ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'}`}>
                      {isLoadingGitHubSlack ? (
                        /* Skeleton loader for Slack */
                        <div className="animate-pulse">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gray-300 rounded"></div>
                              <div className="h-4 bg-gray-300 rounded w-12"></div>
                            </div>
                            <div className="w-10 h-6 bg-gray-300 rounded-full"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-28 mb-1"></div>
                          <div className="h-3 bg-gray-300 rounded w-20"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded flex items-center justify-center">
                                <svg className="w-6 h-6" viewBox="0 0 124 124" fill="none">
                                  <path d="M26.3996 78.2003C26.3996 84.7003 21.2996 89.8003 14.7996 89.8003C8.29961 89.8003 3.19961 84.7003 3.19961 78.2003C3.19961 71.7003 8.29961 66.6003 14.7996 66.6003H26.3996V78.2003Z" fill="#E01E5A"/>
                                  <path d="M32.2996 78.2003C32.2996 71.7003 37.3996 66.6003 43.8996 66.6003C50.3996 66.6003 55.4996 71.7003 55.4996 78.2003V109.2C55.4996 115.7 50.3996 120.8 43.8996 120.8C37.3996 120.8 32.2996 115.7 32.2996 109.2V78.2003Z" fill="#E01E5A"/>
                                  <path d="M43.8996 26.4003C37.3996 26.4003 32.2996 21.3003 32.2996 14.8003C32.2996 8.30026 37.3996 3.20026 43.8996 3.20026C50.3996 3.20026 55.4996 8.30026 55.4996 14.8003V26.4003H43.8996Z" fill="#36C5F0"/>
                                  <path d="M43.8996 32.3003C50.3996 32.3003 55.4996 37.4003 55.4996 43.9003C55.4996 50.4003 50.3996 55.5003 43.8996 55.5003H12.8996C6.39961 55.5003 1.29961 50.4003 1.29961 43.9003C1.29961 37.4003 6.39961 32.3003 12.8996 32.3003H43.8996Z" fill="#36C5F0"/>
                                  <path d="M95.5996 43.9003C95.5996 37.4003 100.7 32.3003 107.2 32.3003C113.7 32.3003 118.8 37.4003 118.8 43.9003C118.8 50.4003 113.7 55.5003 107.2 55.5003H95.5996V43.9003Z" fill="#2EB67D"/>
                                  <path d="M89.6996 43.9003C89.6996 50.4003 84.5996 55.5003 78.0996 55.5003C71.5996 55.5003 66.4996 50.4003 66.4996 43.9003V12.9003C66.4996 6.40026 71.5996 1.30026 78.0996 1.30026C84.5996 1.30026 89.6996 6.40026 89.6996 12.9003V43.9003Z" fill="#2EB67D"/>
                                  <path d="M78.0996 95.6003C84.5996 95.6003 89.6996 100.7 89.6996 107.2C89.6996 113.7 84.5996 118.8 78.0996 118.8C71.5996 118.8 66.4996 113.7 66.4996 107.2V95.6003H78.0996Z" fill="#ECB22E"/>
                                  <path d="M78.0996 89.7003C71.5996 89.7003 66.4996 84.6003 66.4996 78.1003C66.4996 71.6003 71.5996 66.5003 78.0996 66.5003H109.1C115.6 66.5003 120.7 71.6003 120.7 78.1003C120.7 84.6003 115.6 89.7003 109.1 89.7003H78.0996Z" fill="#ECB22E"/>
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-gray-900">Slack</h3>
                              </div>
                            </div>
                            <Switch
                              checked={includeSlack && !!slackIntegration}
                              onCheckedChange={(checked) => {
                                if (!slackIntegration) {
                                  toast.error("Slack not connected - please connect on integrations page")
                                } else {
                                  setIncludeSlack(checked)
                                }
                              }}
                              disabled={isLoadingGitHubSlack}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mb-1">Communication patterns</p>
                          <p className="text-xs text-gray-500">
                            {slackIntegration?.total_channels ? `${slackIntegration.total_channels} channels` : (slackIntegration ? 'Connected' : 'Not connected')}
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Empty grid cell if only one integration */}
                  {false && (
                    <div></div>
                  )}
                </div>
              </div>
            )}

            {/* AI Insights Toggle */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                AI Insights
              </label>
              <div className={`border rounded-lg p-4 transition-all ${enableAI && llmConfig?.has_token ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <div className="w-5 h-5 text-blue-600">🤖</div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Enhanced AI Analysis</h3>
                      <p className="text-xs text-gray-600">Natural language reasoning and insights</p>
                    </div>
                  </div>
                  <Switch
                    checked={enableAI && !!llmConfig?.has_token}
                    onCheckedChange={setEnableAI}
                    disabled={!llmConfig?.has_token}
                  />
                </div>
                
                {llmConfig?.has_token ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs font-medium text-green-700">
                        {llmConfig.provider === 'openai' ? 'OpenAI' : 'Anthropic'} Connected
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {enableAI ? 
                        '✨ AI will provide intelligent analysis and recommendations' : 
                        '⚡ Using traditional pattern analysis only'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs font-medium text-gray-600">No AI token configured</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Go to <span className="font-medium">Integrations → AI Insights</span> to add your OpenAI or Anthropic token
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Analysis Time Range
              </label>
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowTimeRangeDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={runAnalysisWithTimeRange} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isLoadingGitHubSlack || !dialogSelectedIntegration || (() => {
                  const selectedIntegration = integrations.find(i => i.id.toString() === dialogSelectedIntegration);
                  
                  // Only check permissions for Rootly integrations, not PagerDuty
                  if (selectedIntegration?.platform === 'rootly') {
                    const hasUserPermission = selectedIntegration?.permissions?.users?.access;
                    const hasIncidentPermission = selectedIntegration?.permissions?.incidents?.access;
                    return !hasUserPermission || !hasIncidentPermission;
                  }
                  
                  // For PagerDuty or other platforms, don't block based on permissions
                  return false;
                })()}
              >
                {isLoadingGitHubSlack ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={selectedMember?.avatar} />
                <AvatarFallback className="text-lg">
                  {selectedMember?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{selectedMember?.name}</h2>
                <p className="text-gray-600">{selectedMember?.role || selectedMember?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (() => {
            // Find the correct member data from the analysis (consistent with dashboard)
            const memberData = members?.find(m => m.user_name === selectedMember.name);
            
            // Get the correct burnout score (handle both data formats)
            const burnoutScore = memberData?.burnout_score || (selectedMember.burnoutScore / 10) || 0;
            
            // Calculate Maslach dimensions from consistent burnout score (no maslach_dimensions in data)
            const maslachDimensions = [
              {
                dimension: "Emotional Exhaustion",
                value: Math.min(Math.max(Number((burnoutScore * 1.2).toFixed(1)), 0), 10),
                weight: 40,
                description: "Feeling emotionally drained and depleted by work demands",
                color: "#DC2626"
              },
              {
                dimension: "Depersonalization", 
                value: Math.min(Math.max(Number((burnoutScore * 1.0).toFixed(1)), 0), 10),
                weight: 30,
                description: "Detached or cynical attitudes toward work and colleagues",
                color: "#7C2D12"
              },
              {
                dimension: "Personal Accomplishment",
                value: Math.min(Math.max(Number(Math.max(10 - (burnoutScore * 0.8), 3).toFixed(1)), 0), 10),
                weight: 30,
                description: "Diminished sense of personal achievement and effectiveness",
                color: "#B45309"
              }
            ];
            
            // Calculate overall burnout score (0-10 scale, higher = more burnout, consistent with dimensions)
            const overallBurnoutScore = Math.max(0, Math.min(10, burnoutScore));
            const healthStatus = overallBurnoutScore <= 3 ? 'Low Risk' : 
                               overallBurnoutScore <= 5 ? 'Moderate Risk' : 
                               overallBurnoutScore <= 7 ? 'High Risk' : 'Critical Risk';
            const healthColor = overallBurnoutScore <= 3 ? 'text-green-600 bg-green-50' : 
                              overallBurnoutScore <= 5 ? 'text-yellow-600 bg-yellow-50' : 
                              overallBurnoutScore <= 7 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
                              
            // Generate burnout summary highlighting concrete metrics and patterns
            const burnoutSummary = (() => {
              const concerns = [];
              const metrics = [];
              
              // Analyze concrete incident data
              const incidentCount = memberData?.incident_count || 0;
              const afterHoursPercent = memberData?.metrics?.after_hours_percentage || 0;
              const weekendPercent = memberData?.metrics?.weekend_percentage || 0;
              const avgResponseTime = memberData?.metrics?.avg_response_time_minutes || 0;
              
              // Incident load concerns
              if (incidentCount > 30) {
                concerns.push(`handling ${incidentCount} incidents (high volume)`);
              } else if (incidentCount > 15) {
                concerns.push(`managing ${incidentCount} incidents`);
              }
              
              // After-hours work patterns
              if (afterHoursPercent > 50) {
                concerns.push(`${afterHoursPercent.toFixed(0)}% of incidents handled after-hours`);
              } else if (afterHoursPercent > 20) {
                concerns.push(`${afterHoursPercent.toFixed(0)}% after-hours incident work`);
              }
              
              // Weekend work disruption
              if (weekendPercent > 20) {
                concerns.push(`${weekendPercent.toFixed(0)}% weekend incident activity`);
              }
              
              // Response time pressure
              if (avgResponseTime > 60) {
                concerns.push(`${Math.round(avgResponseTime)} min average response time`);
              }
              
              // GitHub activity patterns
              if (selectedMember.github_activity?.burnout_indicators) {
                const indicators = selectedMember.github_activity.burnout_indicators;
                if (indicators.excessive_commits) metrics.push("high commit frequency");
                if (indicators.late_night_activity) metrics.push("late-night coding");
                if (indicators.weekend_work) metrics.push("weekend development work");
              }
              
              // Slack communication patterns  
              if (selectedMember.slack_activity?.burnout_indicators) {
                const indicators = selectedMember.slack_activity.burnout_indicators;
                if (indicators.excessive_messaging) metrics.push("high message volume");
                if (indicators.after_hours_activity) metrics.push("after-hours communication");
              }
              
              // Build summary message
              if (concerns.length === 0 && metrics.length === 0) {
                return `Workload appears balanced with ${incidentCount} incidents handled. Continue monitoring incident patterns and work-life boundaries.`;
              }
              
              let summary = "Key concerns: ";
              if (concerns.length > 0) {
                summary += concerns.join(", ");
              }
              if (metrics.length > 0) {
                summary += `${concerns.length > 0 ? ". Additional patterns: " : ""}${metrics.join(", ")}`;
              }
              summary += ". Recommend workload redistribution and schedule review.";
              
              return summary;
            })();
            
            // Temporary: Keep memberHighRisk for old code that hasn't been replaced yet
            const memberHighRisk = []; // Will be removed when modal redesign is complete
            
            // Calculate member factors for radar chart
            const m = memberData;
            const memberFactors = [
              {
                factor: 'Incident Volume',
                value: m?.factors?.workload ?? ((() => {
                  const incidentsCount = m?.incident_count || m?.metrics?.total_incidents || 0;
                  const incidentsPerWeek = incidentsCount / 4.3;
                  // More incidents = higher burnout risk (0-10 scale)
                  return Math.min(incidentsPerWeek * 0.5, 10);
                })()),
                color: '#FF6B6B'
              },
              {
                factor: 'After Hours',
                value: m?.factors?.after_hours ?? Math.min(((m?.metrics?.after_hours_percentage || 0) / 10), 10),
                color: '#4ECDC4'
              },
              {
                factor: 'Response Pressure',
                value: m?.factors?.response_time ?? ((() => {
                  const responseMinutes = m?.metrics?.avg_response_time_minutes || 0;
                  // Industry standard: <30 min = excellent (2), <60 min = good (4), <120 min = acceptable (6), >240 min = critical (9+)
                  if (responseMinutes <= 30) return 2.0;      // Excellent
                  if (responseMinutes <= 60) return 4.0;      // Good
                  if (responseMinutes <= 120) return 6.0;     // Acceptable
                  if (responseMinutes <= 240) return 8.0;     // Poor
                  if (responseMinutes <= 480) return 9.0;     // Very Poor
                  return 10.0;  // Critical (>8 hours)
                })()),
                color: '#45B7D1'
              },
              {
                factor: 'Weekend Work',
                value: m?.factors?.weekend_work ?? Math.max(((m?.metrics?.weekend_percentage || 0) / 10), 0.1),
                color: '#96CEB4'
              },
              {
                factor: 'Schedule Disruption',
                value: m?.factors?.schedule_disruption ?? ((() => {
                  // Calculate schedule disruption from after-hours + weekend + response pressure
                  const afterHoursImpact = ((m?.metrics?.after_hours_percentage || 0) / 10) * 0.4;
                  const weekendImpact = ((m?.metrics?.weekend_percentage || 0) / 10) * 0.3;
                  const responseImpact = (m?.metrics?.avg_response_time_minutes || 0) > 60 ? 3 : 1;
                  return Math.max(Math.min(afterHoursImpact + weekendImpact + responseImpact, 10), 0.1);
                })()),
                color: '#FECA57'
              }
            ];
            
            return (
            <div className="space-y-6">
              {/* Burnout Health Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Health Status Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1 text-gray-900">Burnout Health Assessment</h3>
                      <p className="text-gray-600 text-sm">Based on Christina Maslach's Burnout Inventory</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-1 text-gray-900">{overallBurnoutScore.toFixed(1)}/10</div>
                      <Badge className={`${healthColor} text-sm px-3 py-1 border-0`}>
                        {healthStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.max(overallBurnoutScore * 10, 5)}%`,
                        backgroundColor: (() => {
                          // Standardize colors to match burnout risk levels
                          if (overallBurnoutScore <= 3) return '#10B981'; // green-500 - Low Risk
                          if (overallBurnoutScore <= 5) return '#F59E0B'; // yellow-500 - Moderate Risk
                          if (overallBurnoutScore <= 7) return '#F97316'; // orange-500 - High Risk
                          return '#EF4444'; // red-500 - Critical Risk
                        })()
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Higher scores indicate greater burnout risk</p>
                  
                  {/* Burnout Summary */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {burnoutSummary}
                    </p>
                  </div>
                </div>
                
                {/* Individual Burnout Analysis */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <span>Burnout Analysis</span>
                        {memberHighRisk.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-red-600">
                              {memberHighRisk.length} factor{memberHighRisk.length > 1 ? 's' : ''} elevated
                            </span>
                          </div>
                        )}
                      </CardTitle>
                      {/* Single view mode - only Factors */}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={memberFactors} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                          <PolarGrid gridType="polygon" />
                          <PolarAngleAxis 
                            dataKey="factor" 
                            tick={{ fontSize: 10, fill: '#374151' }}
                            className="text-xs"
                          />
                          <PolarRadiusAxis 
                            domain={[0, 10]} 
                            tick={{ fontSize: 8, fill: '#6B7280' }}
                            tickCount={6}
                            angle={270}
                          />
                          <Radar 
                            dataKey="value" 
                            stroke="#8B5CF6" 
                            fill="#8B5CF6" 
                            fillOpacity={0.1}
                            strokeWidth={2}
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                          />
                          <Tooltip 
                            content={({ payload, label }) => {
                              if (payload && payload.length > 0) {
                                const data = payload[0].payload
                                return (
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900">{label}</p>
                                    <p style={{ color: data.color }}>Score: {Math.round(data.value)}/10</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {data.value <= 3 ? 'Low Risk' : 
                                       data.value <= 5 ? 'Moderate Risk' : 
                                       data.value <= 7 ? 'High Risk' : 'Critical Risk'}
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>


              {/* Burnout Dimensions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">🧠 Maslach Burnout Dimensions</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {maslachDimensions.map((dimension, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="text-center mb-3">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {dimension.value.toFixed(1)}/10 
                          <span className="text-sm text-gray-500 font-normal ml-2">({dimension.weight}% weight)</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <h4 className="font-semibold text-gray-900">{dimension.dimension}</h4>
                          <div className="group relative">
                            <Info className="w-4 h-4 text-gray-400 cursor-help" />
                            <div className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap max-w-xs">
                              {dimension.description}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div 
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.max(dimension.value * 10, 5)}%`,
                            backgroundColor: (() => {
                              // Standardize colors to match burnout risk levels
                              if (dimension.value <= 3) return '#10B981'; // green-500 - Low Risk
                              if (dimension.value <= 5) return '#F59E0B'; // yellow-500 - Moderate Risk
                              if (dimension.value <= 7) return '#F97316'; // orange-500 - High Risk
                              return '#EF4444'; // red-500 - Critical Risk
                            })()
                          }}
                        />
                      </div>
                      
                      {/* Show contributing factors/metrics */}
                      <div className="text-xs text-gray-500 text-center">
                        <span className="font-medium">Contributing factors:</span>
                        <div className="mt-1">
                          {dimension.dimension === "Emotional Exhaustion" && (
                            <span>Workload intensity + After-hours incidents + Incident frequency</span>
                          )}
                          {dimension.dimension === "Depersonalization" && (
                            <span>Response time pressure + Weekend work disruption + High incident load</span>
                          )}
                          {dimension.dimension === "Personal Accomplishment" && (
                            <span>Incident resolution success + Response effectiveness + Team contribution</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <Badge className={`${
                          dimension.dimension === "Personal Accomplishment" ? (
                            // For Personal Accomplishment: Lower scores = Lower risk (less reduction = better)
                            dimension.value <= 3 ? 'text-green-600 bg-green-50' : 
                            dimension.value <= 5 ? 'text-yellow-600 bg-yellow-50' : 
                            dimension.value <= 7 ? 'text-orange-600 bg-orange-50' : 
                            'text-red-600 bg-red-50'
                          ) : (
                            // For other dimensions: Higher scores = Higher risk (normal)
                            dimension.value <= 3 ? 'text-green-600 bg-green-50' : 
                            dimension.value <= 5 ? 'text-yellow-600 bg-yellow-50' : 
                            dimension.value <= 7 ? 'text-orange-600 bg-orange-50' : 
                            'text-red-600 bg-red-50'
                          )
                        } text-xs px-2 py-1 border-0`}>
                          {dimension.dimension === "Personal Accomplishment" ? (
                            // For Personal Accomplishment: Lower scores = Lower risk (less reduction = better)
                            dimension.value <= 3 ? 'Low Risk' : 
                            dimension.value <= 5 ? 'Moderate' : 
                            dimension.value <= 7 ? 'Elevated' : 'High Risk'
                          ) : (
                            // For other dimensions: Higher scores = Higher risk (normal)
                            dimension.value <= 3 ? 'Low Risk' : 
                            dimension.value <= 5 ? 'Moderate' : 
                            dimension.value <= 7 ? 'Elevated' : 'High Risk'
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* GitHub Activity */}
                {selectedMember.github_activity && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 text-gray-900">💻 GitHub Activity</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">{selectedMember.github_activity?.commits_count || 0}</div>
                        <p className="text-xs text-gray-600 font-medium">Total Commits</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">{selectedMember.github_activity?.pull_requests_count || 0}</div>
                        <p className="text-xs text-gray-600 font-medium">Pull Requests</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">{selectedMember.github_activity?.reviews_count || 0}</div>
                        <p className="text-xs text-gray-600 font-medium">Code Reviews</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-gray-900">{selectedMember.github_activity ? (((selectedMember.github_activity.after_hours_commits || 0) / Math.max(selectedMember.github_activity.commits_count || 1, 1)) * 100).toFixed(1) : '0.0'}%</div>
                        <p className="text-xs text-gray-600 font-medium">After Hours</p>
                      </div>
                    </div>
                    {/* Burnout Risk Indicators */}
                    {selectedMember.github_activity?.burnout_indicators && Object.values(selectedMember.github_activity.burnout_indicators).some(indicator => indicator) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                        <h4 className="text-sm font-semibold text-red-800 mb-2">Burnout Risk Indicators</h4>
                        <div className="space-y-1 text-xs">
                          {selectedMember.github_activity?.burnout_indicators?.excessive_commits && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Excessive commit activity detected</span>
                            </div>
                          )}
                          {selectedMember.github_activity?.burnout_indicators?.late_night_activity && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Late night coding patterns</span>
                            </div>
                          )}
                          {selectedMember.github_activity?.burnout_indicators?.weekend_work && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Weekend work detected</span>
                            </div>
                          )}
                          {selectedMember.github_activity?.burnout_indicators?.large_prs && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Large PR patterns</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Slack Activity */}
                {selectedMember.slack_activity && selectedMember.slack_activity.messages_sent > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 text-purple-900">💬 Slack Communications</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">{selectedMember.slack_activity?.messages_sent || 0}</div>
                        <p className="text-xs text-purple-600 font-medium">Total Messages</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">{selectedMember.slack_activity?.channels_active || 0}</div>
                        <p className="text-xs text-purple-600 font-medium">Active Channels</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">{selectedMember.slack_activity ? (((selectedMember.slack_activity.after_hours_messages || 0) / Math.max(selectedMember.slack_activity.messages_sent || 1, 1)) * 100).toFixed(1) : '0.0'}%</div>
                        <p className="text-xs text-purple-600 font-medium">After Hours</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xl font-bold text-purple-900">{selectedMember.slack_activity ? (((selectedMember.slack_activity.weekend_messages || 0) / Math.max(selectedMember.slack_activity.messages_sent || 1, 1)) * 100).toFixed(1) : '0.0'}%</div>
                        <p className="text-xs text-purple-600 font-medium">Weekend Messages</p>
                      </div>
                    </div>
                    
                    {/* Communication Health */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <h4 className="text-sm font-semibold text-blue-800 mb-2">Communication Health</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-700">Average Sentiment</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg font-bold ${
                            (selectedMember.slack_activity?.sentiment_score || 0) > 0.1 ? 'text-green-600' :
                            (selectedMember.slack_activity?.sentiment_score || 0) < -0.1 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {(selectedMember.slack_activity?.sentiment_score || 0) > 0.1 ? 'Positive' :
                             (selectedMember.slack_activity?.sentiment_score || 0) < -0.1 ? 'Negative' : 'Neutral'}
                          </span>
                          <span className="text-xs text-blue-600">
                            ({selectedMember.slack_activity?.sentiment_score?.toFixed(2) || 'N/A'})
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Communication Risk Indicators */}
                    {selectedMember.slack_activity?.burnout_indicators && Object.values(selectedMember.slack_activity.burnout_indicators).some(indicator => indicator) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                        <h4 className="text-sm font-semibold text-red-800 mb-2">Communication Risk Indicators</h4>
                        <div className="space-y-1 text-xs">
                          {selectedMember.slack_activity?.burnout_indicators?.excessive_messaging && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Excessive messaging detected</span>
                            </div>
                          )}
                          {selectedMember.slack_activity?.burnout_indicators?.poor_sentiment && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Poor sentiment patterns</span>
                            </div>
                          )}
                          {selectedMember.slack_activity?.burnout_indicators?.late_responses && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">Late response patterns</span>
                            </div>
                          )}
                          {selectedMember.slack_activity?.burnout_indicators?.after_hours_activity && (
                            <div className="flex items-center space-x-2">
                              <div className="w-1 h-1 bg-red-600 rounded-full"></div>
                              <span className="text-red-700">After-hours communication</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            )})()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span>Delete Analysis</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Are you sure you want to delete this analysis? This action cannot be undone and will permanently remove all data associated with this analysis.
            </DialogDescription>
          </DialogHeader>
          
          {analysisToDelete && (
            <div className="my-4 p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">
                    {integrations.find(i => i.id === Number(analysisToDelete.integration_id))?.name || 
                     integrations.find(i => String(i.id) === String(analysisToDelete.integration_id))?.name || 
                     `Organization ${analysisToDelete.integration_id}`}
                  </span>
                  <span className="text-gray-500">
                    {new Date(analysisToDelete.created_at).toLocaleString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    })}
                  </span>
                </div>
                <span className="text-gray-400 text-xs">
                  {analysisToDelete.time_range || 30} days
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setAnalysisToDelete(null)
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAnalysis}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Delete Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}