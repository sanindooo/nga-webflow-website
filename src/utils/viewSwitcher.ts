/**
 * View Switcher — toggles grid/list view on works listings, persists to localStorage.
 */

const STORAGE_KEY = 'nga-works-view'
const DEFAULT_VIEW = 'grid'

export const viewSwitcher = () => {
  const toggles = document.querySelectorAll<HTMLElement>('[data-view]')
  const wrappers = document.querySelectorAll<HTMLElement>('.works-list-wrapper')

  if (!toggles.length || wrappers.length < 2) return

  let listWrapper: HTMLElement | null = null
  let gridWrapper: HTMLElement | null = null

  wrappers.forEach((wrapper) => {
    if (wrapper.classList.contains('u-row-view')) {
      listWrapper = wrapper
    } else {
      gridWrapper = wrapper
    }
  })

  if (!listWrapper || !gridWrapper) return

  const resolvedListWrapper = listWrapper as HTMLElement
  const resolvedGridWrapper = gridWrapper as HTMLElement

  const saved = localStorage.getItem(STORAGE_KEY)
  const initialView = saved === 'list' || saved === 'grid' ? saved : DEFAULT_VIEW

  function applyView(view: string) {
    resolvedListWrapper.classList.toggle('is-active', view === 'list')
    resolvedGridWrapper.classList.toggle('is-active', view === 'grid')

    toggles.forEach((toggle) => {
      toggle.classList.toggle('is-active', toggle.getAttribute('data-view') === view)
    })

    localStorage.setItem(STORAGE_KEY, view)
  }

  applyView(initialView)

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      event.preventDefault()
      const view = toggle.getAttribute('data-view')
      if (view) applyView(view)
    })
  })
}
