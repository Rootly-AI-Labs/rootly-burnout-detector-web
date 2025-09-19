"use client"

import { useState, useEffect } from "react"
import { RefreshCw, BarChart3 } from "lucide-react"
import { ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area } from "recharts"

interface GitHubCommitsTimelineProps {
  analysisId: number
  totalCommits: number
  weekendPercentage: number
  cache: Map<string, any>
  setCache: React.Dispatch<React.SetStateAction<Map<string, any>>>
}

export function GitHubCommitsTimeline({ analysisId, totalCommits, weekendPercentage, cache, setCache }: GitHubCommitsTimelineProps) {
  const [loading, setLoading] = useState(true)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTimelineData = async () => {
      if (!analysisId) {
        console.log('❌ GITHUB TIMELINE: No analysis ID provided')
        setLoading(false)
        return
      }

      const cacheKey = `github-timeline-${analysisId}`

      // Check cache first
      const cachedData = cache.get(cacheKey)
      if (cachedData) {
        console.log('🎯 GITHUB TIMELINE CACHE HIT: Using cached data for analysis', analysisId)
        setTimelineData(cachedData)
        setLoading(false)
        return
      }

      console.log('📡 GITHUB TIMELINE CACHE MISS: Loading fresh data for analysis', analysisId)
      setLoading(true)
      setError(null)

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const url = `${API_BASE}/analyses/${analysisId}/github-commits-timeline`

        console.log('🌐 GITHUB TIMELINE: Fetching from', url)
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('📊 GITHUB TIMELINE: Response status', response.status)

        if (!response.ok) {
          console.error('❌ GITHUB TIMELINE: API error', response.status)
          throw new Error(`Failed to fetch GitHub timeline data: ${response.status}`)
        }

        console.log('🔍 GITHUB TIMELINE: Parsing JSON response...')
        const result = await response.json()
        console.log('📋 GITHUB TIMELINE: Response data', result)

        if (result.status === 'success' && result.data?.daily_commits) {
          console.log('✅ GITHUB TIMELINE: Data loaded successfully', result.data.daily_commits.length, 'days')

          // Cache the data
          console.log('💾 GITHUB TIMELINE: Caching data for future use')
          setCache(prev => new Map(prev.set(cacheKey, result.data.daily_commits)))

          setTimelineData(result.data.daily_commits)
        } else if (result.status === 'error') {
          console.error('❌ GITHUB TIMELINE: Server error', result.message)
          setError(result.message || 'Failed to fetch timeline data')
        }
      } catch (err) {
        console.error('❌ GITHUB TIMELINE: Unexpected error', err)
        setError('Unable to load timeline data')
      } finally {
        console.log('🏁 GITHUB TIMELINE: Loading finished, setting loading to false')
        setLoading(false)
      }
    }

    fetchTimelineData()
  }, [analysisId, cache, setCache])

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Commit Activity Timeline</h4>
        <div className="h-32 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error || !timelineData || timelineData.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Commit Activity Timeline</h4>
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {error || 'No timeline data available'}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>
            Total: <strong>{totalCommits.toLocaleString()}</strong> commits
          </span>
          <span>
            Weekend: <strong>{weekendPercentage ? `${weekendPercentage.toFixed(1)}%` : 'N/A'}</strong>
          </span>
        </div>
      </div>
    )
  }

  // Transform data for the chart
  const chartData = timelineData.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    commits: day.commits,
    contributors: day.unique_contributors || 0
  }))

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">Commit Activity Timeline</h4>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="githubGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval={Math.floor(chartData.length / 7)}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              domain={[0, 'dataMax']}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (payload && payload.length > 0) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-xs text-green-600">
                        {data.commits} commits
                      </p>
                      {data.contributors > 0 && (
                        <p className="text-xs text-gray-500">
                          {data.contributors} contributors
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="commits"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#githubGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>
          Total: <strong>{totalCommits.toLocaleString()}</strong> commits
        </span>
        <span>
          Weekend: <strong>{weekendPercentage ? `${weekendPercentage.toFixed(1)}%` : 'N/A'}</strong>
        </span>
      </div>
    </div>
  )
}