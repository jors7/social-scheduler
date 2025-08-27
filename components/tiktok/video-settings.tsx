'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Info } from 'lucide-react'

interface TikTokVideoSettingsProps {
  privacyLevel: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY'
  setPrivacyLevel: (level: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY') => void
  saveAsDraft: boolean
  setSaveAsDraft: (draft: boolean) => void
}

export function TikTokVideoSettings({
  privacyLevel,
  setPrivacyLevel,
  saveAsDraft,
  setSaveAsDraft
}: TikTokVideoSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-black">♪</span>
          TikTok Video Settings
        </CardTitle>
        <CardDescription className="flex items-start gap-1">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>TikTok requires video content (MP4, MOV, or AVI format)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tiktok-privacy">Privacy Level</Label>
          <Select 
            value={saveAsDraft ? 'SELF_ONLY' : privacyLevel} 
            onValueChange={(value: any) => {
              if (value === 'SELF_ONLY') {
                setSaveAsDraft(true)
              } else {
                setSaveAsDraft(false)
                setPrivacyLevel(value)
              }
            }}
            disabled={saveAsDraft}
          >
            <SelectTrigger id="tiktok-privacy">
              <SelectValue placeholder="Select privacy level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC_TO_EVERYONE">
                <div>
                  <div className="font-medium">Public</div>
                  <div className="text-xs text-gray-600">Everyone can see this video</div>
                </div>
              </SelectItem>
              <SelectItem value="MUTUAL_FOLLOW_FRIENDS">
                <div>
                  <div className="font-medium">Friends</div>
                  <div className="text-xs text-gray-600">Only mutual friends can see</div>
                </div>
              </SelectItem>
              <SelectItem value="SELF_ONLY">
                <div>
                  <div className="font-medium">Private (Draft)</div>
                  <div className="text-xs text-gray-600">Only you can see (saved as draft)</div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="save-draft" className="text-base font-medium cursor-pointer">
              Save as Draft
            </Label>
            <p className="text-sm text-gray-600">
              Upload video to TikTok as a draft for later editing and publishing
            </p>
          </div>
          <Switch
            id="save-draft"
            checked={saveAsDraft}
            onCheckedChange={(checked) => {
              setSaveAsDraft(checked)
              if (checked) {
                setPrivacyLevel('SELF_ONLY')
              } else {
                setPrivacyLevel('PUBLIC_TO_EVERYONE')
              }
            }}
          />
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">TikTok Video Requirements:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Duration: 3 seconds to 10 minutes</li>
            <li>• Aspect ratio: 9:16 (vertical) recommended</li>
            <li>• File size: Up to 287.6 MB</li>
            <li>• Resolution: 720p or higher recommended</li>
            <li>• Formats: MP4, MOV, AVI, WMV, FLV, MKV</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}