'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Code, Database, Globe } from 'lucide-react'

export default function DevPage() {
  const [apiUrl, setApiUrl] = useState(process.env.NEXT_PUBLIC_API_URL)
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Code className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Development Environment</h1>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            DEV
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Environment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Environment Config</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">API URL</p>
                  <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                    {apiUrl}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Branch</p>
                  <Badge variant="outline">dev</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Build Mode</p>
                  <Badge variant="outline">development</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.open('/integrations', '_blank')}
                >
                  Test Integrations
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.open('/dashboard', '_blank')}
                >
                  Test Dashboard
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => window.open(`${apiUrl}/docs`, '_blank')}
                >
                  API Documentation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dev Tools */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            <strong>Dev Environment Active:</strong> This page is only available in development mode. 
            Changes made here won't affect production data.
          </AlertDescription>
        </Alert>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Development URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Production:</strong> https://www.oncallburnout.com</p>
                <p><strong>Development:</strong> https://www.oncallburnout.com/dev (this page)</p>
                <p><strong>API Dev:</strong> {apiUrl}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}