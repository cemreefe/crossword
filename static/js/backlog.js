async function findAvailableDaysInFuture() {
  const currentDate = new Date();
  let availableDays = 0;
  let latestDate = null;
  
  // Try up to 30 days in the future
  for (let i = 0; i < 30; i++) {
    const testDate = new Date(currentDate);
    testDate.setDate(currentDate.getDate() + i + 1);
    const dateString = testDate.toISOString().slice(0, 10);
    
    try {
      const response = await fetch(`${lang}/${dateString}.txt`);
      if (response.ok) {
        console.log(`Found puzzle file for date: ${dateString}`);
        if (!latestDate) {
          latestDate = dateString;
        }
        availableDays++;
      } else {
        // 404 or other error response - stop checking
        console.log(`No puzzle file found for ${dateString} (${response.status})`);
        break;
      }
    } catch (error) {
      // Network error - stop checking
      console.log(`Network error checking ${dateString}:`, error);
      break;
    }
  }
  
  return availableDays;
}

// Function to update the backlog indicator
function updateBacklogIndicator(days) {
  const backlogElement = document.getElementById("backlogIndicator");
  if (backlogElement) {
    // Get the appropriate localized message
    const localizationKey = days === 1 ? 'backlogSingular' : 'backlogPlural';
    const messageTemplate = window.localizationData?.[localizationKey];
    console.log(`Localization message for backlog: ${messageTemplate}`);
    console.log(`Available days in future: ${days}`);
    console.log(`Backlog element found: ${backlogElement}`);
    console.log(`Backlog element text content before update: ${window.localizationData}`);
  
    // Replace the placeholder with the actual count
    const message = messageTemplate.replace('{count}', days);
    
    backlogElement.textContent = message;
    backlogElement.style.display = 'block';
  }
}
