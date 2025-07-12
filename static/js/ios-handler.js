// iOS specific handling

// Show iOS keyboard trigger button on iOS devices
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  iosKeyboardTrigger.style.display = 'block';
  iosKeyboardTrigger.onclick = () => {
    hiddenInput.focus();
    hiddenInput.click();
    iosKeyboardTrigger.style.display = 'none';
    // Ensure no scroll after focus
    setTimeout(() => window.scrollTo(0, 0), 10);
  };
  
  // Also add touch event to the trigger for better iOS handling
  iosKeyboardTrigger.addEventListener('touchend', (e) => {
    e.preventDefault();
    hiddenInput.focus();
    hiddenInput.click();
    iosKeyboardTrigger.style.display = 'none';
    // Ensure no scroll after focus
    setTimeout(() => window.scrollTo(0, 0), 10);
  });
}
