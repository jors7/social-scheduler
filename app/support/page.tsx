'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  MessageCircle,
  Mail,
  Phone,
  HelpCircle,
  Book,
  Video,
  Search,
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle
} from 'lucide-react'

const faqItems = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How do I connect my social media accounts?',
        answer: 'Go to Settings > Social Accounts and click "Connect Account" for each platform you want to add.'
      },
      {
        question: 'How do I schedule my first post?',
        answer: 'Navigate to Create > New Post, write your content, select platforms, choose a date and time, then click "Schedule Post".'
      },
      {
        question: 'Can I post to multiple platforms at once?',
        answer: 'Yes! Select multiple platforms when creating a post. You can also customize content for each platform.'
      }
    ]
  },
  {
    category: 'Billing & Plans',
    questions: [
      {
        question: 'How do I upgrade my plan?',
        answer: 'Go to Settings > Plans, select your desired plan, and follow the checkout process.'
      },
      {
        question: 'Can I cancel my subscription anytime?',
        answer: 'Yes, you can cancel your subscription at any time from Settings > Billing. Your access continues until the end of your billing period.'
      },
      {
        question: 'Do you offer refunds?',
        answer: 'We offer a 30-day money-back guarantee for all paid plans. Contact support for refund requests.'
      }
    ]
  },
  {
    category: 'Features',
    questions: [
      {
        question: 'How accurate are the AI suggestions?',
        answer: 'Our AI suggestions are powered by advanced language models and are continuously improving based on user feedback.'
      },
      {
        question: 'Can I collaborate with team members?',
        answer: 'Yes, Pro and higher plans include team collaboration features. Invite members from Settings > Team.'
      },
      {
        question: 'What analytics are available?',
        answer: 'We provide engagement metrics, reach data, and performance insights for all your published posts.'
      }
    ]
  }
]

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'medium'
  })

  const filteredFAQ = faqItems.filter(category => {
    if (selectedCategory !== 'all' && category.category !== selectedCategory) return false
    if (searchQuery) {
      return category.questions.some(q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return true
  })

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle support ticket submission
    console.log('Support ticket submitted:', supportForm)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-gray-600 mt-2">Get help with SocialPulse and find answers to common questions</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer">
          <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
          <h3 className="font-medium">Live Chat</h3>
          <p className="text-sm text-gray-600 mt-1">Get instant help</p>
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer">
          <Mail className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <h3 className="font-medium">Email Support</h3>
          <p className="text-sm text-gray-600 mt-1">Send us a message</p>
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer">
          <Book className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <h3 className="font-medium">Documentation</h3>
          <p className="text-sm text-gray-600 mt-1">Browse our guides</p>
        </Card>
        <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer">
          <Video className="w-8 h-8 text-orange-500 mx-auto mb-3" />
          <h3 className="font-medium">Video Tutorials</h3>
          <p className="text-sm text-gray-600 mt-1">Watch and learn</p>
        </Card>
      </div>

      {/* Search and FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search FAQ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {faqItems.map((category) => (
                  <button
                    key={category.category}
                    onClick={() => setSelectedCategory(category.category)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === category.category
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.category}
                  </button>
                ))}
              </div>

              {/* FAQ Items */}
              <div className="space-y-4">
                {filteredFAQ.map((category) => (
                  <div key={category.category}>
                    <h3 className="font-medium text-lg mb-3">{category.category}</h3>
                    <div className="space-y-2">
                      {category.questions
                        .filter(q => 
                          !searchQuery || 
                          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.answer.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((item, index) => (
                        <details key={index} className="border rounded-lg">
                          <summary className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                            <span className="font-medium">{item.question}</span>
                            <ChevronRight className="w-4 h-4 transform transition-transform" />
                          </summary>
                          <div className="p-4 pt-0 text-gray-600">
                            {item.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Still need help? Send us a message</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    value={supportForm.priority}
                    onChange={(e) => setSupportForm({ ...supportForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Submit Ticket
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Support Hours */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Support Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Live Chat</p>
                    <p className="text-sm text-gray-600">Mon-Fri, 9AM-6PM EST</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium">Email Support</p>
                    <p className="text-sm text-gray-600">24/7 (1-2 business day response)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="font-medium">Emergency Support</p>
                    <p className="text-sm text-gray-600">Enterprise customers only</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Explore more ways to get help and learn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Book className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-medium">User Guide</p>
                <p className="text-sm text-gray-600">Complete documentation</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Video className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium">Video Library</p>
                <p className="text-sm text-gray-600">Step-by-step tutorials</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <MessageCircle className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium">Community Forum</p>
                <p className="text-sm text-gray-600">Connect with other users</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}