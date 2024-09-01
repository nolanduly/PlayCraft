// static/js/main.js

let currentPlay = null;
let plays = [];
let playCallSheet = {};
let isDirectoryView = true;
let originalImageSize = { width: 0, height: 0 };
let currentAnnotations = [];

function toggleView() {
    isDirectoryView = !isDirectoryView;
    const playList = document.getElementById('playListContent');
    if (isDirectoryView) {
        displayPlays();
    } else {
        displaySearchResults();
    }
    document.getElementById('toggleViewButton').textContent = isDirectoryView ? 'Switch to Search View' : 'Switch to Directory View';
}

function displayPlays() {
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    if (plays.length === 0) {
        playList.innerHTML = '<p>No plays found</p>';
        return;
    }

    const playTree = buildPlayTree(plays);
    displayPlayTree(playTree, playList, 0);
}

function displaySearchResults() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    
    const filteredPlays = plays.filter(play => 
        play.name.toLowerCase().includes(searchTerm) ||
        play.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        (play.notes && play.notes.toLowerCase().includes(searchTerm))
    );

    filteredPlays.forEach(play => {
        const playElement = createPlayElement(play, 0);
        playList.appendChild(playElement);
    });
}

function createPlayElement(play, level) {
    const playElement = document.createElement('div');
    playElement.className = 'directory-item play-item';
    playElement.textContent = play.name;
    playElement.style.paddingLeft = `${(level + 1) * 20}px`;
    playElement.setAttribute('data-play-id', play.path);
    playElement.onclick = () => loadPlay(play);
    playElement.draggable = true;
    playElement.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', play.path);
    };
    return playElement;
}

function updatePlayCallSheetDisplay() {
    const down = document.getElementById('downSlider').value;
    const distance = document.getElementById('distanceSlider').value;
    const fieldPosition = document.getElementById('fieldPositionSlider').value;

    const distanceCategory = distance <= 3 ? 'Short' : distance <= 7 ? 'Medium' : 'Long';
    const fieldPositionCategory = fieldPosition <= 20 ? 'Own20' : 
                                  fieldPosition <= 40 ? 'Own40' : 
                                  fieldPosition <= 60 ? 'Mid' : 
                                  fieldPosition <= 80 ? 'Opp40' : 'RedZone';

    const situationKey = `${down}_${distanceCategory}_${fieldPositionCategory}`;
    const playCallSheetPlays = document.getElementById('playCallSheetPlays');
    playCallSheetPlays.innerHTML = '';

    if (playCallSheet[situationKey]) {
        playCallSheet[situationKey].forEach(play => {
            const playElement = createPlayElement(play);
            playCallSheetPlays.appendChild(playElement);
        });
    }
}

function initPlayCallSheet() {
    const situations = ['1st', '2nd', '3rd', '4th'];
    const distances = ['Short', 'Medium', 'Long'];
    const fieldPositions = ['Own20', 'Own40', 'Mid', 'Opp40', 'RedZone'];

    situations.forEach(down => {
        distances.forEach(distance => {
            fieldPositions.forEach(position => {
                const key = `${down}_${distance}_${position}`;
                playCallSheet[key] = [];
            });
        });
    });
}

function loadPlaybook() {
    const school = document.getElementById('schoolInput').value.trim();
    if (!school) {
        alert("Please enter a school name");
        return;
    }
    console.log(`Loading playbook for school: ${school}`);
    
    fetch('/load_playbook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `school=${encodeURIComponent(school)}`
    })
    .then(response => {
        console.log('Received response from server');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Parsed JSON data:', data);
        if (data.error) {
            throw new Error(data.error);
        }
        plays = data.map(play => ({
            ...play,
            annotations: null,
            notes: '',
            tags: []
        }));
        displayPlays();
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message || "Failed to load playbook. Please check the console for more details.");
    });
}

function buildPlayTree(plays) {
    const tree = {};
    plays.forEach(play => {
        const parts = play.directory.split('/').filter(part => part !== '');
        let currentLevel = tree;
        parts.forEach((part, index) => {
            if (!currentLevel[part]) {
                currentLevel[part] = index === parts.length - 1 ? { plays: [] } : {};
            }
            currentLevel = currentLevel[part];
        });
        if (!currentLevel.plays) {
            currentLevel.plays = [];
        }
        currentLevel.plays.push(play);
    });
    return tree;
}

