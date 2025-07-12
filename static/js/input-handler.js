// Input handling and focus management

function focusHiddenInput() {
  // Use a timeout to ensure focus after other DOM manipulations
  setTimeout(() => {
    try {
      // Only focus if not already focused to prevent keyboard flicker
      if (!hiddenInput.matches(':focus')) {
        hiddenInput.focus();
        // For iOS, sometimes we need to trigger a click event
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
          hiddenInput.click();
        }
      }
      // Always ensure no scroll after focus
      window.scrollTo(0, 0);
    } catch (e) {
      console.log('Focus failed:', e);
    }
  }, 100);
}

// Prevent any scrolling and keep viewport locked at top
function preventScroll() {
  window.scrollTo(0, 0);
}

// Multiple event listeners to prevent scrolling
window.addEventListener('scroll', preventScroll, { passive: false });
window.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });
window.addEventListener('wheel', (e) => {
  e.preventDefault();
}, { passive: false });

// Prevent scroll on keyboard navigation
window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
    // Only prevent if not typing in our hidden input
    if (e.target !== hiddenInput) {
      e.preventDefault();
    }
  }
});

// Force scroll to top periodically (backup)
setInterval(() => {
  if (window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
}, 100);

// Enhanced focus management for iOS
document.addEventListener('focusout', (e) => {
  // If the hidden input loses focus and no modal is open, refocus it
  if (e.target === hiddenInput) {
    const modalsOpen = document.querySelector('.modal[style*="flex"]');
    if (!modalsOpen) {
      // For iOS, show the button again if focus is lost
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        setTimeout(() => {
          iosKeyboardTrigger.style.display = 'block';
        }, 100);
      } else {
        // For other devices, try to refocus automatically
        setTimeout(() => {
          if (!hiddenInput.matches(':focus')) {
            hiddenInput.focus();
          }
        }, 50);
      }
    }
  }
});

// Initial focus on the hidden input after the page loads
window.onload = focusHiddenInput;
