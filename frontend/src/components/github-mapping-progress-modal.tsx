"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Users,
  XCircle,
  GitBranch,
  Shield,
  Search,
  X
} from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ProgressLog {
  id: number
  operation_type: string
  step_name: string
  status: "started" | "in_progress" | "completed" | "failed" | "skipped"
  message: string
  details?: string
  progress_percentage?: number
  item_current?: number
  item_total?: number
  created_at: string
}

interface GitHubMappingProgressModalProps {
  isOpen: boolean
  onClose: () => void
  teamEmails: string[]
  onMappingComplete: (results: any) => void
}

interface MappingOperationStatus {
  status: "not_started" | "started" | "in_progress" | "completed" | "failed"
  progress_percentage?: number
  message: string
  total_logs: number
  latest_update?: string
}

export function GitHubMappingProgressModal({ 
  isOpen, 
  onClose, 
  teamEmails, 
  onMappingComplete 
}: GitHubMappingProgressModalProps) {
  const [logs, setLogs] = useState<ProgressLog[]>([])
  const [operationStatus, setOperationStatus] = useState<MappingOperationStatus | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear logs when modal opens
  useEffect(() => {
    if (isOpen) {
      setLogs([])
      setOperationStatus(null)
      setError(null)
      startAutoMapping()
    }
  }, [isOpen])

  // Poll for progress updates
  const pollProgress = useCallback(async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) return

      // Get logs
      const logsResponse = await fetch(`${API_BASE}/progress/logs/github_mapping?limit=100`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData.logs.reverse()) // Reverse to show oldest first
      }

      // Get operation status
      const statusResponse = await fetch(`${API_BASE}/progress/logs/github_mapping/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setOperationStatus(statusData)
      }

    } catch (error) {
      console.error('Error polling progress:', error)
    }
  }, [])

  // Start polling when operation starts
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    if (isOpen && operationStatus?.status === "in_progress") {
      intervalId = setInterval(pollProgress, 1000) // Poll every second
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isOpen, operationStatus?.status, pollProgress])

  const startAutoMapping = async () => {
    setIsStarting(true)
    setError(null)

    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        setError('Authentication required')
        return
      }

      // Clear existing logs first
      await fetch(`${API_BASE}/progress/logs/github_mapping`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      // Start auto-mapping
      const response = await fetch(`${API_BASE}/integrations/github/auto-map`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          team_emails: teamEmails,
          clear_existing_mappings: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to start auto-mapping')
      }

      const result = await response.json()
      
      setOperationStatus({
        status: "started",
        message: result.message,
        total_logs: 0
      })

      // Start polling for progress
      setTimeout(pollProgress, 500)

    } catch (error) {
      console.error('Error starting auto-mapping:', error)
      setError(error instanceof Error ? error.message : 'Failed to start auto-mapping')
    } finally {
      setIsStarting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "started":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStepIcon = (stepName: string) => {
    if (stepName.includes('org')) return <GitBranch className="h-4 w-4" />
    if (stepName.includes('verification')) return <Shield className="h-4 w-4" />
    if (stepName.includes('strategy') || stepName.includes('processing')) return <Search className="h-4 w-4" />
    return <Users className="h-4 w-4" />
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const isOperationComplete = operationStatus?.status === "completed" || operationStatus?.status === "failed"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            GitHub Auto-Mapping Progress
          </DialogTitle>
          <DialogDescription>
            Mapping {teamEmails.length} team members to GitHub accounts within specified organizations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Error:</span>
                  {error}
                </div>
              </CardContent>
            </Card>
          )}

          {operationStatus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(operationStatus.status)}
                  Operation Status: {operationStatus.status.replace('_', ' ').toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-2">{operationStatus.message}</p>
                {operationStatus.progress_percentage !== undefined && (
                  <div className="space-y-1">
                    <Progress value={operationStatus.progress_percentage} className="h-2" />
                    <p className="text-xs text-gray-500 text-right">
                      {operationStatus.progress_percentage.toFixed(1)}% complete
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                  <span>Total Logs: {operationStatus.total_logs}</span>
                  {operationStatus.latest_update && (
                    <span>Last Update: {formatTimestamp(operationStatus.latest_update)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Detailed Progress Log</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 h-full">
              <div className="h-64 overflow-y-auto border rounded-md p-2 bg-gray-50">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    {isStarting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting auto-mapping...
                      </>
                    ) : (
                      "No progress logs yet"
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className={`border rounded-lg p-3 ${
                          log.status === 'failed' ? 'border-red-200 bg-red-50' :
                          log.status === 'completed' ? 'border-green-200 bg-green-50' :
                          log.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getStepIcon(log.step_name)}
                            {getStatusIcon(log.status)}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                  {log.step_name.replace(/_/g, ' ')}
                                </span>
                                {log.progress_percentage !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.progress_percentage.toFixed(0)}%
                                  </Badge>
                                )}
                                {log.item_current && log.item_total && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.item_current}/{log.item_total}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-900 leading-tight">
                                {log.message}
                              </p>
                              {log.details && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">
                                  {log.details}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatTimestamp(log.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button 
            onClick={onClose} 
            variant={isOperationComplete ? "default" : "outline"}
            disabled={!isOperationComplete && !error}
          >
            {isOperationComplete || error ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}