function displayPlays() {
    console.log('Displaying plays:', plays);
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    if (plays.length === 0) {
        playList.innerHTML = '<p>No plays found</p>';
        return;
    }

    const playTree = buildPlayTree(plays);
    displayPlayTree(playTree, playList, 0);
}

function displayPlayTree(node, parentElement, level) {
    for (const [key, value] of Object.entries(node)) {
        if (key === 'plays') {
            value.forEach(play => {
                const playElement = createPlayElement(play, level);
                parentElement.appendChild(playElement);
            });
        } else {
            const folderElement = document.createElement('div');
            folderElement.className = 'directory-item';
            folderElement.style.paddingLeft = `${level * 20}px`;
            folderElement.textContent = key;
            parentElement.appendChild(folderElement);
            displayPlayTree(value, parentElement, level + 1);
        }
    }
}

function createPlayElement(play, level) {
    const playElement = document.createElement('div');
    playElement.className = 'directory-item play-item';
    playElement.textContent = play.name;
    playElement.style.paddingLeft = `${(level + 1) * 20}px`;
    playElement.setAttribute('data-play-id', play.path);
    playElement.onclick = () => loadPlay(play);
    playElement.draggable = true;
    playElement.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', play.path);
    };
    return playElement;
}

function loadPlay(play) {
    currentPlay = play;
    const playImage = document.getElementById('playImage');
    const playImageContainer = document.getElementById('playImageContainer');
    
    playImageContainer.setAttribute('data-message', 'Loading...');
    
    playImage.onload = function() {
        playImageContainer.removeAttribute('data-message');
        originalImageSize = { width: playImage.naturalWidth, height: playImage.naturalHeight };
        resizeCanvas();
        loadPlayData();
    };
    
    playImage.onerror = function() {
        playImageContainer.setAttribute('data-message', 'Failed to load image');
        console.error(`Failed to load image: ${play.path}`);
    };
    
    playImage.src = play.path;
    displayPlayDetails();
}

function resizeCanvas() {
    const playImage = document.getElementById('playImage');
    const annotationCanvas = document.getElementById('annotationCanvas');
    const container = document.getElementById('playImageContainer');

    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const imageAspectRatio = originalImageSize.width / originalImageSize.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let width, height;
    if (imageAspectRatio > containerAspectRatio) {
        width = containerWidth;
        height = containerWidth / imageAspectRatio;
    } else {
        height = containerHeight;
        width = containerHeight * imageAspectRatio;
    }

    playImage.style.width = `${width}px`;
    playImage.style.height = `${height}px`;
    annotationCanvas.width = width;
    annotationCanvas.height = height;

    redrawAnnotations();
}


function displayPlayDetails() {
    document.getElementById('playbook').textContent = currentPlay.playbook || '';
    document.getElementById('formation').textContent = currentPlay.formation || '';
    document.getElementById('alignment').textContent = currentPlay.alignment || '';
    document.getElementById('playName').textContent = currentPlay.name || '';
    document.getElementById('autoPlayType').textContent = currentPlay.auto_play_type || 'Not set';
    
    document.getElementById('playNotes').value = currentPlay.notes || '';
    displayTags();
}

function loadPlayData() {
    if (currentPlay.annotations) {
        loadAnnotations(currentPlay.annotations);
    } else {
        clearAnnotations();
    }
    document.getElementById('playNotes').value = currentPlay.notes || '';
    displayTags();
}

function saveGamePlan() {
    const name = document.getElementById('gamePlanNameInput').value.trim();
    if (!name) {
        alert("Please enter a game plan name");
        return;
    }

    const scenarios = {};
    document.querySelectorAll('.scenario').forEach(scenarioDiv => {
        const scenarioName = scenarioDiv.getAttribute('data-scenario');
        const scenarioPlays = Array.from(scenarioDiv.querySelectorAll('.play-item')).map(playElement => {
            const playId = playElement.getAttribute('data-play-id');
            return plays.find(p => p.path === playId);
        });
        scenarios[scenarioName] = scenarioPlays;
    });

    const gamePlan = {
        name: name,
        plays: plays,
        scenarios: scenarios
    };

    fetch('/save_game_plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(gamePlan)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
        } else {
            alert("Failed to save game plan");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while saving the game plan");
    });
}

