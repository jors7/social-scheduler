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
  accounts: Account[]
  selectedAccountIds: string[]
  onSelectionChange: (accountIds: string[]) => void
  multiSelect?: boolean
}

export function AccountSelector({
  platform,
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
    // Only one account, show it as a badge
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          {getAccountLabel(accounts[0])}
          {accounts[0].is_primary && (
            <span className="text-xs text-purple-600">(Primary)</span>
          )}
        </Badge>
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedAccounts.length === 0
                ? 'Select accounts'
                : selectedAccounts.length === 1
                ? getAccountLabel(selectedAccounts[0])
                : `${selectedAccounts.length} accounts selected`}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {accounts.map(account => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => handleSelect(account.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-4 w-4 border rounded flex items-center justify-center",
                  selectedAccountIds.includes(account.id)
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-300"
                )}>
                  {selectedAccountIds.includes(account.id) && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {getAccountLabel(account)}
                  </span>
                  {account.is_primary && (
                    <span className="text-xs text-purple-600">Primary</span>
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        {multiSelect && accounts.length > 1 && (
          <>
            <div className="border-t my-1" />
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
              className="cursor-pointer text-sm"
            >
              {selectedAccountIds.length === accounts.length
                ? 'Deselect All'
                : 'Select All'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}