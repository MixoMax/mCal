const API_BASE_URL = 'http://localhost:8000';
let lastProcessedClipboardText = '';
let lastProcessedClipboardImage = ''; // Store as data URL to detect changes

let currentPreviewText = null; // Text currently shown in preview
let currentPreviewImageBase64 = null; // Base64 of image currently shown in preview (without data: prefix)

let currentAiProposals = [];
let currentAiProposalIndex = -1; // Index for the proposals array

// DOM Elements
const mainImg = document.getElementById("main-img");
const textPreview = document.getElementById("text-preview");
const clipboardPreviewContainer = document.getElementById("clipboardPreviewContainer");
const sendPreviewToAIBtn = document.getElementById("sendPreviewToAIBtn");
const noNewContentMsg = document.getElementById("noNewContentMsg");

const aiSuggestionDisplay = document.getElementById("aiSuggestionDisplay");
const aiSuggestionJson = document.getElementById("aiSuggestionJson");
const acceptDirectSuggestionBtn = document.getElementById("acceptDirectSuggestionBtn");
const denyDirectSuggestionBtn = document.getElementById("denyDirectSuggestionBtn");

const aiProposalModal = document.getElementById("aiProposalModal");
const aiProposalTitle = document.getElementById("aiProposalTitle");
const aiProposalDetails = document.getElementById("aiProposalDetails");
const aiModalAcceptBtn = document.getElementById("aiModalAcceptBtn");
const aiModalDenyBtn = document.getElementById("aiModalDenyBtn");
const closeAiProposalModalBtn = document.getElementById("closeAiProposalModalBtn");

let pollIntervalId = null;


async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            console.error(`API Error (${response.status}): ${errorData.detail || response.statusText}`);
            throw new Error(`API Error (${response.status}): ${errorData.detail || response.statusText}`);
        }
        if (response.status === 204) return null;
        return response.json();
    } catch (error) {
        console.error('API Request Failed:', error);
        throw error;
    }
}

async function triggerAISuggestionFromPreview() {
    if (!currentPreviewText && !currentPreviewImageBase64) {
        alert("No content to send to AI.");
        return;
    }

    const payload = {
        text: currentPreviewText || "",
        image_b64: currentPreviewImageBase64 || null
    };

    try {
        console.log("Sending previewed content to AI suggest:", payload);
        sendPreviewToAIBtn.textContent = "Processing...";
        sendPreviewToAIBtn.disabled = true;
        aiSuggestionDisplay.style.display = 'none'; 

        const proposalOrProposals = await apiRequest('/events/ai-suggest', 'POST', payload);
        console.log("AI Suggestion received:", proposalOrProposals);

        currentAiProposals = Array.isArray(proposalOrProposals) ? proposalOrProposals : [proposalOrProposals];
        currentAiProposalIndex = 0;


        if (currentAiProposals.length > 0 && Object.keys(currentAiProposals[0]).length > 0) {
            displayInitialAISuggestion();
            clipboardPreviewContainer.style.display = 'none';
            noNewContentMsg.style.display = 'block';
        } else {
            console.log("AI returned empty or invalid proposal(s).");
            alert("The AI could not find an event in the provided content.");
            hideAiSuggestionDisplayAndClearProposals();
        }
    } catch (error) {
        console.error("Failed to get AI suggestion:", error);
        alert(`Failed to get AI suggestion: ${error.message}`);
        hideAiSuggestionDisplayAndClearProposals();
    } finally {
        sendPreviewToAIBtn.textContent = "Get AI Suggestion for this Content";
        sendPreviewToAIBtn.disabled = false;
    }
}

function displayInitialAISuggestion() {
    if (currentAiProposals.length === 0 || currentAiProposalIndex < 0) {
        hideAiSuggestionDisplayAndClearProposals();
        return;
    }
    
    aiSuggestionJson.textContent = JSON.stringify(currentAiProposals[currentAiProposalIndex], null, 2);
    aiSuggestionDisplay.style.display = 'block';
    clipboardPreviewContainer.style.display = 'none'; 
    noNewContentMsg.style.display = 'block';
}

function hideAiSuggestionDisplayAndClearProposals() {
    aiSuggestionDisplay.style.display = 'none';
    currentAiProposals = [];
    currentAiProposalIndex = -1;
}

