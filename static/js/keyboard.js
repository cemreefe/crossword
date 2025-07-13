// Custom keyboard component for mobile devices

// Keyboard layouts based on locale
const keyboardLayouts = {
  'tr': [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç']
  ],
  'en': [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ]
};

let keyboardVisible = false;
let keyboardElement = null;

function createCustomKeyboard() {
  if (keyboardElement) {
    return keyboardElement;
  }

  const keyboard = document.createElement('div');
  keyboard.id = 'customKeyboard';
  keyboard.className = 'custom-keyboard';
  keyboard.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #f0f0f0;
    border-top: 1px solid #ccc;
    padding: 10px;
    z-index: 10000;
    display: none;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    max-height: 40vh;
    overflow-y: auto;
  `;

  const layout = keyboardLayouts[lang] || keyboardLayouts['en'];
  
  // Calculate key width based on the regular letter keys (not including special buttons)
  const maxLetterKeysInRow = Math.max(...layout.map(row => row.length));
  const containerWidth = window.innerWidth - 20; // Account for keyboard padding (10px each side)
  const gapSize = 4; // Gap between keys
  
  // For rows with only letters
  const letterRowGaps = (maxLetterKeysInRow - 1) * gapSize;
  const letterKeyWidth = Math.floor((containerWidth - letterRowGaps) / maxLetterKeysInRow);
  const letterKeyHeight = letterKeyWidth*1.6;
  
  // For the last row with special buttons, calculate available space for special buttons
  const lastRowLetters = layout[layout.length - 1].length;
  const usedWidthByLetters = lastRowLetters * letterKeyWidth;
  const usedGapsByLetters = (lastRowLetters - 1) * gapSize;
  const gapsAroundSpecialButtons = 3 * gapSize; // 3 gaps: before close, after letters, after delete
  const availableForSpecialButtons = containerWidth - usedWidthByLetters - usedGapsByLetters - gapsAroundSpecialButtons;
  const specialButtonWidth = Math.floor(availableForSpecialButtons / 2); // Split remaining space between 2 special buttons
  
  layout.forEach((row, rowIndex) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'keyboard-row';
    rowDiv.style.cssText = `
      display: flex;
      justify-content: center;
      margin: ${gapSize}px 0;
      gap: ${gapSize}px;
    `;

    // For the last row, add close button at the start
    if (rowIndex === layout.length - 1) {
      const closeKey = document.createElement('button');
      closeKey.className = 'keyboard-key';
      closeKey.innerHTML = '⌄';
      closeKey.style.cssText = `
        width: ${specialButtonWidth}px;
        height: ${letterKeyHeight}px;
        background: rgb(163 163 163);
        color: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 18px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s;
        -webkit-tap-highlight-color: transparent;
        flex-shrink: 0;
      `;

      closeKey.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeKey.style.background = '#555';
        closeKey.style.transform = 'scale(0.95)';
      });

      closeKey.addEventListener('touchend', (e) => {
        e.preventDefault();
        closeKey.style.background = '#666';
        closeKey.style.transform = 'scale(1)';
        hideCustomKeyboard();
      });

      closeKey.addEventListener('click', (e) => {
        e.preventDefault();
        hideCustomKeyboard();
      });

      rowDiv.appendChild(closeKey);
    }

    row.forEach(letter => {
      const key = document.createElement('button');
      key.className = 'keyboard-key';
      key.textContent = letter;
      key.style.cssText = `
        width: ${letterKeyWidth}px;
        height: ${letterKeyHeight}px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s;
        -webkit-tap-highlight-color: transparent;
        flex-shrink: 0;
      `;

      key.addEventListener('touchstart', (e) => {
        e.preventDefault();
        key.style.background = '#007AFF';
        key.style.color = 'white';
        key.style.transform = 'scale(0.95)';
      });

      key.addEventListener('touchend', (e) => {
        e.preventDefault();
        key.style.background = 'white';
        key.style.color = 'black';
        key.style.transform = 'scale(1)';
        handleKeyInput(letter);
      });

      key.addEventListener('click', (e) => {
        e.preventDefault();
        handleKeyInput(letter);
      });

      rowDiv.appendChild(key);
    });

    // For the last row, add delete button at the end
    if (rowIndex === layout.length - 1) {
      const backspaceKey = document.createElement('button');
      backspaceKey.className = 'keyboard-key';
      backspaceKey.innerHTML = '⌫';
      backspaceKey.style.cssText = `
        width: ${specialButtonWidth}px;
        height: ${letterKeyHeight}px;
        background: #ff6b6b;
        color: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 18px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.1s;
        -webkit-tap-highlight-color: transparent;
        flex-shrink: 0;
      `;

      backspaceKey.addEventListener('touchstart', (e) => {
        e.preventDefault();
        backspaceKey.style.background = '#ff5252';
        backspaceKey.style.transform = 'scale(0.95)';
      });

      backspaceKey.addEventListener('touchend', (e) => {
        e.preventDefault();
        backspaceKey.style.background = '#ff6b6b';
        backspaceKey.style.transform = 'scale(1)';
        handleBackspace();
      });

      backspaceKey.addEventListener('click', (e) => {
        e.preventDefault();
        handleBackspace();
      });

      rowDiv.appendChild(backspaceKey);
    }

    keyboard.appendChild(rowDiv);
  });

  document.body.appendChild(keyboard);
  keyboardElement = keyboard;
  
  return keyboard;
}

function showCustomKeyboard() {
  if (!isMobileDevice()) return;
  
  if (!keyboardElement) {
    createCustomKeyboard();
  }
  
  keyboardVisible = true;
  keyboardElement.style.display = 'block';
  
  // Adjust content wrapper to account for keyboard
  const contentWrapper = document.getElementById('contentWrapper');
  if (contentWrapper) {
    contentWrapper.style.paddingBottom = '200px';
  }
  
  console.log('Custom keyboard shown');
}

function hideCustomKeyboard() {
  if (keyboardElement) {
    keyboardVisible = false;
    keyboardElement.style.display = 'none';
    
    // Reset content wrapper padding
    const contentWrapper = document.getElementById('contentWrapper');
    if (contentWrapper) {
      contentWrapper.style.paddingBottom = '';
    }
    
    console.log('Custom keyboard hidden');
  }
}

function handleKeyInput(letter) {
  const r = selected.row;
  const c = selected.col;

  if (grid[r][c] === "-") {
    console.log("Key input on black cell, ignored.");
    return;
  }

  // Convert to uppercase using locale
  const upperLetter = toUpperCaseWithLocale(letter);
  answers[r][c] = upperLetter;
  console.log(`Entered '${upperLetter}' at (${r}, ${c}). Answers[${r}][${c}] = '${answers[r][c]}'`);

  // Check if puzzle is complete
  if (checkIfAllFilled()) {
    console.log("All cells are filled. Checking if complete...");
    if (isPuzzleComplete()) {
      console.log("Crossword is complete!");
      hideCustomKeyboard();
      showSuccessModal();
    } else {
      console.log("Crossword is filled but incorrect.");
      if (!allCellsFilledOnce) {
        showErrorModal();
      }
      allCellsFilledOnce = true;
    }
  }

  // Move to next cell
  if (currentDirection === 'across') {
    moveToNextEnterableCell(r, c, 1, 0);
  } else {
    moveToNextEnterableCell(r, c, 0, 1);
  }
  
  renderGrid();
}

function handleBackspace() {
  const r = selected.row;
  const c = selected.col;

  if (grid[r][c] === "-") {
    console.log("Backspace on black cell, ignored.");
    return;
  }

  console.log(`Backspace pressed at (${r}, ${c}). Current value: '${answers[r][c]}'`);
  
  // If current cell has content, clear it and stay here
  if (answers[r][c] !== "") {
    answers[r][c] = "";
    console.log(`Cleared cell (${r}, ${c}) and staying in place.`);
  } else {
    // If current cell is empty, move to previous cell and delete its content
    console.log(`Cell (${r}, ${c}) was empty, moving to previous enterable cell and deleting its content.`);
    if (currentDirection === 'across') {
      moveToPreviousEnterableCell(r, c, 1, 0);
    } else {
      moveToPreviousEnterableCell(r, c, 0, 1);
    }
    
    // After moving, delete the content of the new cell
    const newR = selected.row;
    const newC = selected.col;
    if (answers[newR] && answers[newR][newC] !== undefined) {
      answers[newR][newC] = "";
      console.log(`Cleared content at new position (${newR}, ${newC}).`);
    }
  }
  
  renderGrid();
}

// Check if device is mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768 && window.innerHeight <= 1024);
}

// Show custom keyboard for mobile devices
function showKeyboardIfMobile() {
  if (isMobileDevice()) {
    showCustomKeyboard();
  }
}
