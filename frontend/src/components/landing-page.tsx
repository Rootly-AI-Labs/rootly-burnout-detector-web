"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Link2, Brain, Target, Github, Chrome, Shield, Users, TrendingUp } from "lucide-react"
import Link from "next/link"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function LandingPage() {
  const handleGoogleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/google`)
      const data = await response.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (error) {
      console.error('Google login error:', error)
    }
  }

  const handleGitHubLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/github`)
      const data = await response.json()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (error) {
      console.error('GitHub login error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">Rootly Burnout Detector</span>
          </div>

          <nav className="flex items-center space-x-6">
            <Link href="#about" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              About
            </Link>
            <Link href="#login" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Prevent Engineering Burnout Before It
              <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                {" "}
                Impacts Your Team
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Analyze incident response patterns to identify burnout risk and take action early
            </p>

            {/* OAuth Login Buttons */}
            <div id="login" className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-lg"
                onClick={handleGitHubLogin}
              >
                <Github className="w-5 h-5 mr-3" />
                Continue with GitHub
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-300 px-8 py-4 text-lg hover:bg-slate-50 bg-transparent"
                onClick={handleGoogleLogin}
              >
                <Chrome className="w-5 h-5 mr-3" />
                Continue with Google
              </Button>
            </div>

            <p className="text-sm text-slate-500">
              Secure OAuth authentication
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 border-purple-200 bg-purple-25 hover:border-purple-300 transition-all duration-300 rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100">
                  <Link2 className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Connect Rootly</h3>
                <p className="text-slate-600 leading-relaxed">
                  Securely link your Rootly account to analyze incident data
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-25 hover:border-purple-300 transition-all duration-300 rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100">
                  <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">AI Analysis</h3>
                <p className="text-slate-600 leading-relaxed">
                  Our algorithm evaluates workload, after-hours activity, and resolution patterns
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-25 hover:border-purple-300 transition-all duration-300 rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-purple-100">
                  <Target className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Actionable Insights</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get personalized recommendations to prevent burnout and improve team health
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section id="about" className="py-20 bg-gradient-to-r from-purple-50 to-purple-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
              Built for engineering leaders who care about their team's well-being
            </h2>

            <p className="text-xl text-slate-600 mb-12 leading-relaxed">
              Make data-driven decisions about workload distribution and on-call rotations
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Privacy First</h3>
                <p className="text-slate-600 text-sm">Your data stays secure with enterprise-grade encryption</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Team Focused</h3>
                <p className="text-slate-600 text-sm">Designed specifically for engineering team dynamics</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Actionable Data</h3>
                <p className="text-slate-600 text-sm">Clear insights you can act on immediately</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4"
                onClick={handleGitHubLogin}
              >
                <Github className="w-5 h-5 mr-3" />
                Get Started with GitHub
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-300 px-8 py-4 hover:bg-slate-50 bg-transparent"
                onClick={handleGoogleLogin}
              >
                <Chrome className="w-5 h-5 mr-3" />
                Get Started with Google
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">Rootly Burnout Detector</span>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <Link href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center">
            <p className="text-slate-400">
              © {new Date().getFullYear()} Rootly Burnout Detector. Free for all engineering teams.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}