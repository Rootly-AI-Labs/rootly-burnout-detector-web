"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CheckCircle, Users, Send, RefreshCw, Database, Users2, Loader2, Building, Clock } from "lucide-react"

interface SlackSurveyTabsProps {
  slackIntegration: any
  selectedOrganization: string
  integrations: any[]
  teamMembers: any[]
  loadingTeamMembers: boolean
  loadingSyncedUsers: boolean
  userInfo: any
  fetchTeamMembers: () => void
  syncUsersToCorrelation: () => void
  fetchSyncedUsers: () => void
  setShowManualSurveyModal: (show: boolean) => void
  loadSlackPermissions: () => void
  toast: any
}

const SlackIcon = () => (
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
)

export function SlackSurveyTabs({
  slackIntegration,
  selectedOrganization,
  integrations,
  teamMembers,
  loadingTeamMembers,
  loadingSyncedUsers,
  userInfo,
  fetchTeamMembers,
  syncUsersToCorrelation,
  fetchSyncedUsers,
  setShowManualSurveyModal,
  loadSlackPermissions,
  toast
}: SlackSurveyTabsProps) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Load schedule on mount
  useEffect(() => {
    if (userInfo?.organization_id) {
      loadSchedule()
    }
  }, [userInfo?.organization_id])

  const loadSchedule = async () => {
    setLoadingSchedule(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE}/api/surveys/survey-schedule`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()

        // Handle case where schedule exists
        if (data.enabled !== undefined) {
          setScheduleEnabled(data.enabled)

          // Backend returns "HH:MM:SS", extract only "HH:MM"
          if (data.send_time) {
            const timeOnly = data.send_time.substring(0, 5) // Extract "HH:MM" from "HH:MM:SS"
            setScheduleTime(timeOnly)
          }
        } else {
          // Handle case where no schedule is configured
          setScheduleEnabled(false)
          setScheduleTime('09:00')
        }
      } else {
        // API error - set defaults
        setScheduleEnabled(false)
        setScheduleTime('09:00')
      }
    } catch (error) {
      console.error('Failed to load schedule:', error)
      // Set defaults on error
      setScheduleEnabled(false)
      setScheduleTime('09:00')
    } finally {
      setLoadingSchedule(false)
    }
  }

  const saveSchedule = async () => {
    setSavingSchedule(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch(`${API_BASE}/api/surveys/survey-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          send_time: scheduleTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          send_weekdays_only: true,
          send_reminder: false,
          reminder_hours_after: 5
        })
      })

      if (response.ok) {
        toast.success('Schedule saved successfully')
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to save schedule')
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
      toast.error('Failed to save schedule')
    } finally {
      setSavingSchedule(false)
    }
  }

  const handleSlackConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL

    if (!backendUrl) {
      toast.error('Backend URL not configured. Please contact support.')
      return
    }

    const redirectUri = `${backendUrl}/integrations/slack/oauth/callback`
    const scopes = 'commands,chat:write,team:read'
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`

    window.open(slackAuthUrl, '_blank')
  }

  const handleWorkspaceCheck = async () => {
    try {
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        toast.error('Please log in to check workspace status')
        return
      }

      const statusResponse = await fetch(`${API_BASE}/integrations/slack/workspace/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!statusResponse.ok) {
        toast.error('Failed to check workspace status')
        return
      }

      const statusData = await statusResponse.json()

      if (statusData.diagnosis.has_workspace_mapping) {
        toast.success('✅ Workspace is properly registered! /burnout-survey command should work.')
      } else {
        if (!slackIntegration?.workspace_id) {
          toast.error('No workspace ID found. Please reconnect Slack.')
          return
        }

        const formData = new FormData()
        formData.append('workspace_id', slackIntegration.workspace_id)
        formData.append('workspace_name', slackIntegration.workspace_name || 'My Workspace')

        const registerResponse = await fetch(`${API_BASE}/integrations/slack/workspace/register`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        })

        if (registerResponse.ok) {
          toast.success('✅ Workspace registered! /burnout-survey command should now work.')
          await loadSlackPermissions()
        } else {
          const errorData = await registerResponse.json()
          toast.error(`Failed to register workspace: ${errorData.detail || 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.error('Error checking/fixing workspace:', error)
      toast.error('Error checking workspace status')
    }
  }

  return (
    <Tabs defaultValue="setup" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-purple-100/50">
        <TabsTrigger value="setup" className="data-[state=active]:bg-white">Setup</TabsTrigger>
        <TabsTrigger value="team" className="data-[state=active]:bg-white" disabled={!slackIntegration}>
          Team Members
        </TabsTrigger>
        <TabsTrigger value="actions" className="data-[state=active]:bg-white" disabled={!slackIntegration}>
          Actions
        </TabsTrigger>
      </TabsList>

      {/* Setup Tab */}
      <TabsContent value="setup" className="space-y-4 mt-4">
        <div className="bg-white rounded-lg border p-4 space-y-4">
          {!slackIntegration && process.env.NEXT_PUBLIC_SLACK_CLIENT_ID && (
            <div className="text-center py-4">
              <Button
                onClick={handleSlackConnect}
                className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3"
              >
                <SlackIcon />
                <span>Connect Slack Workspace</span>
              </Button>
              <p className="text-sm text-gray-600 mt-3">
                Connect your Slack workspace to enable the /burnout-survey command
              </p>
            </div>
          )}

          {!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID && (
            <div className="text-center py-2">
              <p className="text-sm text-gray-600 mb-4">
                The official Slack app is not currently configured. Contact support to enable Slack integration.
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">How it works:</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700"><strong>Authorize the app</strong> to deliver 3-question burnout surveys via Slack</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700"><strong>Team members receive surveys</strong> via automated DMs or by typing <code className="bg-gray-100 px-1 rounded text-xs">/burnout-survey</code></p>
                  <div className="bg-slate-800 rounded p-3 font-mono text-sm text-green-400 mt-2">
                    <div>/burnout-survey</div>
                    <div className="text-slate-400 mt-1">→ Opens interactive modal with 3 scored questions + optional text</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-green-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm text-gray-700"><strong>Survey data automatically integrates</strong> with your burnout analysis to validate automated detection patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Details for OAuth Connections */}
        {slackIntegration?.connection_type === 'oauth' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Building className="w-4 h-4 mr-2" />
              Registered Workspace
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Workspace:</span>
                <p className="text-blue-900">{slackIntegration.workspace_name || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Status:</span>
                <p className="text-blue-900 capitalize">{slackIntegration.status || 'Active'}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Registered:</span>
                <p className="text-blue-900">{new Date(slackIntegration.connected_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Workspace ID:</span>
                <p className="text-blue-900 font-mono text-xs">{slackIntegration.workspace_id}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-800">
                💡 The <code className="bg-blue-100 px-1 rounded">/burnout-survey</code> command will only show analyses for your organization
              </p>
            </div>
          </div>
        )}

        {/* Troubleshooting - Collapsible */}
        {slackIntegration && (
          <details className="border border-gray-200 rounded-lg">
            <summary className="cursor-pointer p-3 hover:bg-gray-50 rounded-lg text-sm text-gray-600 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Troubleshooting
            </summary>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-3">
                If the <code className="bg-gray-200 px-1 rounded">/burnout-survey</code> command shows "workspace not registered" error, click below to fix:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleWorkspaceCheck}
                className="w-full text-xs"
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check & Fix Workspace Registration
              </Button>
            </div>
          </details>
        )}

        <div className="flex items-center justify-between pt-2 text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Available to all workspace members</span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure OAuth authentication</span>
          </div>
        </div>
      </TabsContent>

      {/* Team Members Tab */}
      <TabsContent value="team" className="space-y-4 mt-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Survey Correlation</h4>
            <p className="text-sm text-gray-600 mb-3">
              When team members submit a <code className="bg-gray-100 px-1 rounded text-xs">/burnout-survey</code>,
              we match them to their profile using:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-xs">1</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Slack email</span> matches
                  <span className="font-medium text-gray-900"> Rootly/PagerDuty email</span>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-xs">2</span>
                </div>
                <div>
                  Survey response is linked to their burnout analysis profile
                </div>
              </div>
            </div>
          </div>

          {selectedOrganization && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Team Members from {integrations.find(i => i.id.toString() === selectedOrganization)?.name}
              </h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {/* Hide Sync Members button for beta integrations (can't be synced) */}
                {!selectedOrganization.startsWith('beta-') && (
                  <Button
                    onClick={syncUsersToCorrelation}
                    disabled={loadingTeamMembers || !selectedOrganization}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    {loadingTeamMembers ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Sync Members</span>
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={fetchSyncedUsers}
                  disabled={loadingSyncedUsers}
                  size="sm"
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loadingSyncedUsers ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <Users2 className="w-4 h-4" />
                      <span>View Synced Users</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-gray-600 mt-4">
                {selectedOrganization.startsWith('beta-') ? (
                  <p className="mb-2">Click "View Synced Users" to see team members who can submit burnout surveys.</p>
                ) : (
                  <p className="mb-2">Click "Sync Members" to load users from your organization who can submit burnout surveys.</p>
                )}
              </div>
            </div>
          )}

          {!selectedOrganization && (
            <div className="border-t pt-4 text-center py-6">
              <p className="text-sm text-gray-600">
                Select an organization from the integrations section above to view team members.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Actions Tab */}
      <TabsContent value="actions" className="space-y-4 mt-4">
        <div className="bg-white rounded-lg border p-4">
          <h4 className="font-medium text-gray-900 mb-3">Survey Delivery</h4>
          <p className="text-sm text-gray-600 mb-4">
            Send burnout surveys to your team members immediately via Slack DM.
          </p>

          {(userInfo?.role === 'super_admin' || userInfo?.role === 'org_admin') ? (
            <div className="flex justify-center">
              <Button
                onClick={() => setShowManualSurveyModal(true)}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
                <span>Send Survey Now</span>
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-2">
                Only organization admins can manually send surveys.
              </p>
              {userInfo && (
                <p className="text-xs text-gray-400">
                  Current role: {userInfo.role || 'unknown'}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h5 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Automated Schedule
                </h5>
                <p className="text-xs text-gray-500 mt-1">
                  Send surveys every weekday at a specific time
                </p>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
                disabled={!userInfo || (userInfo.role !== 'org_admin' && userInfo.role !== 'super_admin') || savingSchedule}
              />
            </div>

            {scheduleEnabled && (
              <div className="space-y-3 mt-4 p-3 bg-gray-50 rounded-md">
                <div>
                  <Label className="text-sm text-gray-700">
                    Delivery Time (Your Local Time)
                  </Label>
                  <div className="mt-2 flex items-center justify-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                    {/* Hour Scroller */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          const [hour, minute] = scheduleTime.split(':').map(Number)
                          const newHour = hour === 23 ? 0 : hour + 1
                          setScheduleTime(`${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
                        }}
                        disabled={savingSchedule}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <div className="text-2xl font-semibold text-gray-900 my-1 w-12 text-center">
                        {scheduleTime.split(':')[0]}
                      </div>
                      <button
                        onClick={() => {
                          const [hour, minute] = scheduleTime.split(':').map(Number)
                          const newHour = hour === 0 ? 23 : hour - 1
                          setScheduleTime(`${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
                        }}
                        disabled={savingSchedule}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-2xl font-bold text-gray-400">:</div>

                    {/* Minute Scroller */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          const [hour, minute] = scheduleTime.split(':').map(Number)
                          const newMinute = minute === 45 ? 0 : minute + 15
                          setScheduleTime(`${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`)
                        }}
                        disabled={savingSchedule}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <div className="text-2xl font-semibold text-gray-900 my-1 w-12 text-center">
                        {scheduleTime.split(':')[1]}
                      </div>
                      <button
                        onClick={() => {
                          const [hour, minute] = scheduleTime.split(':').map(Number)
                          const newMinute = minute === 0 ? 45 : minute - 15
                          setScheduleTime(`${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`)
                        }}
                        disabled={savingSchedule}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* AM/PM Toggle */}
                    <button
                      onClick={() => {
                        const [hour, minute] = scheduleTime.split(':').map(Number)
                        const newHour = hour >= 12 ? hour - 12 : hour + 12
                        setScheduleTime(`${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
                      }}
                      disabled={savingSchedule}
                      className="ml-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      {parseInt(scheduleTime.split(':')[0]) >= 12 ? 'PM' : 'AM'}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-md p-2">
                  <p className="font-medium text-blue-900 mb-1">Schedule Details:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• Sends Monday through Friday</li>
                    <li>• Skips weekends automatically</li>
                    <li>• Time: {scheduleTime || '09:00'} in your local timezone</li>
                  </ul>
                </div>

                <Button
                  onClick={saveSchedule}
                  disabled={savingSchedule}
                  className="w-full"
                  size="sm"
                >
                  {savingSchedule ? 'Saving...' : 'Save Schedule'}
                </Button>
              </div>
            )}

            {!userInfo || (userInfo.role !== 'org_admin' && userInfo.role !== 'super_admin') ? (
              <p className="text-xs text-gray-500 mt-2">
                Only organization admins can configure automated schedules.
              </p>
            ) : null}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