async function processAcceptSuggestion(proposal) {
    let calendarId;
    try {
        const calendars = await apiRequest('/calendars');
        if (calendars && calendars.length > 0) {
            if (proposal.calendar_name) {
                const foundCalendar = calendars.find(c => c.name.toLowerCase() === proposal.calendar_name.toLowerCase());
                calendarId = foundCalendar ? foundCalendar.id : calendars[0].id;
            } else {
                calendarId = calendars[0].id;
            }
        }

        if (!calendarId) {
            alert("No calendar available. Please create a calendar in the main mCal app.");
            return false; // Indicate failure
        }

        const eventData = {
            title: proposal.title,
            description: proposal.description || null,
            location: proposal.location || null,
            start_time: proposal.start_time || new Date().toISOString(),
            end_time: proposal.end_time || new Date(new Date(proposal.start_time || Date.now()).getTime() + 3600000).toISOString(),
            is_all_day: proposal.is_all_day || false,
            repeat_frequency: proposal.repeat_frequency || 'none',
            repeat_until: proposal.repeat_until || null
        };

        await apiRequest(`/calendars/${calendarId}/events`, 'POST', eventData);
        alert("Event created successfully!");
        return true; // Indicate success
    } catch (error) {
        console.error('Failed to create event from AI suggestion:', error);
        alert(`Failed to create event: ${error.message}`);
        return false; // Indicate failure
    }
}

async function handleDirectAcceptSuggestion() {
    if (currentAiProposals.length === 0 || currentAiProposalIndex < 0) return;
    const proposal = currentAiProposals[currentAiProposalIndex];
    
    await processAcceptSuggestion(proposal); // Await completion, though we proceed regardless of alert

    currentAiProposalIndex++;
    if (currentAiProposalIndex < currentAiProposals.length) {
        openAiProposalModalForNext(); // Show next proposal in modal
    } else {
        hideAiSuggestionDisplayAndClearProposals();
    }
}

function handleDirectDenySuggestion() {
    currentAiProposalIndex++;
    if (currentAiProposalIndex < currentAiProposals.length) {
        openAiProposalModalForNext(); // Show next proposal in modal
    } else {
        hideAiSuggestionDisplayAndClearProposals();
    }
}


function openAiProposalModalForNext() {
    // This function is called when there are subsequent proposals to show in the modal
    if (currentAiProposals.length === 0 || currentAiProposalIndex < 0 || currentAiProposalIndex >= currentAiProposals.length) {
        closeAiProposalModal(); // Should not happen if called correctly
        hideAiSuggestionDisplayAndClearProposals();
        return;
    }

    const proposal = currentAiProposals[currentAiProposalIndex];
    aiProposalDetails.textContent = JSON.stringify(proposal, null, 2);
    aiProposalTitle.textContent = `AI Event Proposal (${currentAiProposalIndex + 1}/${currentAiProposals.length})`;
    
    aiSuggestionDisplay.style.display = 'none'; // Hide direct suggestion UI
    aiProposalModal.style.display = 'flex';
}

function closeAiProposalModal() {
    aiProposalModal.style.display = 'none';
}

async function handleModalAcceptSuggestion() {
    if (currentAiProposals.length === 0 || currentAiProposalIndex < 0) return;
    const proposal = currentAiProposals[currentAiProposalIndex];

    await processAcceptSuggestion(proposal);

    currentAiProposalIndex++;
    if (currentAiProposalIndex < currentAiProposals.length) {
        openAiProposalModalForNext(); // Refresh modal with next proposal
    } else {
        closeAiProposalModal();
        hideAiSuggestionDisplayAndClearProposals();
    }
}

function handleModalDenySuggestion() {
    currentAiProposalIndex++;
    if (currentAiProposalIndex < currentAiProposals.length) {
        openAiProposalModalForNext(); // Refresh modal with next proposal
    } else {
        closeAiProposalModal();
        hideAiSuggestionDisplayAndClearProposals();
    }
}


