import React from 'react'

const visuallyHiddenStyle = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1
};

const AccessibleNavigationAnnouncer = () => {
  return (
    <div
      style={visuallyHiddenStyle}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      Navigated to app/dashboard page.
    </div>
  )
}

export default AccessibleNavigationAnnouncer
