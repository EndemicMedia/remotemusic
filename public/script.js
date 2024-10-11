let currentTrack = 0;
let isPlaying = false;
let playlist = [];
let sortType = 'alphabetical';
let sortOrder = 'ascending';

const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playlistContainer = document.getElementById('playlist');
const sortTypeToggle = document.getElementById('sortTypeToggle');
const sortOrderToggle = document.getElementById('sortOrderToggle');

function loadTrack(index) {
    if (index >= 0 && index < playlist.length) {
        currentTrack = index;
        audio.src = playlist[currentTrack].path;
        audio.load();
        if (isPlaying) {
            audio.play();
        }
        updatePlaylist();
    }
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = 'Play';
    } else {
        audio.play();
        playBtn.textContent = 'Pause';
    }
    isPlaying = !isPlaying;
}

function nextTrack() {
    loadTrack((currentTrack + 1) % playlist.length);
}

function prevTrack() {
    loadTrack((currentTrack - 1 + playlist.length) % playlist.length);
}

function updatePlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = track.name;
        li.classList.toggle('active', index === currentTrack);
        li.addEventListener('click', () => loadTrack(index));
        playlistContainer.appendChild(li);
    });
}

function sortPlaylist() {
    if (sortType === 'alphabetical') {
        playlist.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        playlist.sort((a, b) => a.createdAt - b.createdAt);
    }

    if (sortOrder === 'descending') {
        playlist.reverse();
    }

    updatePlaylist();
}

function toggleSortType() {
    sortType = sortType === 'alphabetical' ? 'date' : 'alphabetical';
    sortTypeToggle.innerHTML = sortType === 'alphabetical' ? '<i class="fas fa-sort-alpha-down"></i>' : '<i class="fas fa-calendar-alt"></i>';
    sortPlaylist();
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'ascending' ? 'descending' : 'ascending';
    sortOrderToggle.innerHTML = sortOrder === 'ascending' ? '<i class="fas fa-sort-amount-down"></i>' : '<i class="fas fa-sort-amount-up"></i>';
    sortPlaylist();
}

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
sortTypeToggle.addEventListener('click', toggleSortType);
sortOrderToggle.addEventListener('click', toggleSortOrder);

audio.addEventListener('ended', nextTrack);

fetch('/tracks')
    .then(response => response.json())
    .then(data => {
        playlist = data;
        sortPlaylist();
        loadTrack(0);
    });