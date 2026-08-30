/**
 * Feature Page Registry
 *
 * Each entry in FEATURE_PAGES turns a rail nav view into a pinned main-area tab.
 * The tab:
 *   - opens automatically when the nav view activates
 *   - is pinned to the right of the tab bar with no close button
 *   - disappears from the bar when the nav view is not active
 *
 * To add a new feature page:
 *   1. Create the component (e.g. SessionsBoardView)
 *   2. Add an entry here mapping its NavView key
 *   3. Call openFeaturePage('<view>') from Sidebar.tsx when the view activates
 */

import type { NavView } from '../types'
import { TasksBoardView } from '../components/TasksBoardView'
// import { SessionsBoardView } from '../components/SessionsBoardView'  // future

export interface FeaturePageDef {
  /** Tab bar label */
  title: string
  /** Main area component rendered inside the tab */
  component: React.ComponentType
}

export const FEATURE_PAGES: Partial<Record<NavView, FeaturePageDef>> = {
  tasks: {
    title:     'Tasks',
    component: TasksBoardView,
  },
  // terminal: {
  //   title:     'Sessions',
  //   component: SessionsBoardView,
  // },
}

/** Stable tab id for a feature page — avoids duplicates across re-renders */
export const featurePageId = (view: NavView) => `feature-page:${view}`
