import React from 'react'

const AccessibleNavigationAnnouncer = () => {
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      Navigated to app/dashboard page.
    </div>
  )
}

export default AccessibleNavigationAnnouncer