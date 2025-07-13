// Modal and UI control functions

function showSuccessModal() {
  stopTimer();
  // Hide custom keyboard and blur hidden input when modal is shown
  hideCustomKeyboard();
  hiddenInput.blur();
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const min = String(Math.floor(diff / 60)).padStart(2, '0');
  const sec = String(diff % 60).padStart(2, '0');
  document.getElementById("finalTime").textContent = `${min}:${sec}`;
  document.getElementById("successModal").style.display = 'flex';
  console.log(`Success modal shown. Final time: ${min}:${sec}`);
}

function closeSuccessModal() {
  document.getElementById("successModal").style.display = 'none';
  if (!isMobileDevice()) {
    focusHiddenInput(); // Re-focus hidden input after modal closes (desktop only)
  }
}

function showErrorModal() {
  // Hide custom keyboard and blur hidden input when modal is shown
  hideCustomKeyboard();
  hiddenInput.blur();
  document.getElementById("errorModal").style.display = 'flex';
  console.log("Error modal shown.");
}

function closeErrorModal() {
  document.getElementById("errorModal").style.display = 'none';
  if (!isMobileDevice()) {
    focusHiddenInput(); // Re-focus hidden input after modal closes (desktop only)
  }
}

function startGame() {
  document.getElementById("startModal").style.display = 'none';
  startTimer();
  if (isMobileDevice()) {
    // Show custom keyboard immediately on mobile
    showCustomKeyboard();
  } else {
    focusHiddenInput(); // Focus hidden input when game starts (desktop only)
  }
  console.log("Game started.");
}
