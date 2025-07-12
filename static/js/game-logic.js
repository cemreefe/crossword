// Game logic functions

// Function to map clue numbers to grid positions (based on standard crossword numbering)
function mapCluePositions() {
  let currentAcrossClueNum = 1;
  let currentDownClueNum = 1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== '-') { // If it's a white cell
        let isStartOfAcrossWord = (c === 0 || grid[r][c - 1] === '-');
        if (isStartOfAcrossWord) {
          cluePositions.across[`${r},${c}`] = String(currentAcrossClueNum);
          currentAcrossClueNum++;
        }
      }
    }
  }
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r < gridSize; r++) {
      if (grid[r][c] !== '-') { // If it's a white cell
        let isStartOfDownWord = (r === 0 || grid[r - 1][c] === '-');
        if (isStartOfDownWord) {
          cluePositions.down[`${r},${c}`] = String(currentDownClueNum);
          currentDownClueNum++;
        }
      }
    }
  }
  console.log("Clue positions mapped:", { across: cluePositions.across, down: cluePositions.down });
}

function getWordInfo(row, col, direction) {
  console.log(`getWordInfo called for (${row}, ${col}) direction: ${direction}`);
  let startRow = row;
  let startCol = col;
  let endRow = row;
  let endCol = col;

  if (direction === 'across') {
    // Find start of the word
    while (startCol > 0 && grid[row][startCol - 1] !== '-') {
      startCol--;
    }
    // Find end of the word
    while (endCol < gridSize - 1 && grid[row][endCol + 1] !== '-') {
      endCol++;
    }
  } else { // 'down'
    // Find start of the word
    while (startRow > 0 && grid[startRow - 1][col] !== '-') {
      startRow--;
    }
    // Find end of the word
    while (endRow < gridSize - 1 && grid[endRow + 1][col] !== '-') {
      endRow++;
    }
  }

  let wordCells = [];
  let clueId = null;

  if (direction === 'across') {
    for (let c = startCol; c <= endCol; c++) {
      wordCells.push({ r: row, c: c });
    }
    clueId = cluePositions.across[`${startRow},${startCol}`] || null;

  } else { // 'down'
    for (let r_word = startRow; r_word <= endRow; r_word++) {
      wordCells.push({ r: r_word, c: col });
    }
    clueId = cluePositions.down[`${startRow},${startCol}`] || null;
  }
  console.log(`Word info for (${row}, ${col}) ${direction}: Start(${startRow},${startCol}), End(${endRow},${endCol}), Clue ID: ${clueId}`);
  return { wordCells, clueId };
}

function toUpperCaseWithLocale(str) {
  // Convert to uppercase based on the current locale
  return str.toLocaleUpperCase(!!lang? lang : 'en-US');
}

function checkIfComplete() {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "-") continue;
      if (toUpperCaseWithLocale(answers[r][c]) !== toUpperCaseWithLocale(grid[r][c])) {
        console.log(`Mismatch at (${r}, ${c}): Expected '${grid[r][c]}', Got '${answers[r][c]}'`);
        return false;
      }
    }
  }
  return true;
}

function checkIfCompleteWithoutSpecialCharacters() {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "-") continue;
      
      let expectedChar = normalizeForComparison(toUpperCaseWithLocale(grid[r][c]));
      let enteredChar = normalizeForComparison(toUpperCaseWithLocale(answers[r][c]));
      
      if (enteredChar !== expectedChar) {
        console.log(`Mismatch (normalized) at (${r}, ${c}): Expected '${grid[r][c]}' (${expectedChar}), Got '${answers[r][c]}' (${enteredChar})`);
        return false;
      }
    }
  }
  return true;
}

// Check if puzzle is complete, allowing fallback for older puzzles
function isPuzzleComplete() {
  const exactMatch = checkIfComplete();
  
  // For puzzles dated July 10, 2025 or earlier, also allow Turkish/English equivalents
  if (!exactMatch && shouldAllowTurkishEnglishEquivalents()) {
    const normalizedMatch = checkIfCompleteWithoutSpecialCharacters();
    if (normalizedMatch) {
      console.log("Puzzle completed using Turkish/English letter equivalents (legacy support)");
    }
    return normalizedMatch;
  }
  
  return exactMatch;
}

// Check if we should allow Turkish/English letter equivalents based on puzzle date
function shouldAllowTurkishEnglishEquivalents() {
  try {
    // Get the puzzle date from the puzzleDate variable or fallback
    const puzzleDateStr = puzzleDate || new Date().toISOString().slice(0, 10);
    const puzzleDateObj = new Date(puzzleDateStr);
    const cutoffDate = new Date('2025-07-10');
    
    return puzzleDateObj <= cutoffDate;
  } catch (error) {
    console.log('Error checking puzzle date for Turkish equivalents:', error);
    return false; // Default to strict checking if date parsing fails
  }
}

// Normalize Turkish and English letter equivalents for comparison
function normalizeForComparison(char) {
  const turkishToEnglish = {
    'Ş': 'S', 'ş': 's',
    'İ': 'I', 'ı': 'i', 'I': 'I',
    'Ğ': 'G', 'ğ': 'g',
    'Ü': 'U', 'ü': 'u',
    'Ö': 'O', 'ö': 'o',
    'Ç': 'C', 'ç': 'c'
  };
  
  return turkishToEnglish[char] || char;
}

function checkIfAllFilled() {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] !== "-" && answers[r][c] === "") {
        console.log(`Cell (${r}, ${c}) is empty.`);
        return false;
      }
    }
  }
  console.log("All white cells are filled.");
  return true;
}
