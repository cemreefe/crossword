// Main initialization and game setup

// Show spinner in start modal while loading
// Immediately set modal to loading state to prevent flash of default text
const startModal = document.getElementById("startModal");
const startModalSpinner = document.getElementById("startModalSpinner");
const startButton = document.getElementById("startButton");
const startModalTitle = document.getElementById("startModalTitle");
const startModalMessage = document.getElementById("startModalMessage");
if (startModal && startModalSpinner && startButton && startModalTitle && startModalMessage) {
  startModal.style.display = "flex";
  startModalTitle.textContent = "";
  startButton.style.display = "none";
  startModalMessage.style.display = "none";
  startModalSpinner.style.display = "flex";
}
document.getElementById("startModalTitle").textContent = "";
Promise.all([
  fetch(`localization/${lang}.json`).then(res => res.json()),
  getOrFindPuzzleData()
]).then(([localizationData, puzzleData]) => {
  // Hide spinner, show modal title and button
  document.getElementById("startModalSpinner").style.display = "none";
  var startModalTitle = document.getElementById("startModalTitle");
  startModalTitle.style.display = "block";
  document.getElementById("startButton").style.display = "inline-block";
  document.getElementById("startModalMessage").style.display = "none";

  // Store localization data globally for share function
  window.localizationData = localizationData;
  // Call the function and update the indicator when the result is available
  findAvailableDaysInFuture().then(days => {
    updateBacklogIndicator(days);
  });
  // Set the global puzzleDate variable for use in completion checking
  puzzleDate = puzzleData.date;
  // Handle localization
  document.title = localizationData.title;
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = new Date(puzzleData.date).toLocaleDateString(lang, options);
  document.getElementById("title").textContent = `${localizationData.title}`;
  document.getElementById("today").textContent = formattedDate;
  document.getElementById("successModal").querySelector("h2").textContent = localizationData.successTitle;
  document.getElementById("errorModal").querySelector("h2").textContent = localizationData.errorTitle;
  document.getElementById("errorModal").querySelector("p").textContent = localizationData.errorMessage;
  document.getElementById("startButton").textContent = localizationData.startGame;
  document.getElementById("by").textContent = localizationData.by;
  document.getElementById("timerName").textContent = localizationData.time;
  document.getElementById("oops").textContent = localizationData.oopsKeepTrying;
  document.getElementById("dontWorry").textContent = localizationData.stillMistakes;
  document.getElementById("keepGoing").textContent = localizationData.keepGoing;
  document.getElementById("congrats").textContent = localizationData.crosswordSolved;
  document.getElementById("youFinishedIn").textContent = localizationData.youFinishedIn;
  document.getElementById("successOk").textContent = localizationData.successOk;
  document.getElementById("shareButton").textContent = `📱 ${localizationData.share || 'Share'}`;
  // Set print clues titles
  document.getElementById("acrossTitle").textContent = localizationData.across;
  document.getElementById("downTitle").textContent = localizationData.down;
  console.log("Localization loaded:", localizationData);
  // Use override data if available, otherwise fetch from file

  if (puzzleData.isOverride) {
    return Promise.resolve(puzzleData.content);
  } else {
    // Load puzzle data from file
    return fetch(`${lang}/${puzzleData.date}.txt`);
  }
}).then(dataOrResponse => {
  let puzzleTextPromise;
  
  if (typeof dataOrResponse === 'string') {
    // It's override data, use directly
    puzzleTextPromise = Promise.resolve(dataOrResponse);
  } else {
    // It's a fetch response
    if (!dataOrResponse.ok) {
      throw new Error(`HTTP error! status: ${dataOrResponse.status}`);
    }
    document.getElementById("startModalTitle").textContent = localizationData.readyToPlay;
    puzzleTextPromise = dataOrResponse.text();
  }
  
  return puzzleTextPromise;
}).then(text => {
  console.log("Fetched puzzle data:", text);
  const processedText = processPuzzleText(text);
  console.log("Processed puzzle data:", processedText);
  const lines = processedText.trim().split("\n");
  const author = lines[0].split(": ")[1];
  document.getElementById("author").textContent = author;

  gridSize = parseInt(lines[1].split(": ")[1]);
  const gridLines = lines.slice(2, 2 + gridSize);
  if (gridLines.length !== gridSize || gridLines.some(l => l.length !== gridSize)) {
    console.error("Grid size mismatch!", { expected: gridSize, actualRows: gridLines.length, actualCols: gridLines.map(l=>l.length) });
    alert("Grid size mismatch");
    throw new Error("Grid size mismatch");
  }

  grid = gridLines.map(l => l.split(""));
  answers = Array(gridSize).fill(null).map(() => Array(gridSize).fill(""));
  console.log("Initial grid loaded:", grid);
  console.log("Initial answers array:", answers);

  // If 0,0 is a black cell, set selected to the first white cell
  while (selected.row < gridSize && selected.col < gridSize && grid[selected.row][selected.col] === '-') {
    selected.col++;
    if (selected.col >= gridSize) {
      selected.col = 0;
      selected.row++;
    }
  }
  if (selected.row >= gridSize) {
    console.error("No valid starting cell found in the grid.");
    alert("No valid starting cell found in the grid.");
    return;
  }

  // Populate original clues data from the file
  lines.slice(2 + gridSize).forEach(line => {
    if (!line.includes(": ")) return;
    const [pos, clue] = line.split(": ");
    const dir = pos.startsWith("H") ? "H" : "V";
    const id = pos.slice(1);
    cluesData[dir][id] = clue;
  });
  console.log("Raw clues data loaded:", cluesData);

  mapCluePositions(); // Map clue numbers to grid positions after grid is loaded
  populatePrintClues(); // Populate complete clues list for print view
  renderGrid(); // Render grid and manage clue visibility
  
  // Initialize mobile keyboard if needed
  if (isMobileDevice()) {
    console.log("Mobile device detected, custom keyboard will be available");
  }
}).catch(error => {
  console.error("Error loading crossword data:", error);
  // Show error in start modal, hide start button, hide spinner
  document.getElementById("startModalSpinner").style.display = "none";
  // Use translation for no puzzle available
  var msg = (window.localizationData && window.localizationData.noPuzzleAvailable) ? window.localizationData.noPuzzleAvailable : "sorry no puzzle available at this time";
  document.getElementById("startModalMessage").textContent = msg;
  document.getElementById("startModalMessage").style.display = "block";
  document.getElementById("startButton").style.display = "none";
});

console.log("Main initialization script loaded.");

// Function to populate the complete clues list for print view
function populatePrintClues() {
  const acrossCluesList = document.getElementById('acrossCluesList');
  const downCluesList = document.getElementById('downCluesList');
  
  // Clear existing content
  acrossCluesList.innerHTML = '';
  downCluesList.innerHTML = '';
  
  // Populate across clues
  const acrossEntries = Object.entries(cluesData.H);
  acrossEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0])); // Sort by clue number
  
  acrossEntries.forEach(([clueNumber, clueText]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${clueNumber}.</strong> ${clueText}`;
    acrossCluesList.appendChild(li);
  });
  
  // Populate down clues
  const downEntries = Object.entries(cluesData.V);
  downEntries.sort((a, b) => parseInt(a[0]) - parseInt(b[0])); // Sort by clue number
  
  downEntries.forEach(([clueNumber, clueText]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${clueNumber}.</strong> ${clueText}`;
    downCluesList.appendChild(li);
  });
  
  console.log("Print clues populated");
}
