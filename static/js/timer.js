// Timer functions

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    const min = String(Math.floor(diff / 60)).padStart(2, '0');
    const sec = String(diff % 60).padStart(2, '0');
    document.getElementById("timer").textContent = `${min}:${sec}`;
  }, 1000);
  console.log("Timer started.");
}

function stopTimer() {
  clearInterval(timerInterval);
  console.log("Timer stopped.");
}