async function pollClipboard() {
    if (aiProposalModal.style.display === 'flex' || aiSuggestionDisplay.style.display === 'block') {
        return;
    }

    try {
        const clipboardItems = await navigator.clipboard.read();
        let foundNewContentForPreview = false;

        for (const item of clipboardItems) {
            if (item.types.includes("text/plain")) {
                const blob = await item.getType("text/plain");
                const text = await blob.text();
                if (text && text !== lastProcessedClipboardText) {
                    lastProcessedClipboardText = text; 
                    lastProcessedClipboardImage = '';  

                    currentPreviewText = text;
                    currentPreviewImageBase64 = null;

                    textPreview.textContent = text;
                    textPreview.style.display = 'block';
                    mainImg.style.display = 'none';
                    mainImg.src = '';
                    
                    clipboardPreviewContainer.style.display = 'block';
                    sendPreviewToAIBtn.style.display = 'block';
                    noNewContentMsg.style.display = 'none';
                    foundNewContentForPreview = true;
                    break; 
                }
            } else {
                 for (const type of item.types) {
                    if (type.startsWith("image/")) {
                        const blob = await item.getType(type);
                        const reader = new FileReader();
                        const imagePromise = new Promise((resolve, reject) => {
                            reader.onloadend = () => resolve(reader.result);
                            reader.onerror = reject;
                        });
                        reader.readAsDataURL(blob);
                        const dataUrl = await imagePromise;

                        if (dataUrl && dataUrl !== lastProcessedClipboardImage) {
                            lastProcessedClipboardImage = dataUrl; 
                            lastProcessedClipboardText = '';    

                            currentPreviewText = null;
                            currentPreviewImageBase64 = dataUrl.split(',')[1];
                            
                            mainImg.src = dataUrl;
                            mainImg.style.display = 'block';
                            textPreview.style.display = 'none';
                            textPreview.textContent = '';
                            
                            clipboardPreviewContainer.style.display = 'block';
                            sendPreviewToAIBtn.style.display = 'block';
                            noNewContentMsg.style.display = 'none';
                            foundNewContentForPreview = true;
                            break; 
                        }
                    }
                }
            }
            if (foundNewContentForPreview) break;
        }
        
        if (!foundNewContentForPreview && clipboardPreviewContainer.style.display === 'none') {
            noNewContentMsg.style.display = 'block';
        }

    } catch (err) {
        // console.warn('Error reading clipboard for preview: ', err.message);
    }
}

function main() {
    sendPreviewToAIBtn.addEventListener('click', triggerAISuggestionFromPreview);
    
    acceptDirectSuggestionBtn.addEventListener('click', handleDirectAcceptSuggestion);
    denyDirectSuggestionBtn.addEventListener('click', handleDirectDenySuggestion);
    
    aiModalAcceptBtn.addEventListener('click', handleModalAcceptSuggestion);
    aiModalDenyBtn.addEventListener('click', handleModalDenySuggestion);
    closeAiProposalModalBtn.addEventListener('click', () => {
        closeAiProposalModal();
        hideAiSuggestionDisplayAndClearProposals(); // Also clear context if modal is manually closed
    });
    
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "clipboard-read", allowWithoutGesture: true }).then(permissionStatus => {
            if (permissionStatus.state === "granted") {
                pollClipboard(); 
                pollIntervalId = setInterval(pollClipboard, 2000); 
            } else {
                noNewContentMsg.textContent = 'Clipboard permission not granted. Please enable it for AI suggestions, or ensure the popup is focused.';
                noNewContentMsg.style.display = 'block';
                clipboardPreviewContainer.style.display = 'none';
            }
            permissionStatus.onchange = () => {
                if (permissionStatus.state === "granted") {
                   if (!pollIntervalId) { // Start polling only if not already started
                       pollClipboard();
                       pollIntervalId = setInterval(pollClipboard, 2000);
                   }
                } else {
                    if (pollIntervalId) {
                        clearInterval(pollIntervalId);
                        pollIntervalId = null;
                    }
                    noNewContentMsg.textContent = 'Clipboard permission not granted or revoked.';
                    noNewContentMsg.style.display = 'block';
                    clipboardPreviewContainer.style.display = 'none';
                    hideAiSuggestionDisplayAndClearProposals(); // Clear any active suggestion
                }
            };
        }).catch(err => {
            console.error("Error querying clipboard permission:", err);
            noNewContentMsg.textContent = 'Could not query clipboard status. Polling will be attempted if popup is focused.';
            noNewContentMsg.style.display = 'block';
            pollClipboard(); // Attempt initial poll
            pollIntervalId = setInterval(pollClipboard, 2000); // Attempt to set interval
        });
    } else {
        noNewContentMsg.textContent = 'Clipboard permissions API not fully available. Polling will be attempted if popup is focused.';
        noNewContentMsg.style.display = 'block';
        pollClipboard();
        pollIntervalId = setInterval(pollClipboard, 2000);
    }
}

document.addEventListener("DOMContentLoaded", main);
