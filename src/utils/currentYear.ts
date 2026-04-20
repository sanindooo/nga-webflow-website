/**
 * Current Year — sets the text content of #current-year to the current year.
 * Used in the footer copyright line.
 */

export const currentYear = () => {
  const yearElement = document.getElementById('current-year')
  if (!yearElement) return
  yearElement.textContent = String(new Date().getFullYear())
}
