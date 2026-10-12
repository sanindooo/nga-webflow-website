/**
 * Works Filter — dual-handle range sliders and sort for the Works listing.
 *
 * Range sliders: each `.news-filter_range-wrapper` holds two stacked
 * `.news-filter_range` inputs (min and max handle) and two hidden inputs
 * carrying `fs-cmsfilter-range="from"` / `"to"`. The slider ends are read from
 * the CMS items on the page (`[fs-cmsfilter-field="<field>"]` inside the
 * Finsweet list), so new projects widen the range with no Designer edits.
 * `data-range-scale="log"` on the wrapper switches to a logarithmic scale
 * (used for area, 65 m² to 1 000 000 m²). The handles move in position space;
 * the converted real value is written to the hidden inputs, which is what
 * Finsweet CMS Filter reads. A handle at its end clears its input so items
 * with no value are only excluded once the range is narrowed.
 *
 * Sort: `[data-sort="<key>-<asc|desc>"]` radios reorder the items of every
 * Finsweet list instance (both the row and grid views). The instance's item
 * array is sorted too, so later filter renders keep the sort order.
 */

const POSITION_STEPS = 1000
const ACTIVE_CLASS = 'fs-cmsfilter_active'
const LIST_SELECTOR = '[fs-cmsfilter-element="list"]'

interface FsItem {
  element: HTMLElement
}

interface FsFilterInstance {
  listInstance: { items: FsItem[] }
}

interface RangeSlider {
  field: string
  reset: () => void
  syncFromInputs: () => void
}

const readNumber = (text: string | null | undefined) => {
  const digits = (text ?? '').replace(/[^\d.]/g, '')
  return digits ? Number(digits) : null
}

const fieldValues = (field: string) => {
  const values: number[] = []
  document
    .querySelectorAll<HTMLElement>(`${LIST_SELECTOR} [fs-cmsfilter-field="${field}"]`)
    .forEach((element) => {
      const value = readNumber(element.textContent)
      if (value !== null) values.push(value)
    })
  return values
}

// Labels may hold a superscript (m²); only the leading text node is replaced.
const setLabelText = (label: HTMLElement | undefined, text: string) => {
  if (!label) return
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE)
  if (textNode) textNode.textContent = label.querySelector('sup') ? `${text}m` : text
  else label.textContent = text
}

