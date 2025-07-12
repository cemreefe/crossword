// Main initialization and game setup

// Get localization json and load puzzle
Promise.all([
  fetch(`localization/${lang}.json`).then(res => res.json()),
  getOrFindPuzzleData()
]).then(([localizationData, puzzleData]) => {
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
  document.getElementById("startModal").querySelector("h2").textContent = localizationData.readyToPlay;
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
  renderGrid(); // Render grid and manage clue visibility
}).catch(error => {
  console.error("Error loading crossword data:", error);
  alert("Failed to load crossword puzzle. Make sure the puzzle file exists and is correctly formatted.");
});

console.log("Main initialization script loaded.");
