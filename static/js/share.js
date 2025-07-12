// Share result function for mobile
async function shareResult() {
  try {
    // Get the final time from the modal
    const finalTimeText = document.getElementById("finalTime").textContent;
    
    // Get localized strings (with fallbacks)
    const shareTitle = window.localizationData?.title || 'Dutluk Mini Bulmaca';
    const shareTextTemplate = window.localizationData?.shareText || 'I solved today\'s Dutluk Mini Crossword in {time}!';
    const playAt = window.localizationData?.playAt || 'Play at';
    
    // Format the share text by replacing the placeholder
    const shareText = shareTextTemplate.replace('{time}', finalTimeText);
    
    // Create share data
    const shareData = {
      title: shareTitle,
      text: `${shareText} 🎉\n\n${playAt}: https://bulmaca.dutl.uk`,
    };

    // Check if Web Share API is supported
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      console.log('Content shared successfully');
    } else {
      // Fallback for devices that don't support Web Share API
      fallbackShare(shareData);
    }
  } catch (error) {
    console.log('Error sharing:', error);
    // Fallback if sharing fails
    const shareTitle = window.localizationData?.title || 'Dutluk Mini Bulmaca';
    const shareTextTemplate = window.localizationData?.shareText || 'I solved today\'s Dutluk Mini Crossword in {time}!';
    const playAt = window.localizationData?.playAt || 'Play at';
    
    // Format the share text by replacing the placeholder
    const shareText = shareTextTemplate.replace('{time}', document.getElementById("finalTime").textContent);
    
    fallbackShare({
      title: shareTitle,
      text: `${shareText} 🎉\n\n${playAt}: https://bulmaca.dutl.uk`,
    });
  }
}

// Fallback share function for unsupported devices
function fallbackShare(shareData) {
  // Try to copy to clipboard
  const shareText = `${shareData.text}`;
  const clipboardMessage = window.localizationData?.shareTextCopied || 'Share text copied to clipboard!';
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareText).then(() => {
      alert(clipboardMessage);
    }).catch(() => {
      // If clipboard fails, show the text to copy manually
      showShareText(shareText);
    });
  } else {
    // Show the text to copy manually
    showShareText(shareText);
  }
}

// Show share text for manual copying
function showShareText(text) {
  const copyText = window.localizationData?.copyTextToShare || 'Copy this text to share:';
  const closeText = window.localizationData?.close || 'Close';
  
  const shareModal = document.createElement('div');
  shareModal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; justify-content: center;
    align-items: center; z-index: 2000; backdrop-filter: blur(7px);
  `;
  
  const shareContent = document.createElement('div');
  shareContent.style.cssText = `
    background: white; padding: 2rem; border-radius: 8px; text-align: center;
    max-width: 90%; word-wrap: break-word;
  `;
  
  shareContent.innerHTML = `
    <h3>${copyText}</h3>
    <textarea readonly style="width: 100%; height: 100px; margin: 1rem 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${text}</textarea>
    <button onclick="this.parentElement.parentElement.remove()" style="background: #007AFF; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">${closeText}</button>
  `;
  
  shareModal.appendChild(shareContent);
  document.body.appendChild(shareModal);
  
  // Select the text in the textarea
  const textarea = shareContent.querySelector('textarea');
  textarea.focus();
  textarea.select();
}
