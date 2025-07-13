// Input handling and focus management

// Check if we're running in an iframe (like in the encrypt.html preview)
function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function focusHiddenInput() {
  // Only focus hidden input on desktop devices
  if (!isMobileDevice()) {
    setTimeout(() => {
      try {
        if (!hiddenInput.matches(':focus')) {
          hiddenInput.focus();
        }
        // Only prevent scroll if not in iframe
        if (!isInIframe()) {
          window.scrollTo(0, 0);
        }
      } catch (e) {
        console.log('Focus failed:', e);
      }
    }, 100);
  }
}

// Prevent any scrolling and keep viewport locked at top (only if not in iframe)
function preventScroll() {
  if (!isInIframe()) {
    window.scrollTo(0, 0);
  }
}

// Multiple event listeners to prevent scrolling (only if not in iframe)
if (!isInIframe()) {
  window.addEventListener('scroll', preventScroll, { passive: false });
  window.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('wheel', (e) => {
    e.preventDefault();
  }, { passive: false });
}

// Prevent scroll on keyboard navigation
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
    // Only prevent if not typing in our hidden input
    if (e.target !== hiddenInput) {
      e.preventDefault();
    }
  }
});

// Force scroll to top periodically (backup) - only if not in iframe
if (!isInIframe()) {
  setInterval(() => {
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0);
    }
  }, 100);
}

// Enhanced focus management - only for desktop
document.addEventListener('focusout', (e) => {
  if (e.target === hiddenInput && !isMobileDevice()) {
    const modalsOpen = document.querySelector('.modal[style*="flex"]');
    if (!modalsOpen) {
      setTimeout(() => {
        if (!hiddenInput.matches(':focus')) {
          hiddenInput.focus();
        }
      }, 50);
    }
  }
});

// Initial focus on the hidden input after the page loads (desktop only)
window.onload = () => {
  if (!isMobileDevice()) {
    focusHiddenInput();
  }
};
