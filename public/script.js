let ws;
let playlist = [];
let currentTrack = null;
let audioPlayer = new Audio();
let currentFilter = 'all';

// Ensure all functions are defined in the global scope
window.loadFolder = function() {
    const folder = document.getElementById('folderPath').value;
    console.log('Loading folder:', folder);
    ws.send(JSON.stringify({ action: 'loadFolder', folder: folder }));
}

window.play = function(index) {
    console.log('Playing track at index:', index);
    currentTrack = playlist[index];
    audioPlayer.src = currentTrack.path;
    audioPlayer.play();
    updateNowPlaying();
    updateProgressBar();
}

window.stop = function() {
    console.log('Stopping playback');
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    updateNowPlaying();
}

window.pause = function() {
    console.log('Pausing playback');
    audioPlayer.pause();
}

window.resume = function() {
    console.log('Resuming playback');
    audioPlayer.play();
}

window.rate = function(rating) {
    console.log('Rating track:', rating);
    if (currentTrack) {
        ws.send(JSON.stringify({ action: 'rate', filename: currentTrack.filename, rating: rating }));
    } else {
        console.log('No track playing to rate');
    }
}

window.skip = function(seconds) {
    console.log('Skipping:', seconds, 'seconds');
    audioPlayer.currentTime += seconds;
}

window.filterPlaylist = function() {
    currentFilter = document.getElementById('ratingFilter').value;
    console.log('Filtering playlist by:', currentFilter);
    applyFilter();
}

function applyFilter() {
    let filteredPlaylist;
    if (currentFilter === 'all') {
        filteredPlaylist = playlist;
    } else if (currentFilter === 'unrated') {
        filteredPlaylist = playlist.filter(track => track.rating === 'Unrated');
    } else {
        const ratingValue = parseInt(currentFilter);
        filteredPlaylist = playlist.filter(track => track.rating === ratingValue);
    }
    updatePlaylist(filteredPlaylist);
}

function updateNowPlaying() {
    const nowPlayingElement = document.getElementById('nowPlaying');
    if (currentTrack && !audioPlayer.paused) {
        nowPlayingElement.textContent = `${currentTrack.filename}`;
    } else {
        nowPlayingElement.textContent = 'No track playing';
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');

    if (currentTrack) {
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressBar.style.width = `${percent}%`;
        currentTime.textContent = formatTime(audioPlayer.currentTime);
        totalTime.textContent = formatTime(audioPlayer.duration);
    } else {
        progressBar.style.width = '0%';
        currentTime.textContent = '0:00';
        totalTime.textContent = '0:00';
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updatePlaylist(playlistToShow) {
    console.log('Updating playlist:', playlistToShow);
    const playlistElement = document.getElementById('playlist');
    playlistElement.innerHTML = '';
    playlistToShow.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer';
        li.innerHTML = `
            <span class="w-1/3">${track.filename}</span>
            <span class="w-1/3 text-center" style="white-space: pre; overflow: hidden;">${track.genre}</span>
            
            <span class="w-1/6 text-center text-green-500">${track.rating}</span>
        `;
        li.onclick = () => play(playlist.indexOf(track));
        playlistElement.appendChild(li);
    });
}

function showToast(message) {
    console.log('Showing toast:', message);
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function playNextTrack(currentIndex) {
    const filteredPlaylist = getFilteredPlaylist();
    const currentFilteredIndex = filteredPlaylist.findIndex(track => track === playlist[currentIndex]);
    if (currentFilteredIndex < filteredPlaylist.length - 1) {
        play(playlist.indexOf(filteredPlaylist[currentFilteredIndex + 1]));
    } else {
        currentTrack = null;
        updateNowPlaying();
    }
}

function getFilteredPlaylist() {
    if (currentFilter === 'all') {
        return playlist;
    } else if (currentFilter === 'unrated') {
        return playlist.filter(track => track.rating === 'Unrated');
    } else {
        const ratingValue = parseInt(currentFilter);
        return playlist.filter(track => track.rating === ratingValue);
    }
}

// Setup audio player event listeners
audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('ended', () => {
    const filteredPlaylist = getFilteredPlaylist();
    const currentFilteredIndex = filteredPlaylist.findIndex(track => track === currentTrack);
    if (currentFilteredIndex < filteredPlaylist.length - 1) {
        play(playlist.indexOf(filteredPlaylist[currentFilteredIndex + 1]));
    } else {
        currentTrack = null;
        updateNowPlaying();
        updateProgressBar();
    }
});

// Key shortcuts
document.addEventListener('keydown', (event) => {
    console.log('Key pressed:', event.key);
    switch(event.key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
            rate(parseInt(event.key));
            break;
        case '`':
            // rate('Unrated');
            rate(0);
            break;
        case 'ArrowLeft':
            skip(-30);
            break;
        case 'ArrowRight':
            skip(30);
            break;
        case 'ArrowUp':
            // Play previous track
            const filteredPlaylist = getFilteredPlaylist();
            const currentFilteredIndex = filteredPlaylist.findIndex(track => track === currentTrack);
            if (currentFilteredIndex > 0) play(playlist.indexOf(filteredPlaylist[currentFilteredIndex - 1]));
            break;
        case 'ArrowDown':
            // Play next track
            const filteredPlaylist2 = getFilteredPlaylist();
            const currentFilteredIdx = filteredPlaylist2.findIndex(track => track === currentTrack);
            if (currentFilteredIdx < filteredPlaylist2.length - 1) play(playlist.indexOf(filteredPlaylist2[currentFilteredIdx + 1]));
            break;
        case ' ':
            audioPlayer.paused ? resume() : pause();
            break;
    }
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data.action);
        switch (data.action) {
            case 'lastFolder':
                document.getElementById('folderPath').value = data.folder;
                loadFolder();
                break;
            case 'playlistLoaded':
                playlist = data.playlist;
                applyFilter();
                break;
            case 'playlistUpdated':
                playlist = data.playlist;
                applyFilter();
                showToast(`Rating updated to: ${data.updatedRating}`);
                playNextTrack(data.updatedTrackIndex);
                break;
        }
    };

    ws.onclose = function() {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 1000);
    };
}

connectWebSocket();