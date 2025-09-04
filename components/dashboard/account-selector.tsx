'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Account {
  id: string
  platform: string
  username?: string
  account_name?: string
  account_label?: string
  is_primary?: boolean
}

interface AccountSelectorProps {
  platform: string
  platformId?: string
  accounts: Account[]
  selectedAccountIds: string[]
  onSelectionChange: (accountIds: string[]) => void
  multiSelect?: boolean
}

const platformGradients: Record<string, string> = {
  twitter: 'from-gray-600 to-slate-700',
  instagram: 'from-purple-400 to-pink-400',
  facebook: 'from-blue-500 to-sky-400',
  linkedin: 'from-indigo-500 to-blue-500',
  youtube: 'from-red-500 to-rose-400',
  tiktok: 'from-pink-400 to-purple-500',
  threads: 'from-slate-600 to-gray-700',
  bluesky: 'from-sky-400 to-cyan-400',
  pinterest: 'from-red-500 to-pink-400',
}

export function AccountSelector({
  platform,
  platformId,
  accounts,
  selectedAccountIds,
  onSelectionChange,
  multiSelect = true
}: AccountSelectorProps) {
  const [open, setOpen] = useState(false)

  // Auto-select primary account if nothing selected
  useEffect(() => {
    if (accounts.length > 0 && selectedAccountIds.length === 0) {
      const primaryAccount = accounts.find(acc => acc.is_primary)
      if (primaryAccount) {
        onSelectionChange([primaryAccount.id])
      } else {
        onSelectionChange([accounts[0].id])
      }
    }
  }, [accounts])

  const handleSelect = (accountId: string) => {
    if (multiSelect) {
      if (selectedAccountIds.includes(accountId)) {
        // Don't allow deselecting if it's the only one selected
        if (selectedAccountIds.length > 1) {
          onSelectionChange(selectedAccountIds.filter(id => id !== accountId))
        }
      } else {
        onSelectionChange([...selectedAccountIds, accountId])
      }
    } else {
      onSelectionChange([accountId])
      setOpen(false)
    }
  }

  const getAccountLabel = (account: Account) => {
    if (account.account_label) {
      return account.account_label
    }
    if (account.username) {
      return `@${account.username}`
    }
    if (account.account_name) {
      return account.account_name
    }
    return 'Account'
  }

  const selectedAccounts = accounts.filter(acc => selectedAccountIds.includes(acc.id))

  if (accounts.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No {platform} accounts connected
      </div>
    )
  }

  if (accounts.length === 1) {
    // Only one account, show it in a compact polished card design
    const gradient = platformGradients[platformId?.toLowerCase() || ''] || 'from-gray-400 to-gray-500'
    
    return (
      <div className="bg-white rounded-md border border-gray-100 px-2.5 py-1.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0",
            gradient
          )}>
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs text-gray-900 truncate">
              {getAccountLabel(accounts[0])}
            </p>
            {accounts[0].is_primary && (
              <p className="text-[10px] text-purple-600">Primary</p>
            )}
          </div>
          <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></div>
        </div>
      </div>
    )
  }

  const gradient = platformGradients[platformId?.toLowerCase() || ''] || 'from-gray-400 to-gray-500'
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full bg-white rounded-md border border-gray-100 px-2.5 py-1.5 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {selectedAccounts.length > 0 ? (
                <>
                  <div className="flex -space-x-1.5">
                    {selectedAccounts.slice(0, 3).map((account, idx) => (
                      <div
                        key={account.id}
                        className={cn(
                          "h-6 w-6 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 ring-white",
                          gradient
                        )}
                        style={{ zIndex: 3 - idx }}
                      >
                        <User className="h-3 w-3 text-white" />
                      </div>
                    ))}
                    {selectedAccounts.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center ring-2 ring-white">
                        <span className="text-[10px] font-medium text-gray-600">
                          +{selectedAccounts.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 text-left truncate">
                      {selectedAccounts.length === 1
                        ? getAccountLabel(selectedAccounts[0])
                        : `${selectedAccounts.length} accounts`}
                    </p>
                    <p className="text-[10px] text-gray-500 text-left">
                      Click to manage
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 text-left">
                      Select accounts
                    </p>
                    <p className="text-[10px] text-gray-500 text-left">
                      Choose accounts
                    </p>
                  </div>
                </>
              )}
            </div>
            <ChevronDown className={cn(
              "h-3.5 w-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0",
              open && "rotate-180"
            )} />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-full p-2">
        {accounts.map(account => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => handleSelect(account.id)}
            className="cursor-pointer p-2 rounded-md hover:bg-gray-50 focus:bg-gray-50"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-5 w-5 border-2 rounded-md flex items-center justify-center transition-all",
                  selectedAccountIds.includes(account.id)
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-300 bg-white"
                )}>
                  {selectedAccountIds.includes(account.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center",
                    gradient
                  )}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {getAccountLabel(account)}
                    </span>
                    {account.is_primary && (
                      <span className="text-xs text-purple-600 font-medium">Primary</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {multiSelect && accounts.length > 1 && (
          <>
            <div className="border-t my-2" />
            <DropdownMenuItem
              onClick={() => {
                if (selectedAccountIds.length === accounts.length) {
                  // Deselect all except primary
                  const primaryAccount = accounts.find(acc => acc.is_primary)
                  onSelectionChange([primaryAccount?.id || accounts[0].id])
                } else {
                  // Select all
                  onSelectionChange(accounts.map(acc => acc.id))
                }
              }}
              className="cursor-pointer p-2 rounded-md hover:bg-gray-50 focus:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-gray-300 rounded-md flex items-center justify-center">
                  {selectedAccountIds.length === accounts.length && (
                    <Check className="h-3 w-3 text-gray-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {selectedAccountIds.length === accounts.length
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}