function loadGamePlan() {
    const name = document.getElementById('gamePlanNameInput').value.trim();
    if (!name) {
        alert("Please enter a game plan name to load");
        return;
    }

    fetch('/load_game_plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `name=${encodeURIComponent(name)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            plays = data.plays;
            
            // Update scenarios in play call sheet
            Object.entries(data.scenarios).forEach(([scenarioName, scenarioPlays]) => {
                const scenarioDiv = document.querySelector(`.scenario[data-scenario="${scenarioName}"]`);
                if (scenarioDiv) {
                    const scenarioPlaysDiv = scenarioDiv.querySelector('.scenario-plays');
                    scenarioPlaysDiv.innerHTML = '';
                    scenarioPlays.forEach(play => {
                        const playElement = createPlayElement(play);
                        scenarioPlaysDiv.appendChild(playElement);
                    });
                }
            });
            
            updatePlayCallSheet();
            displayPlays();
            if (plays.length > 0) {
                loadPlay(plays[0]);
            }
            alert(`Game plan "${name}" loaded successfully`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while loading the game plan");
    });
}

// Update the displayPlays function to show selected plays
function displayPlays() {
    console.log('Displaying plays:', plays);
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    if (plays.length === 0) {
        playList.innerHTML = '<p>No plays found</p>';
        return;
    }

    const playTree = buildPlayTree(plays);
    displayPlayTree(playTree, playList);
}

function displayPlayTree(node, parentElement, level = 0) {
    for (const [key, value] of Object.entries(node)) {
        if (key === 'plays') {
            value.forEach(play => {
                const div = document.createElement('div');
                div.textContent = play.name;
                div.onclick = () => loadPlay(play);
                div.style.paddingLeft = `${level * 20}px`;
                if (play === currentPlay) {
                    div.classList.add('selected');
                }
                if (play.selected) {
                    div.classList.add('in-game-plan');
                }
                parentElement.appendChild(div);
            });
        } else {
            const div = document.createElement('div');
            div.textContent = key;
            div.style.paddingLeft = `${level * 20}px`;
            div.style.fontWeight = 'bold';
            parentElement.appendChild(div);
            displayPlayTree(value, parentElement, level + 1);
        }
    }
}

function loadPlayData() {
    if (currentPlay.annotations) {
        loadAnnotations(currentPlay.annotations);
    } else {
        clearAnnotations();
    }
    document.getElementById('playNotes').value = currentPlay.notes || '';
    displayTags();
}





function saveNotes() {
    if (currentPlay) {
        currentPlay.notes = document.getElementById('playNotes').value;
    }
}

function addTag() {
    if (currentPlay) {
        const tagInput = document.getElementById('tagInput');
        const tag = tagInput.value.trim();
        if (tag && !currentPlay.tags.includes(tag)) {
            currentPlay.tags.push(tag);
            displayTags();
            tagInput.value = '';
        }
    }
}

function removeTag(tag) {
    if (currentPlay) {
        currentPlay.tags = currentPlay.tags.filter(t => t !== tag);
        displayTags();
    }
}

function displayTags() {
    const tagList = document.getElementById('tagList');
    tagList.innerHTML = '';
    if (currentPlay && currentPlay.tags) {
        currentPlay.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag');
            tagElement.textContent = tag;
            const removeButton = document.createElement('button');
            removeButton.textContent = 'x';
            removeButton.onclick = () => removeTag(tag);
            tagElement.appendChild(removeButton);
            tagList.appendChild(tagElement);
        });
    }
}

let playCallSheetVisible = false;

function togglePlayCallSheet() {
    const playList = document.getElementById('playList');
    const playCallSheet = document.getElementById('playCallSheet');
    playCallSheetVisible = !playCallSheetVisible;
    
    if (playCallSheetVisible) {
        playList.style.display = 'none';
        playCallSheet.style.display = 'block';
        updatePlayCallSheet();
    } else {
        playList.style.display = 'block';
        playCallSheet.style.display = 'none';
    }
}