const createRangeSlider = (wrapper: HTMLElement): RangeSlider | null => {
  const [minHandle, maxHandle] = Array.from(
    wrapper.querySelectorAll<HTMLInputElement>('input.news-filter_range'),
  )
  const fromInput = wrapper.querySelector<HTMLInputElement>('[fs-cmsfilter-range="from"]')
  const toInput = wrapper.querySelector<HTMLInputElement>('[fs-cmsfilter-range="to"]')
  const field = fromInput?.getAttribute('fs-cmsfilter-field')
  if (!minHandle || !maxHandle || !fromInput || !toInput || !field) return null

  const values = fieldValues(field)
  if (!values.length) return null

  const isLog = wrapper.getAttribute('data-range-scale') === 'log'
  const lowest = Math.min(...values)
  const highest = Math.max(...values)
  const labels = Array.from(wrapper.querySelectorAll<HTMLElement>('.news-filter_range-value'))
  // Thousands separators for areas (65 to 1,000,000), not for years.
  const formatValue = (value: number) =>
    highest >= 10000 ? value.toLocaleString('en-GB') : String(value)
  const minLabel = labels[0]
  const maxLabel = labels[labels.length - 1]

  const toValue = (position: number) => {
    const ratio = position / POSITION_STEPS
    const value = isLog
      ? Math.exp(Math.log(lowest) + ratio * (Math.log(highest) - Math.log(lowest)))
      : lowest + ratio * (highest - lowest)
    if (position <= 0) return lowest
    if (position >= POSITION_STEPS) return highest
    return isLog && value >= 1000 ? Math.round(value / 100) * 100 : Math.round(value)
  }

  const toPosition = (value: number) => {
    if (highest === lowest) return 0
    const ratio = isLog
      ? (Math.log(value) - Math.log(lowest)) / (Math.log(highest) - Math.log(lowest))
      : (value - lowest) / (highest - lowest)
    return Math.round(Math.min(Math.max(ratio, 0), 1) * POSITION_STEPS)
  }

  ;[minHandle, maxHandle].forEach((handle) => {
    handle.min = '0'
    handle.max = String(POSITION_STEPS)
    handle.step = '1'
  })

  const render = () => {
    const minPosition = Number(minHandle.value)
    const maxPosition = Number(maxHandle.value)
    // Unitless 0-1 ratios; the CSS maps them onto the thumb centres.
    wrapper.style.setProperty('--range-start', String(minPosition / POSITION_STEPS))
    wrapper.style.setProperty('--range-end', String(maxPosition / POSITION_STEPS))
    // Keep the min handle grabbable when both handles sit at the far end.
    minHandle.style.zIndex = minPosition >= POSITION_STEPS - 1 ? '2' : ''
    setLabelText(minLabel, formatValue(toValue(minPosition)))
    setLabelText(maxLabel, formatValue(toValue(maxPosition)))
  }

  const writeInput = (input: HTMLInputElement, value: string) => {
    if (input.value === value) return
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const commit = () => {
    const minPosition = Number(minHandle.value)
    const maxPosition = Number(maxHandle.value)
    writeInput(fromInput, minPosition <= 0 ? '' : String(toValue(minPosition)))
    writeInput(toInput, maxPosition >= POSITION_STEPS ? '' : String(toValue(maxPosition)))
  }

  minHandle.addEventListener('input', () => {
    if (Number(minHandle.value) > Number(maxHandle.value)) minHandle.value = maxHandle.value
    render()
    commit()
  })
  maxHandle.addEventListener('input', () => {
    if (Number(maxHandle.value) < Number(minHandle.value)) maxHandle.value = minHandle.value
    render()
    commit()
  })

  const reset = () => {
    minHandle.value = '0'
    maxHandle.value = String(POSITION_STEPS)
    render()
  }

  // Finsweet restores range values from the URL query; mirror them on the handles.
  const syncFromInputs = () => {
    const fromValue = readNumber(fromInput.value)
    const toValueRead = readNumber(toInput.value)
    minHandle.value = String(fromValue === null ? 0 : toPosition(fromValue))
    maxHandle.value = String(toValueRead === null ? POSITION_STEPS : toPosition(toValueRead))
    render()
  }

  reset()
  return { field, reset, syncFromInputs }
}

const sortValue = (item: FsItem, key: string) => {
  const fieldName = { name: 'Name', year: 'Year', area: 'Area' }[key]
  const text = item.element.querySelector(`[fs-cmsfilter-field="${fieldName}"]`)?.textContent
  return key === 'name' ? (text ?? '').trim().toLowerCase() : readNumber(text)
}

const sortItems = (instances: FsFilterInstance[], sortKey: string) => {
  const [key, direction] = sortKey.split('-')
  const multiplier = direction === 'desc' ? -1 : 1

  instances.forEach(({ listInstance }) => {
    listInstance.items.sort((first, second) => {
      const firstValue = sortValue(first, key)
      const secondValue = sortValue(second, key)
      // Items with no value always sit at the end, whatever the direction.
      if (firstValue === null || firstValue === '') return 1
      if (secondValue === null || secondValue === '') return -1
      if (typeof firstValue === 'string' && typeof secondValue === 'string') {
        return firstValue.localeCompare(secondValue) * multiplier
      }
      return ((firstValue as number) - (secondValue as number)) * multiplier
    })

    listInstance.items.forEach(({ element }) => {
      if (element.isConnected) element.parentElement?.appendChild(element)
    })
  })

  ScrollTrigger.refresh(true)
}

// Webflow publishes every radio with name="radio" and puts the Designer group
// name in data-name, so all panels would share one radio group (picking a
// location unchecks the typology). Restore the real group name.
const restoreRadioGroups = () => {
  document
    .querySelectorAll<HTMLInputElement>(
      '[fs-cmsfilter-element="filters"] input[type="radio"][data-name], input[data-sort][data-name]',
    )
    .forEach((radio) => {
      radio.name = radio.dataset.name ?? radio.name
    })
}

export const worksFilter = () => {
  restoreRadioGroups()

  const rangeWrappers = document.querySelectorAll<HTMLElement>(
    '[fs-cmsfilter-element="filters"] .news-filter_range-wrapper',
  )
  const sortInputs = document.querySelectorAll<HTMLInputElement>('input[data-sort]')
  if (!rangeWrappers.length && !sortInputs.length) return

  const sliders = Array.from(rangeWrappers)
    .map(createRangeSlider)
    .filter((slider): slider is RangeSlider => slider !== null)

  // Finsweet clears the hidden inputs itself; move the handles back to match.
  document.querySelectorAll<HTMLElement>('[fs-cmsfilter-element="clear"]').forEach((clear) => {
    const clearedField = clear.getAttribute('fs-cmsfilter-clear')
    clear.addEventListener('click', () => {
      sliders
        .filter((slider) => !clearedField || slider.field === clearedField)
        .forEach((slider) => slider.reset())
    })
  })

  const fsAttributes = (window.fsAttributes ??= [])
  fsAttributes.push([
    'cmsfilter',
    (filterInstances: FsFilterInstance[]) => {
      sliders.forEach((slider) => slider.syncFromInputs())

      sortInputs.forEach((sortInput) => {
        sortInput.addEventListener('change', () => {
          if (!sortInput.checked) return
          sortInputs.forEach((input) => {
            input.closest('.news-filter_link')?.classList.toggle(ACTIVE_CLASS, input.checked)
          })
          sortItems(filterInstances, sortInput.getAttribute('data-sort') ?? '')
        })
      })
    },
  ])
}
