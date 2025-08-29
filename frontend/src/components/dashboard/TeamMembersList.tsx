"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TeamMembersListProps {
  currentAnalysis: any
  setSelectedMember: (member: any) => void
  getRiskColor: (riskLevel: string) => string
  getProgressColor: (riskLevel: string) => string
}

export function TeamMembersList({
  currentAnalysis,
  setSelectedMember,
  getRiskColor,
  getProgressColor
}: TeamMembersListProps) {
  // Official CBI 4-color system for progress bars (0-100 scale, higher = more burnout)
  const getCBIProgressColor = (score: number) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    
    if (clampedScore < 25) return '#10b981';      // Green - Low/minimal burnout (0-24)
    if (clampedScore < 50) return '#eab308';      // Yellow - Mild burnout symptoms (25-49)  
    if (clampedScore < 75) return '#f97316';      // Orange - Moderate/significant burnout (50-74)
    return '#dc2626';                             // Red - High/severe burnout (75-100)
  };

  // Official CBI 4-color system for text/badges
  const getCBITextColor = (score: number) => {
    if (score < 25) return '#10b981';       // Green - Low/minimal burnout
    if (score < 50) return '#eab308';       // Yellow - Mild burnout symptoms
    if (score < 75) return '#f97316';       // Orange - Moderate/significant burnout  
    return '#dc2626';                       // Red - High/severe burnout
  };
  return (
    <>
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
                ?.filter((member) => {
                  // Show all members with valid CBI or burnout scores (match chart filtering)
                  const hasCbiScore = member.cbi_score !== undefined && member.cbi_score !== null && member.cbi_score > 0
                  const hasLegacyScore = member.burnout_score !== undefined && member.burnout_score !== null && member.burnout_score > 0
                  return (hasCbiScore || hasLegacyScore)
                })
                ?.sort((a, b) => {
                  // Use CBI score for sorting if available, fallback to legacy
                  const aScore = a.cbi_score !== undefined ? a.cbi_score : a.burnout_score * 10;
                  const bScore = b.cbi_score !== undefined ? b.cbi_score : b.burnout_score * 10;
                  return bScore - aScore; // Sort by score descending (highest risk first)
                })
                ?.map((member) => (
              <Card
                key={member.user_id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedMember({
                  id: member.user_id || '',
                  name: member.user_name || 'Unknown',
                  email: member.user_email || '',
                  burnoutScore: ((10 - (member.burnout_score || 0)) * 10), // Convert 0-10 burnout to 0-100 health scale
                  riskLevel: (member.risk_level || 'low') as 'high' | 'medium' | 'low',
                  trend: 'stable' as const,
                  incidentsHandled: member.incident_count || 0,
                  avgResponseTime: `${Math.round(member.metrics?.avg_response_time_minutes || 0)}m`,
                  factors: {
                    workload: Math.round(((member.factors?.workload || (member as any).key_metrics?.incidents_per_week || 0)) * 10) / 10,
                    afterHours: Math.round(((member.factors?.after_hours || (member as any).key_metrics?.after_hours_percentage || 0)) * 10) / 10,
                    weekendWork: Math.round(((member.factors?.weekend_work || 0)) * 10) / 10,
                    incidentLoad: Math.round(((member.factors?.incident_load || (member as any).key_metrics?.incidents_per_week || 0)) * 10) / 10,
                    responseTime: Math.round(((member.factors?.response_time || (member as any).key_metrics?.avg_resolution_hours || 0)) * 10) / 10,
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
                      {(() => {
                        // Calculate risk level based on CBI score when available
                        const getCBIRiskLevel = (member: any) => {
                          if (member.cbi_score !== undefined && member.cbi_score !== null) {
                            // Use CBI scoring (0-100, higher = more burnout)
                            if (member.cbi_score < 25) return 'healthy';      // 0-24: Low/minimal burnout
                            if (member.cbi_score < 50) return 'fair';         // 25-49: Mild burnout symptoms
                            if (member.cbi_score < 75) return 'poor';         // 50-74: Moderate burnout risk  
                            return 'critical';                                // 75-100: High/severe burnout
                          }
                          // Fallback to legacy risk level
                          return member.risk_level || 'low';
                        };
                        
                        const riskLevel = getCBIRiskLevel(member);
                        const displayLabel = riskLevel === 'healthy' ? 'HEALTHY' :
                                           riskLevel === 'fair' ? 'FAIR' :
                                           riskLevel === 'poor' ? 'POOR' :
                                           riskLevel === 'critical' ? 'CRITICAL' :
                                           riskLevel.toUpperCase();
                        
                        return <Badge className={getRiskColor(riskLevel)}>{displayLabel}</Badge>;
                      })()}
                    </div>
                  </div>
                  
                  {/* Integration icons - show based on actual data presence */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {/* No platform badges needed */}
                    
                    {/* GitHub - show if user has actual GitHub data */}
                    {member.github_activity && (member.github_activity.commits_count > 0 || member.github_activity.commits_per_week > 0) && (
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full border border-gray-200" title="GitHub">
                        <svg className="w-3.5 h-3.5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* Slack - show if user has actual Slack data */}
                    {member.slack_activity && (member.slack_activity.messages_sent > 0 || member.slack_activity.channels_active > 0) && (
                      <div className="flex items-center justify-center w-6 h-6 bg-white rounded-full border border-gray-200" title="Slack">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                          {/* Official Slack logo pattern */}
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A"/>
                          <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                          <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0"/>
                          <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                          <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D"/>
                          <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                          <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"/>
                          <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {member?.cbi_score !== undefined ? (
                      <div className="flex justify-between text-sm">
                        <span>Burnout Score</span>
                        <span className="font-bold text-black">
                          {member.cbi_score.toFixed(1)}/100
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span>Burnout Score (Legacy)</span>
                        <span className="font-medium">{((member?.burnout_score || 0) * 10).toFixed(1)}%</span>
                      </div>
                    )}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${member?.cbi_score !== undefined ? member.cbi_score : member.burnout_score * 10}%`,
                          backgroundColor: member?.cbi_score !== undefined 
                            ? getCBIProgressColor(member.cbi_score)
                            : undefined
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{member.incident_count} incidents</span>
                      <span>
                        {member.github_activity?.commits_count ? (
                          <>
                            {member.github_activity.commits_count} commits
                            {member.github_activity.commits_per_week && ` (${member.github_activity.commits_per_week.toFixed(1)}/week)`}
                          </>
                        ) : (
                          'No GitHub data'
                        )}
                      </span>
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
  )
}