function updatePlayCallSheet() {
    const tagFilters = document.getElementById('tagFilters');
    tagFilters.innerHTML = '';
    
    // Get all unique tags
    const allTags = new Set();
    plays.forEach(play => {
        play.tags.forEach(tag => allTags.add(tag));
    });
    
    // Create tag filter buttons
    allTags.forEach(tag => {
        const button = document.createElement('button');
        button.textContent = tag;
        button.onclick = () => filterPlaysByTag(tag);
        tagFilters.appendChild(button);
    });
    
    // Update scenario sections
    document.querySelectorAll('.scenario').forEach(scenarioDiv => {
        const scenarioPlays = scenarioDiv.querySelector('.scenario-plays');
        scenarioPlays.innerHTML = '';
        
        // Add draggable play elements
        plays.forEach(play => {
            const playElement = createPlayElement(play);
            scenarioPlays.appendChild(playElement);
        });
        
        // Make plays sortable within scenarios
        new Sortable(scenarioPlays, {
            group: 'shared',
            animation: 150
        });
    });
}

function createPlayElement(play) {
    const playElement = document.createElement('div');
    playElement.className = 'play-item';
    playElement.textContent = play.name;
    playElement.setAttribute('data-play-id', play.path);
    playElement.onclick = () => loadPlay(play);
    return playElement;
}

function filterPlaysByTag(tag) {
    document.querySelectorAll('.play-item').forEach(playElement => {
        const playId = playElement.getAttribute('data-play-id');
        const play = plays.find(p => p.path === playId);
        if (play && play.tags.includes(tag)) {
            playElement.style.display = 'block';
        } else {
            playElement.style.display = 'none';
        }
    });
}

const canvas = document.getElementById('annotationCanvas');
const ctx = canvas.getContext('2d');

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);





