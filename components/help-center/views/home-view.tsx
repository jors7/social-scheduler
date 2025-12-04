'use client'

import { WidgetHeader } from '../components/widget-header'
import { SearchBox } from '../components/search-box'
import { CollectionsList } from '../components/collections-list'
import { WidgetTabs } from '../components/widget-tabs'

export function HomeView() {
  return (
    <>
      <WidgetHeader />
      <div className="flex-1 overflow-y-auto">
        <SearchBox />

        <CollectionsList />
      </div>

      <WidgetTabs />
    </>
  )
}
