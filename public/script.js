let currentSongIndex = 0;
let songs = [];
let isPlaying = false;
let sortType = 'alpha'; // 'alpha' or 'date'
let sortOrder = 'asc'; // 'asc' or 'desc'

const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentSong = document.getElementById('currentSong');
const playlist = document.getElementById('playlist');
const sortTypeToggle = document.getElementById('sortTypeToggle');
const sortOrderToggle = document.getElementById('sortOrderToggle');

function loadSongs() {
    fetch('/songs')
        .then(response => response.json())
        .then(data => {
            songs = data;
            updatePlaylist();
        });
}

function updatePlaylist() {
    playlist.innerHTML = '';
    const sortedSongs = sortSongs(songs);
    sortedSongs.forEach((song, index) => {
        const li = document.createElement('li');
        li.textContent = song.name;
        li.addEventListener('click', () => playSong(index));
        playlist.appendChild(li);
    });
}

function sortSongs(songsArray) {
    return songsArray.sort((a, b) => {
        if (sortType === 'alpha') {
            const comparison = a.name.localeCompare(b.name);
            return sortOrder === 'asc' ? comparison : -comparison;
        } else {
            const comparison = new Date(a.createdAt) - new Date(b.createdAt);
            return sortOrder === 'asc' ? comparison : -comparison;
        }
    });
}

function playSong(index) {
    currentSongIndex = index;
    const song = songs[currentSongIndex];
    audio.src = `/songs/${song.filename}`;
    currentSong.textContent = song.name;
    audio.play();
    isPlaying = true;
    updatePlayButton();
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
    isPlaying = !isPlaying;
    updatePlayButton();
}

function updatePlayButton() {
    playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function playNext() {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
}

function playPrevious() {
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(currentSongIndex);
}

function toggleSortType() {
    sortType = sortType === 'alpha' ? 'date' : 'alpha';
    sortTypeToggle.innerHTML = sortType === 'alpha' ? '<i class="fas fa-sort-alpha-down"></i>' : '<i class="fas fa-calendar-alt"></i>';
    updatePlaylist();
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    sortOrderToggle.innerHTML = sortOrder === 'asc' ? '<i class="fas fa-sort-amount-down"></i>' : '<i class="fas fa-sort-amount-up"></i>';
    updatePlaylist();
}

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrevious);
nextBtn.addEventListener('click', playNext);
sortTypeToggle.addEventListener('click', toggleSortType);
sortOrderToggle.addEventListener('click', toggleSortOrder);

audio.addEventListener('ended', playNext);

loadSongs();