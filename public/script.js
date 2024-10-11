let currentTrack = 0;
let playlist = [];
let audio = document.getElementById('audio');
let playBtn = document.getElementById('playBtn');
let pauseBtn = document.getElementById('pauseBtn');
let nextBtn = document.getElementById('nextBtn');
let prevBtn = document.getElementById('prevBtn');
let playlistContainer = document.getElementById('playlist');
let sortCriteriaBtn = document.getElementById('sortCriteriaBtn');
let sortOrderBtn = document.getElementById('sortOrderBtn');

let sortCriteria = 'alphabetical';
let sortOrder = 'ascending';

// Event listeners
playBtn.addEventListener('click', playAudio);
pauseBtn.addEventListener('click', pauseAudio);
nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrevious);
sortCriteriaBtn.addEventListener('click', toggleSortCriteria);
sortOrderBtn.addEventListener('click', toggleSortOrder);

function toggleSortCriteria() {
    sortCriteria = sortCriteria === 'alphabetical' ? 'date' : 'alphabetical';
    updateSortCriteriaIcon();
    sortAndDisplayPlaylist();
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'ascending' ? 'descending' : 'ascending';
    updateSortOrderIcon();
    sortAndDisplayPlaylist();
}

function updateSortCriteriaIcon() {
    sortCriteriaBtn.innerHTML = sortCriteria === 'alphabetical' ? 
        '<i class="fas fa-sort-alpha-down"></i>' : 
        '<i class="fas fa-calendar-alt"></i>';
}

function updateSortOrderIcon() {
    sortOrderBtn.innerHTML = sortOrder === 'ascending' ? 
        '<i class="fas fa-sort-amount-down"></i>' : 
        '<i class="fas fa-sort-amount-up"></i>';
}

function sortAndDisplayPlaylist() {
    if (sortCriteria === 'alphabetical') {
        playlist.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        playlist.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    if (sortOrder === 'descending') {
        playlist.reverse();
    }

    displayPlaylist();
}

function displayPlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        let trackElement = document.createElement('div');
        trackElement.textContent = track.name;
        trackElement.addEventListener('click', () => playTrack(index));
        playlistContainer.appendChild(trackElement);
    });
}

function playAudio() {
    audio.play();
}

function pauseAudio() {
    audio.pause();
}

function playNext() {
    currentTrack = (currentTrack + 1) % playlist.length;
    loadTrack();
}

function playPrevious() {
    currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
    loadTrack();
}

function playTrack(index) {
    currentTrack = index;
    loadTrack();
}

function loadTrack() {
    let track = playlist[currentTrack];
    audio.src = track.url;
    audio.play();
}

// Fetch playlist from server
fetch('/playlist')
    .then(response => response.json())
    .then(data => {
        playlist = data;
        sortAndDisplayPlaylist();
    });

// Initial icon setup
updateSortCriteriaIcon();
updateSortOrderIcon();