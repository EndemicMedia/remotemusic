let ws;
let playlist = [];
let currentTrack = null;
let nextTrack = null; // Stores the next track to play
let audioPlayer = new Audio();
let currentRatingFilter = 'all';
let currentGenreFilters = [];
let currentColorFilter = 'all';
let shouldPlayNextAfterRating = false; // New flag to indicate if we should play the next track after rating

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
    
    // Set the next track
    setNextTrack(index);
}

// Helper function to set the next track
function setNextTrack(currentIndex) {
    const filteredPlaylist = getFilteredPlaylist();
    const currentFilteredIndex = filteredPlaylist.findIndex(track => track === playlist[currentIndex]);
    if (currentFilteredIndex > -1 && currentFilteredIndex < filteredPlaylist.length - 1) {
        nextTrack = filteredPlaylist[currentFilteredIndex + 1];
    } else {
        // nextTrack = filteredPlaylist[0]; // Loop back to the beginning of filtered playlist
    }
    console.log('Next track set to:', nextTrack ? nextTrack.filename : 'None');
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
        // Set flag to play next track if rating is 2 or below
        shouldPlayNextAfterRating = rating <= 2;
        // Check if the current track will be filtered out
        if (currentRatingFilter !== 'all' && currentRatingFilter !== rating.toString()) {
            // Update nextTrack as the current one will be filtered out
            setNextTrack(playlist.indexOf(currentTrack));
        }
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
    currentColorFilter = document.getElementById('colorFilter').value;
    console.log('Filtering playlist by rating:', currentRatingFilter, 'and color:', currentColorFilter);
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
        });
    }

    // Apply color filter
    if (currentColorFilter !== 'all') {
        const artistStats = calculateArtistRatings(playlist);
        filteredPlaylist = filteredPlaylist.filter(track => {
            const artist = track.filename.split(' - ')[0];
            const artistScore = artistStats[artist].score;
            return getColorCategory(artistScore) === currentColorFilter;
        });
    }

    // Preserve nextTrack if it's still in the filtered playlist
    if (nextTrack && !filteredPlaylist.includes(nextTrack)) {
        const currentIndex = playlist.indexOf(currentTrack);
        setNextTrack(currentIndex);
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

// Add this function to calculate artist ratings
function calculateArtistRatings(playlist) {
    const artistStats = {};
    
    playlist.forEach(track => {
        // Extract artist name from filename
        const artist = track.filename.split(' - ')[0];
        if (!artistStats[artist]) {
            artistStats[artist] = {
                totalRating: 0,
                songCount: 0,
                ratedSongCount: 0
            };
        }
        
        // Add to rating total if the track is rated
        if (track.rating !== 'Unrated') {
            artistStats[artist].totalRating += parseInt(track.rating);
            artistStats[artist].ratedSongCount++;
        }
        artistStats[artist].songCount++;
    });
    
    // Calculate average ratings and scores
    Object.keys(artistStats).forEach(artist => {
        const stats = artistStats[artist];
        if (stats.ratedSongCount > 0) {
            stats.averageRating = stats.totalRating / stats.ratedSongCount;
            // Score ranges from -100 to 100
            stats.score = ((stats.averageRating - 2.5) / 2.5) * 100;
        } else {
            stats.averageRating = 0;
            stats.score = 0;
        }
    });
    
    return artistStats;
}

// Add this function to get background color based on artist score
function getArtistBackgroundColor(score) {
    if (score === 0) return ''; // Default background for unrated artists
    
    let r, g, b, a;
    if (score > 0) {
        // Positive scores: green tint
        const intensity = Math.min(score, 100) / 100;
        r = 0;
        g = Math.round(intensity * 128);
        b = 0;
        a = 0.2 + (intensity * 0.3); // Varying opacity
    } else {
        // Negative scores: red tint
        const intensity = Math.min(Math.abs(score), 100) / 100;
        r = Math.round(intensity * 128);
        g = 0;
        b = 0;
        a = 0.2 + (intensity * 0.3); // Varying opacity
    }
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// New function to determine color category based on score
function getColorCategory(score) {
    if (score === 0) return 'neutral';
    if (score < -60) return 'very negative';
    if (score < -20) return 'negative';
    if (score < 20) return 'neutral';
    if (score < 60) return 'positive';
    return 'very positive';
}

function updatePlaylist(playlistToShow) {
    console.log('Updating playlist:', playlistToShow.length);
    const playlistElement = document.getElementById('playlistItems');
    playlistElement.innerHTML = '';
    // Calculate artist ratings once
    const artistStats = calculateArtistRatings(playlist);
    playlistToShow.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center p-2 hover:bg-gray-700 cursor-pointer';
        const artist = track.filename.split(' - ')[0]
        li.style.backgroundColor = getArtistBackgroundColor(artistStats[artist].score);
        li.innerHTML = `
            <span class="w-1/3">${track.filename}</span>
            <span class="w-1/2 genre-list text-sm" style="white-space: pre; overflow: hidden;">${track.genres.join(', ')}</span>
            <span class="w-1/12 text-center text-green-500">${track.rating}</span>
        `;
        li.onclick = () => play(playlist.indexOf(track));
        playlistElement.appendChild(li);
    });

    // Add click event listener to genre list for copying
    document.querySelectorAll('.genre-list').forEach(element => {
        element.addEventListener('click', function(event) {
            event.stopPropagation();  // Prevent triggering play() when clicking on genres
            navigator.clipboard.writeText(this.textContent)
                .then(() => showToast('Genres copied to clipboard!'))
                .catch(err => console.error('Failed to copy genres: ', err));
        });
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
    if (nextTrack) {
        const nextIndex = playlist.indexOf(nextTrack);
        play(nextIndex);
    } else {
        const filteredPlaylist = getFilteredPlaylist();
        if (filteredPlaylist.length > 0) {
            const currentIndex = filteredPlaylist.findIndex(track => track === currentTrack);
            const nextIndex = (currentIndex + 1) % filteredPlaylist.length;
            play(playlist.indexOf(filteredPlaylist[nextIndex]));
        } else {
            currentTrack = null;
            nextTrack = null;
            updateNowPlaying();
        }
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
    if (currentColorFilter !== 'all') {
        const artistStats = calculateArtistRatings(playlist);
        filteredPlaylist = filteredPlaylist.filter(track => {
            const artist = track.filename.split(' - ')[0];
            const artistScore = artistStats[artist].score;
            return getColorCategory(artistScore) === currentColorFilter;
        });
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

// Add this new function
window.reloadLibrary = function() {
    console.log('Reloading library');
    ws.send(JSON.stringify({ action: 'reloadLibrary' }));
    document.getElementById('reloadProgress').classList.remove('hidden');
    document.getElementById('reloadLibraryBtn').disabled = true;
}

function updateReloadProgress(progress) {
    const progressBar = document.getElementById('reloadProgressBar');
    const progressText = document.getElementById('reloadProgressText');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
    }
    console.log(`Library reload progress: ${progress}%`);
}
function updateCopyStatus(isVisible) {
    const copyStatus = document.getElementById('copyStatus');
    if (isVisible) {
        copyStatus.classList.remove('hidden');
        document.getElementById("copyBtn").disabled = true;
    } else {
        copyStatus.classList.add('hidden');
        document.getElementById("copyBtn").disabled = false;
    }
}


// New function for copying files
window.copyFiles = function() {
    const destinationPath = document.getElementById('copyPath').value;
    const minRating = parseInt(document.getElementById('ratingSlider').value);
    showToast('Prepare to copy files. This may take a while.');
    if (!destinationPath) {
        showToast('Please enter a destination folder path.');
        return;
    }

    const filesToCopy = playlist.filter(track => {
        const trackRating = track.rating === 'Unrated' ? 0 : parseInt(track.rating);
        return trackRating >= minRating;
    });

    if (filesToCopy.length === 0) {
        showToast('No files match the selected rating criteria.');
        return;
    }

    updateCopyStatus(true); // Show the copy status
    ws.send(JSON.stringify({
        action: 'copyFiles',
        destinationPath: destinationPath,
        files: filesToCopy.map(track => track.filename)
    }));
}

function updateCopyProgress(progress) {
    const copyStatus = document.getElementById('copyStatus');
    copyStatus.textContent = `Copying files... ${progress}%`;
}

// Setup audio player event listeners
audioPlayer.addEventListener('timeupdate', updateProgressBar);
audioPlayer.addEventListener('ended', playNextTrack);

// Volume control
const volumeSlider = document.getElementById('volumeSlider');
const volumeLevel = document.getElementById('volumeLevel');

volumeSlider.addEventListener('input', function() {
    const volume = this.value / 100;
    audioPlayer.volume = volume;
    volumeLevel.textContent = `${this.value}%`;
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
        case '=':
            // Increase volume
            volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 10);
            volumeSlider.dispatchEvent(new Event('input'));
            break;
        case '-':
            // Decrease volume
            volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 10);
            volumeSlider.dispatchEvent(new Event('input'));
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
            case 'destinationPath':
                document.getElementById('copyPath').value = data.folder;
                break;
            case 'reloadingLibrary':
                showToast('Library reload started');
                document.getElementById('reloadProgress').classList.remove('hidden');
                break;
            case 'reloadProgress':
                updateReloadProgress(data.progress);
                break;
            case 'libraryUpdated':
                document.getElementById('reloadProgress').classList.add('hidden');
                document.getElementById('reloadLibraryBtn').disabled = false;
                showToast(`Library reload complete. Time taken: ${data.reloadTime} seconds`);
                playlist = data.playlist;
                initializeGenreFilter(data.genres);
                applyFilters();
                break;
            case 'playlistLoaded':
                playlist = data.playlist;
                initializeGenreFilter(data.genres);
                applyFilters();
                break;
            case 'playlistUpdated':
                const oldPlaylist = playlist;
                playlist = data.playlist;
                // Preserve nextTrack
                if (nextTrack) {
                    const oldNextTrackIndex = oldPlaylist.indexOf(nextTrack);
                    if (oldNextTrackIndex !== -1) {
                        nextTrack = playlist[oldNextTrackIndex];
                    }
                }
                applyFilters();
                showToast(`Rating updated to: ${data.updatedRating}`);
                // Play next track if the rating was 2 or below
                if (shouldPlayNextAfterRating) {
                    playNextTrack();
                    shouldPlayNextAfterRating = false; // Reset the flag
                }
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
            case 'copyFilesComplete':
                updateCopyStatus(false); // Hide the copy status
                showToast(`Successfully copied ${data.copiedCount} files.`);
                break;
            case 'copyFilesError':
                updateCopyStatus(false); // Hide the copy status
                showToast(`Error copying files: ${data.error}`);
                break;
            case 'copyProgress':
                updateCopyProgress(data.progress);
                break;
        }
    };

    ws.onclose = function() {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(connectWebSocket, 1000);
    };
}


function updateReloadProgress(progress) {
    // Update the UI to show the reload progress
    // This could be a progress bar or a text update
    console.log(`Library reload progress: ${progress}%`);
    // TODO: Update the UI element that shows the progress
}

// Initialize rating slider
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('ratingSlider');
    const value = document.getElementById('ratingValue');
    value.textContent = slider.value;
    slider.oninput = function() {
        value.textContent = this.value;
    }
    
    // Add event listener for the reload library button
    const reloadLibraryBtn = document.getElementById('reloadLibraryBtn');
    if (reloadLibraryBtn) {
        reloadLibraryBtn.addEventListener('click', reloadLibrary);
    }
});

connectWebSocket();
