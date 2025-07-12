// Puzzle data loading and processing functions

// Simple XOR decryption function (matches encrypt.html)
function simpleDecrypt(encryptedText) {
  const key = 42; // Same key as in encrypt.html
  return encryptedText.split('').map(char => 
    String.fromCharCode(char.charCodeAt(0) ^ key)
  ).join('');
}

// Function to process puzzle text (handle both plain and encrypted content)
function processPuzzleText(rawText) {
  const text = rawText.trim();
  
  // Check if content is encrypted
  if (text.startsWith('[ENCRYPTED]')) {
    console.log("Detected encrypted content, decrypting...");
    const encryptedContent = text.substring('[ENCRYPTED]\n'.length);
    const decryptedContent = simpleDecrypt(encryptedContent);
    console.log("Content decrypted successfully");
    return decryptedContent;
  } else {
    console.log("Processing plain text content");
    return text;
  }
}

// Function to get puzzle data from override or find latest puzzle
async function getOrFindPuzzleData() {
  // Check for crossword override parameter
  const urlParams = new URLSearchParams(window.location.search);
  const crosswordOverride = urlParams.get('crosswordOverride');
  
  if (crosswordOverride) {
    console.log("Using crossword override data from URL parameter");
    try {
      const decodedData = decodeURIComponent(crosswordOverride);
      return {
        isOverride: true,
        content: decodedData,
        date: new Date().toISOString().slice(0, 10) // Use today's date for display
      };
    } catch (error) {
      console.error("Error decoding crossword override data:", error);
      // Fall back to normal puzzle loading
    }
  }
  
  // Normal puzzle loading - find latest available
  const puzzleDate = await findLatestPuzzle();
  return {
    isOverride: false,
    date: puzzleDate
  };
}

// Function to find the latest available puzzle file
async function findLatestPuzzle() {
  const currentDate = new Date();
  
  // Try up to 30 days back
  for (let i = 0; i < 30; i++) {
    const testDate = new Date(currentDate);
    testDate.setDate(currentDate.getDate() - i);
    const dateString = testDate.toISOString().slice(0, 10);
    
    try {
      const response = await fetch(`${lang}/${dateString}.txt`);
      if (response.ok) {
        console.log(`Found puzzle file for date: ${dateString}`);
        return dateString;
      }
    } catch (error) {
      console.log(`No puzzle file found for ${dateString}`);
    }
  }
  
  // Fallback to today's date if nothing found
  return currentDate.toISOString().slice(0, 10);
}
