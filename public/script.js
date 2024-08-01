let ws;
let playlist = [];
let currentTrack = null;
let audioPlayer = new Audio();
let currentRatingFilter = 'all';
let currentGenreFilters = [];

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
    sendRemoteUpdate('updateNowPlaying', { track: currentTrack.filename });
}

window.stop = function() {
    console.log('Stopping playback');
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    updateNowPlaying();
    sendRemoteUpdate('updateNowPlaying', { track: null });
}

window.pause = function() {
    console.log('Pausing playback');
    audioPlayer.pause();
    sendRemoteUpdate('updateNowPlaying', { track: currentTrack ? currentTrack.filename : null });
}

window.resume = function() {
    console.log('Resuming playback');
    audioPlayer.play();
    sendRemoteUpdate('updateNowPlaying', { track: currentTrack ? currentTrack.filename : null });
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
    currentRatingFilter = document.getElementById('ratingFilter').value;
    console.log('Filtering playlist by rating:', currentRatingFilter);
    applyFilters();
}

function applyFilters() {
    let filteredPlaylist = playlist;

    // Apply rating filter
    if (currentRatingFilter !== 'all') {
        if (currentRatingFilter === 'unrated') {
            filteredPlaylist = filteredPlaylist.filter(track => track.rating === 'Unrated');
        } else {
            const ratingValue = parseInt(currentRatingFilter);
            filteredPlaylist = filteredPlaylist.filter(track => track.rating === ratingValue);
        }
    }

    // Apply genre filter
    if (currentGenreFilters.length > 0) {
        filteredPlaylist = filteredPlaylist.filter(track => {
            const genreMatch = track.genres.some(genre => currentGenreFilters.includes(genre));
            console.log('Genre match:', genreMatch);
            return genreMatch;
            }
        );
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
        sendRemoteUpdate('updateProgress', { currentTime: audioPlayer.currentTime, duration: audioPlayer.duration });
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
    const playlistElement = document.getElementById('playlistItems');
    playlistElement.innerHTML = '';
    playlistToShow.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer';
        li.innerHTML = `
            <span class="w-1/3">${track.filename}</span>
            <span class="w-1/3 text-center" style="white-space: pre; overflow: hidden;">${track.genres.join(', ')}</span>
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

function playNextTrack() {
    const filteredPlaylist = getFilteredPlaylist();
    const currentIndex = filteredPlaylist.findIndex(track => track === currentTrack);
    if (currentIndex < filteredPlaylist.length - 1) {
        play(playlist.indexOf(filteredPlaylist[currentIndex + 1]));
    } else {
        currentTrack = null;
        updateNowPlaying();
    }
}

function getFilteredPlaylist() {
    let filteredPlaylist = playlist;
    if (currentRatingFilter !== 'all') {
        if (currentRatingFilter === 'unrated') {
            filteredPlaylist = filteredPlaylist.filter(track => track.rating === 'Unrated');
        } else {
            const ratingValue = parseInt(currentRatingFilter);
            filteredPlaylist = filteredPlaylist.filter(track => track.rating === ratingValue);
        }
    }
    if (currentGenreFilters.length > 0) {
        filteredPlaylist = filteredPlaylist.filter(track => 
            track.genres.some(genre => currentGenreFilters.includes(genre))
        );
    }
    return filteredPlaylist;
}

function sendRemoteUpdate(action, data) {
    ws.send(JSON.stringify({ action, ...data }));
}

function initializeGenreFilter(genres) {
    const genreFilter = $('#genreFilter');
    genreFilter.empty();
    genres.forEach(genre => {
        genreFilter.append(new Option(genre, genre));
    });
    genreFilter.select2({
        placeholder: 'Select genres',
        allowClear: true,
        theme: 'classic'
    });
    genreFilter.on('change', function() {
        currentGenreFilters = $(this).val() || [];
        applyFilters();
    });
}

// Setup audio player event listeners
audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('ended', playNextTrack);

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
            const prevFilteredPlaylist = getFilteredPlaylist();
            const prevCurrentIndex = prevFilteredPlaylist.findIndex(track => track === currentTrack);
            if (prevCurrentIndex > 0) play(playlist.indexOf(prevFilteredPlaylist[prevCurrentIndex - 1]));
            break;
        case 'ArrowDown':
            // Play next track
            playNextTrack();
            break;
        case ' ':
            audioPlayer.paused ? resume() : pause();
            break;
    }
});

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000/desktop');

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
                initializeGenreFilter(data.genres);
                applyFilters();
                break;
            case 'playlistUpdated':
                playlist = data.playlist;
                applyFilters();
                showToast(`Rating updated to: ${data.updatedRating}`);
                playNextTrack();
                break;
            case 'play':
                if (currentTrack) audioPlayer.play();
                break;
            case 'pause':
                audioPlayer.pause();
                break;
            case 'stop':
                stop();
                break;
            case 'skip':
                skip(data.value);
                break;
            case 'previousTrack':
                const prevFilteredPlaylist = getFilteredPlaylist();
                const prevCurrentIndex = prevFilteredPlaylist.findIndex(track => track === currentTrack);
                if (prevCurrentIndex > 0) play(playlist.indexOf(prevFilteredPlaylist[prevCurrentIndex - 1]));
                break;
            case 'nextTrack':
                playNextTrack();
                break;
        }
    };

    ws.onclose = function() {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 1000);
    };
}

connectWebSocket();