function redrawAnnotations() {
    const canvas = document.getElementById('annotationCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / originalImageSize.width;
    const scaleY = canvas.height / originalImageSize.height;

    currentAnnotations.forEach(annotation => {
        ctx.beginPath();
        ctx.moveTo(annotation.startX * scaleX, annotation.startY * scaleY);
        ctx.lineTo(annotation.endX * scaleX, annotation.endY * scaleY);
        ctx.strokeStyle = annotation.color;
        ctx.lineWidth = annotation.lineWidth * ((scaleX + scaleY) / 2); // Average scale for line width
        ctx.lineCap = 'round';
        ctx.stroke();
    });
}

function startDrawing(e) {
    isDrawing = true;
    const canvas = document.getElementById('annotationCanvas');
    const rect = canvas.getBoundingClientRect();
    lastX = (e.clientX - rect.left) * (originalImageSize.width / canvas.width);
    lastY = (e.clientY - rect.top) * (originalImageSize.height / canvas.height);
}

function draw(e) {
    if (!isDrawing) return;
    const canvas = document.getElementById('annotationCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (originalImageSize.width / canvas.width);
    const y = (e.clientY - rect.top) * (originalImageSize.height / canvas.height);

    ctx.beginPath();
    ctx.moveTo(lastX * (canvas.width / originalImageSize.width), lastY * (canvas.height / originalImageSize.height));
    ctx.lineTo(x * (canvas.width / originalImageSize.width), y * (canvas.height / originalImageSize.height));
    ctx.strokeStyle = document.getElementById('annotationColor').value;
    ctx.lineWidth = document.getElementById('annotationSize').value * ((canvas.width / originalImageSize.width + canvas.height / originalImageSize.height) / 2);
    ctx.lineCap = 'round';
    ctx.stroke();

    currentAnnotations.push({
        startX: lastX,
        startY: lastY,
        endX: x,
        endY: y,
        color: ctx.strokeStyle,
        lineWidth: document.getElementById('annotationSize').value
    });

    lastX = x;
    lastY = y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveAnnotations();
    }
}

function clearAnnotations() {
    const canvas = document.getElementById('annotationCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentAnnotations = [];
    if (currentPlay) {
        currentPlay.annotations = [];
    }
}

function saveAnnotations() {
    if (currentPlay) {
        currentPlay.annotations = currentAnnotations;
    }
}

function loadAnnotations(annotations) {
    currentAnnotations = annotations || [];
    redrawAnnotations();
}

// function startDrawing(e) {
//     isDrawing = true;
//     [lastX, lastY] = [e.offsetX, e.offsetY];
// }

// function startDrawing(e) {
//     isDrawing = true;
//     draw(e);
// }

// function draw(e) {
//     if (!isDrawing) return;
//     const ctx = document.getElementById('annotationCanvas').getContext('2d');
//     const rect = e.target.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
    
//     ctx.lineWidth = document.getElementById('annotationSize').value;
//     ctx.lineCap = 'round';
//     ctx.strokeStyle = document.getElementById('annotationColor').value;

//     ctx.lineTo(x, y);
//     ctx.stroke();
//     ctx.beginPath();
//     ctx.moveTo(x, y);
// }

// function stopDrawing() {
//     isDrawing = false;
//     document.getElementById('annotationCanvas').getContext('2d').beginPath();
//     saveAnnotations();
// }

function initPlayCallSheet() {
    const situations = ['1st', '2nd', '3rd', '4th'];
    const distances = ['Short', 'Medium', 'Long'];
    const fieldPositions = ['Own20', 'Own40', 'Mid', 'Opp40', 'RedZone'];

    situations.forEach(down => {
        distances.forEach(distance => {
            fieldPositions.forEach(position => {
                const key = `${down}_${distance}_${position}`;
                playCallSheet[key] = [];
            });
        });
    });
}

function updateSituationDisplay() {
    const down = document.getElementById('downSlider').value;
    const distance = document.getElementById('distanceSlider').value;
    const fieldPosition = document.getElementById('fieldPositionSlider').value;

    document.getElementById('downValue').textContent = down;
    document.getElementById('distanceValue').textContent = distance;
    document.getElementById('fieldPositionValue').textContent = fieldPosition;

    updatePlayCallSheetDisplay();
}

function updatePlayCallSheetDisplay() {
    const down = document.getElementById('downSlider').value;
    const distance = document.getElementById('distanceSlider').value;
    const fieldPosition = document.getElementById('fieldPositionSlider').value;

    const distanceCategory = distance <= 3 ? 'Short' : distance <= 7 ? 'Medium' : 'Long';
    const fieldPositionCategory = fieldPosition <= 20 ? 'Own20' : 
                                  fieldPosition <= 40 ? 'Own40' : 
                                  fieldPosition <= 60 ? 'Mid' : 
                                  fieldPosition <= 80 ? 'Opp40' : 'RedZone';

    const situationKey = `${down}_${distanceCategory}_${fieldPositionCategory}`;
    const playCallSheetPlays = document.getElementById('playCallSheetPlays');
    playCallSheetPlays.innerHTML = '';

    playCallSheet[situationKey].forEach(play => {
        const playElement = createPlayElement(play, true);
        playCallSheetPlays.appendChild(playElement);
    });
}

function createPlayElement(play, isCallSheet = false) {
    const playElement = document.createElement('div');
    playElement.className = 'play-item';
    playElement.textContent = play.name;
    playElement.setAttribute('data-play-id', play.path);
    playElement.onclick = () => loadPlay(play);
    
    if (!isCallSheet) {
        playElement.draggable = true;
        playElement.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', play.path);
        };
    }
    
    return playElement;
}

function displayPlays() {
    console.log('Displaying plays:', plays);
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    if (plays.length === 0) {
        playList.innerHTML = '<p>No plays found</p>';
        return;
    }

    const playTree = buildPlayTree(plays);
    displayPlayTree(playTree, playList);
}

function searchPlays() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredPlays = plays.filter(play => 
        play.name.toLowerCase().includes(searchTerm) ||
        play.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        (play.notes && play.notes.toLowerCase().includes(searchTerm))
    );
    
    const playList = document.getElementById('playListContent');
    playList.innerHTML = '';
    filteredPlays.forEach(play => {
        const playElement = createPlayElement(play);
        playList.appendChild(playElement);
    });
}

function saveGamePlan() {
    const name = document.getElementById('gamePlanNameInput').value.trim();
    if (!name) {
        alert("Please enter a game plan name");
        return;
    }

    const gamePlan = {
        name: name,
        plays: plays,
        playCallSheet: playCallSheet
    };

    fetch('/save_game_plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(gamePlan)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message);
        } else {
            alert("Failed to save game plan");
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while saving the game plan");
    });
}

