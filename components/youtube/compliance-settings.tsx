'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Info } from 'lucide-react'

interface YouTubeComplianceSettingsProps {
  madeForKids: boolean | null
  setMadeForKids: (value: boolean) => void
  embeddable: boolean
  setEmbeddable: (value: boolean) => void
  license: 'youtube' | 'creativeCommon'
  setLicense: (value: 'youtube' | 'creativeCommon') => void
}

/**
 * YouTube Compliance Settings Component
 *
 * Critical compliance settings for YouTube videos:
 * - Made for Kids: COPPA compliance (legally required)
 * - Embeddable: Allow embedding on other websites
 * - License: Standard YouTube License or Creative Commons
 *
 * IMPORTANT: "Made for Kids" is a legal requirement under COPPA.
 * You MUST declare if your content is made for kids.
 *
 * API Reference: https://developers.google.com/youtube/v3/docs/videos#resource
 */
export function YouTubeComplianceSettings({
  madeForKids,
  setMadeForKids,
  embeddable,
  setEmbeddable,
  license,
  setLicense
}: YouTubeComplianceSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-red-600">▶</span>
          YouTube Settings
        </CardTitle>
        <CardDescription>
          Compliance and licensing settings for your video
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Made for Kids - COPPA Compliance */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="youtube-made-for-kids" className="text-base font-medium">
                  Is this video made for kids? *
                </Label>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    <p className="font-medium mb-2">COPPA Compliance Required</p>
                    <p className="mb-2">You must specify if your content is made for kids under 13.</p>
                    <p className="text-gray-300">Made for kids videos have limited features (no personalized ads, comments, notifications).</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Select &quot;Yes&quot; if your video is designed for children under 13
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMadeForKids(false)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                madeForKids === false
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">No, it&apos;s not made for kids</div>
              <div className="text-xs text-gray-600 mt-1">Standard YouTube features</div>
            </button>
            <button
              type="button"
              onClick={() => setMadeForKids(true)}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                madeForKids === true
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">Yes, it&apos;s made for kids</div>
              <div className="text-xs text-gray-600 mt-1">Limited features, COPPA compliant</div>
            </button>
          </div>

          {madeForKids === null && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-medium">Action required</p>
                <p className="text-xs mt-1">You must specify whether this video is made for kids. This is legally required under COPPA.</p>
              </div>
            </div>
          )}
        </div>

        {/* Embeddable */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="youtube-embeddable">Allow embedding</Label>
            <p className="text-sm text-gray-600">Let others embed your video on their websites</p>
          </div>
          <Switch
            id="youtube-embeddable"
            checked={embeddable}
            onCheckedChange={setEmbeddable}
          />
        </div>

        {/* License */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="youtube-license">License</Label>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                <p className="mb-2"><strong>Standard License:</strong> Standard YouTube license</p>
                <p className="text-gray-300"><strong>Creative Commons:</strong> Allows others to reuse your work</p>
              </div>
            </div>
          </div>
          <Select value={license} onValueChange={(value) => setLicense(value as 'youtube' | 'creativeCommon')}>
            <SelectTrigger id="youtube-license">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">
                <div>
                  <div className="font-medium">Standard YouTube License</div>
                  <div className="text-xs text-gray-600">Default license</div>
                </div>
              </SelectItem>
              <SelectItem value="creativeCommon">
                <div>
                  <div className="font-medium">Creative Commons - Attribution</div>
                  <div className="text-xs text-gray-600">Allows reuse with attribution</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            YouTube Compliance:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Made for Kids designation is required by law (COPPA)</li>
            <li>• Kids videos have no personalized ads or comments</li>
            <li>• Embeddable videos can appear on other websites</li>
            <li>• Creative Commons allows others to reuse your work</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
