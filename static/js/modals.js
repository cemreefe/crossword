// Modal and UI control functions

function showSuccessModal() {
  stopTimer();
  // Blur the hidden input when a modal is shown
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
  focusHiddenInput(); // Re-focus hidden input after modal closes
}

function showErrorModal() {
  // Blur the hidden input when a modal is shown
  hiddenInput.blur();
  document.getElementById("errorModal").style.display = 'flex';
  console.log("Error modal shown.");
}

function closeErrorModal() {
  document.getElementById("errorModal").style.display = 'none';
  focusHiddenInput(); // Re-focus hidden input after modal closes
}

function startGame() {
  document.getElementById("startModal").style.display = 'none';
  startTimer();
  focusHiddenInput(); // Focus hidden input when game starts
  console.log("Game started.");
}