function loadGamePlan() {
    const name = document.getElementById('gamePlanNameInput').value.trim();
    if (!name) {
        alert("Please enter a game plan name to load");
        return;
    }

    fetch('/load_game_plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `name=${encodeURIComponent(name)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            plays = data.plays;
            playCallSheet = data.playCallSheet;
            displayPlays();
            updatePlayCallSheetDisplay();
            if (plays.length > 0) {
                loadPlay(plays[0]);
            }
            alert(`Game plan "${name}" loaded successfully`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("An error occurred while loading the game plan");
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', (event) => {
    console.log("DOM fully loaded and parsed");
    initPlayCallSheet();
    
    const sliders = ['downSlider', 'distanceSlider', 'fieldPositionSlider'];
    sliders.forEach(sliderId => {
        document.getElementById(sliderId).addEventListener('input', updateSituationDisplay);
    });

    const playCallSheetPlays = document.getElementById('playCallSheetPlays');
    playCallSheetPlays.ondragover = (e) => e.preventDefault();
    playCallSheetPlays.ondrop = (e) => {
        e.preventDefault();
        const playPath = e.dataTransfer.getData('text');
        const play = plays.find(p => p.path === playPath);
        if (play) {
            const down = document.getElementById('downSlider').value;
            const distance = document.getElementById('distanceSlider').value;
            const fieldPosition = document.getElementById('fieldPositionSlider').value;
            
            const distanceCategory = distance <= 3 ? 'Short' : distance <= 7 ? 'Medium' : 'Long';
            const fieldPositionCategory = fieldPosition <= 20 ? 'Own20' : 
                                          fieldPosition <= 40 ? 'Own40' : 
                                          fieldPosition <= 60 ? 'Mid' : 
                                          fieldPosition <= 80 ? 'Opp40' : 'RedZone';
            
            const situationKey = `${down}_${distanceCategory}_${fieldPositionCategory}`;
            
            if (!playCallSheet[situationKey]) {
                playCallSheet[situationKey] = [];
            }
            
            if (!playCallSheet[situationKey].some(p => p.path === play.path)) {
                playCallSheet[situationKey].push(play);
                updatePlayCallSheetDisplay();
            }
        }
    };
    

    document.getElementById('toggleViewButton').addEventListener('click', toggleView);
    document.getElementById('searchInput').addEventListener('input', () => {
        if (!isDirectoryView) {
            displaySearchResults();
        }
    });

    const annotationCanvas = document.getElementById('annotationCanvas');
    annotationCanvas.addEventListener('mousedown', startDrawing);
    annotationCanvas.addEventListener('mousemove', draw);
    annotationCanvas.addEventListener('mouseup', stopDrawing);
    annotationCanvas.addEventListener('mouseout', stopDrawing);

    window.addEventListener('resize', resizeCanvas);

    document.getElementById('autoPlayTypeButton').addEventListener('click', autoPlayType);
    document.getElementById('playNotes').addEventListener('input', saveNotes);
    document.getElementById('tagInput').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            addTag();
        }
    });

    document.getElementById('searchInput').addEventListener('input', searchPlays);

    // Load playbook button
    document.querySelector('button[onclick="loadPlaybook()"]').addEventListener('click', loadPlaybook);

    // Save game plan button
    document.querySelector('button[onclick="saveGamePlan()"]').addEventListener('click', saveGamePlan);

    // Load game plan button
    document.querySelector('button[onclick="loadGamePlan()"]').addEventListener('click', loadGamePlan);

    // Clear annotations button
    document.querySelector('button[onclick="clearAnnotations()"]').addEventListener('click', clearAnnotations);

    // Add tag button
    document.querySelector('button[onclick="addTag()"]').addEventListener('click', addTag);
});

// Initialize the play call sheet
function initPlayCallSheet() {
    const situations = ['1st', '2nd', '3rd', '4th'];
    const distances = ['Short', 'Medium', 'Long'];
    const fieldPositions = ['Own20', 'Own40', 'Mid', 'Opp40', 'RedZone'];

    situations.forEach(down => {
        distances.forEach(distance => {
            fieldPositions.forEach(position => {
                const key = `${down}_${distance}_${position}`;
                playCallSheet[key] = [];
            });
        });
    });
}

// Function to update the situation display
function updateSituationDisplay() {
    const down = document.getElementById('downSlider').value;
    const distance = document.getElementById('distanceSlider').value;
    const fieldPosition = document.getElementById('fieldPositionSlider').value;

    document.getElementById('downValue').textContent = down;
    document.getElementById('distanceValue').textContent = distance;
    document.getElementById('fieldPositionValue').textContent = fieldPosition;

    updatePlayCallSheetDisplay();
}


// Initialize the application
initPlayCallSheet();
resizeCanvas();

// If you have any global variables or settings, you can set them here
// For example:
// let globalSetting = 'some value';

// End of the JavaScript file