const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const NodeID3 = require('node-id3');

const CONFIG_FILE = path.join(__dirname, 'config.json');
const LIBRARY_FILE = path.join(__dirname, 'library.json');

let currentFolder = '';
let playlist = [];
let genres = new Set();
let desktopClient = null;
let remoteClients = new Set();
let currentTrack = null;
let isReloadingLibrary = false;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function saveConfig(obj) {
  log(`Saving config with folder: ${obj.lastFolder}`);
  
  let existingData = {};
  
  // Check if the file exists
  if (fs.existsSync(CONFIG_FILE)) {
    // Read existing data
    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    try {
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error parsing existing config file:', error);
    }
  }
  
  // Merge existing data with new object
  const updatedData = { ...existingData, ...obj };
  
  // Write updated data to file
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updatedData, null, 2));
}

function loadConfig() {
  log('Loading config');
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    log(`Loaded last folder: ${config.lastFolder}`);
    return config;
  } catch (error) {
    log(`Error loading config: ${error.message}`);
    return null;
  }
}

function sanitizeFilename(filename) {
  return filename
  try {
    // Normalize Unicode characters
    const normalized = filename.normalize('NFD')
      // Remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, '')
      // Replace remaining non-ASCII characters with underscores
      // .replace(/[^\x00-\x7F]/g, '_')
      // Replace multiple consecutive underscores with a single one
      // .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      // .trim();
    
    return normalized;
  } catch (error) {
    console.error(`Error sanitizing filename: ${filename}`, error);
    return null;
  }
}

function saveLibrary(libraryData) {
  log('Saving library to file');
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(libraryData, null, 2));
  log('Library saved successfully');
}

function loadLibrary() {
  log('Loading library from file');
  try {
    const libraryData = JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'));
    log(`Loaded ${libraryData.playlist.length} tracks from library file`);
    return libraryData;
  } catch (error) {
    log(`Error loading library: ${error.message}`);
    return null;
  }
}

function loadPlaylist(folder, useCache = true) {
  log(`Loading playlist from folder: ${folder}`);
  currentFolder = folder;
  saveConfig({lastFolder: folder});
  
  if (useCache) {
    const cachedLibrary = loadLibrary();
    if (cachedLibrary && cachedLibrary.folder === folder && cachedLibrary.playlist.length > 0) {
      log('Using cached library data');
      playlist = cachedLibrary.playlist;
      genres = new Set(cachedLibrary.genres);
      log(`Loaded ${playlist.length} tracks from cache with ${genres.size} unique genres`);
      return { playlist, genres: Array.from(genres).sort() };
    }
  }
  
  log('Cache is empty or invalid. Loading playlist from disk...');
  return loadPlaylistFromDisk(folder);
}

function loadPlaylistFromDisk(folder) {
  log(`Loading playlist from disk: ${folder}`);
  genres.clear();
  playlist = fs.readdirSync(folder)
    .filter(file => path.extname(file).toLowerCase() === '.mp3')
    .map(file => {
      try {
        const sanitizedFile = sanitizeFilename(file);
        if (!sanitizedFile) {
          console.error(`Could not sanitize filename: ${file}`);
          return null;
        }

        const originalPath = path.join(folder, file);
        
        // Check if file exists
        if (!fs.existsSync(originalPath)) {
          console.error(`File not found: ${originalPath}`);
          return null;
        }

        // Read ID3 tags with error handling
        let tags;
        try {
          tags = NodeID3.read(originalPath);
        } catch (error) {
          console.error(`Error reading ID3 tags for ${file}:`, error);
          tags = {};
        }

        // Process genres safely
        const fileGenres = tags.genre ? 
          tags.genre.split(',')
            .map(g => g.trim())
            .filter(g => g.length > 0) : 
          ['Unknown'];

        // Add genres to the set
        fileGenres.forEach(genre => {
          try {
            genres.add(genre);
          } catch (error) {
            console.error(`Error adding genre: ${genre}`, error);
          }
        });

        // Return the processed file information
        return {
          filename: sanitizedFile,
          originalName: file,
          path: `/music/${encodeURIComponent(sanitizedFile)}`,
          rating: getRating(originalPath),
          genres: fileGenres,
        };
      } catch (error) {
        console.error(`Error processing file: ${file}`, error);
        return null;
      }
    })
    .filter(item => item !== null)
    .sort((a, b) => a.filename.toLowerCase().localeCompare(b.filename.toLowerCase()));

  log(`Loaded ${playlist.length} tracks with ${genres.size} unique genres`);
  
  // Save the library
  saveLibrary({ folder, playlist, genres: Array.from(genres) });
  
  return { playlist, genres: Array.from(genres).sort() };
}

function reloadLibraryInBackground(folder, ws) {
  log('Starting background library reload');
  isReloadingLibrary = true;
  broadcastToAll({ action: 'reloadingLibrary', status: 'started' });
  
  const startTime = Date.now();
  const { playlist: newPlaylist, genres: newGenres } = loadPlaylistFromDisk(folder);

  const endTime = Date.now();
  isReloadingLibrary = false;
  log(`Background library reload complete. Time taken: ${(endTime - startTime) / 1000} seconds`);
  
  // Update the current playlist and genres
  playlist = newPlaylist;
  genres = new Set(newGenres);
  
  // Save the updated library
  saveLibrary({ folder, playlist, genres: Array.from(genres) });

  // Notify all clients about the updated library
  broadcastToAll({ 
    action: 'libraryUpdated', 
    playlist: playlist, 
    genres: Array.from(genres).sort(),
    reloadTime: (endTime - startTime) / 1000
  });
}

function getRating(filepath) {
  const tags = NodeID3.read(filepath);
  if (tags.popularimeter && tags.popularimeter.rating !== undefined) {
    const rating = Math.floor(tags.popularimeter.rating / 51);
    return rating;
  }
  process.stdout.write('.');
  return 'Unrated';
}

function rateTrack(filename, rating) {
  const filepath = path.join(currentFolder, filename);
  log(`Rating track ${filename} with ${rating} stars`);
  const tags = NodeID3.read(filepath);
  tags.popularimeter = {
    email: "user@example.com",
    rating: rating * 51,  // Convert 0-5 to 0-255
    counter: (tags.popularimeter && tags.popularimeter.counter) ? tags.popularimeter.counter + 1 : 1
  };
  const success = NodeID3.write(tags, filepath);
  if (success) {
    log('Rating saved successfully');
    
    // Update the playlist with the new rating
    const trackIndex = playlist.findIndex(track => track.filename === filename);
    if (trackIndex !== -1) {
      playlist[trackIndex].rating = rating;
    }
    
    // Re-read the tag to confirm the change
    const updatedTags = NodeID3.read(filepath);
    const updatedRating = updatedTags.popularimeter ? Math.floor(updatedTags.popularimeter.rating / 51) : 'Unrated';
    log(`Updated rating confirmed: ${updatedRating}`);
    
    // Update the library file
    saveLibrary({ folder: currentFolder, playlist, genres: Array.from(genres) });
    
    return { updatedPlaylist: playlist, updatedRating: updatedRating, updatedTrackIndex: trackIndex };
  } else {
    log('Failed to save rating');
    return null;
  }
}

app.use(express.static('public'));
app.get('/remote', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

// We'll set up the /music route dynamically after the folder is loaded
let musicRoute = null;

wss.on('connection', (ws, req) => {
  log('New WebSocket connection established');
  
  // Determine if this is a desktop or remote client
  const isDesktop = req.url === '/desktop';
  if (isDesktop) {
    desktopClient = ws;
    log('Desktop client connected');
  } else {
    remoteClients.add(ws);
    log('Remote client connected');
  }

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    let response;

    switch (data.action) {
      case 'reloadLibrary':
        reloadLibraryInBackground(currentFolder, ws);
        response = { action: 'reloadLibraryStarted' };
        break;
      case 'loadFolder':
        const { playlist: loadedPlaylist, genres: loadedGenres } = loadPlaylist(data.folder);
        // Set up the /music route dynamically
        if (musicRoute) {
          app._router.stack.pop();
        }
        musicRoute = express.static(currentFolder);
        app.use('/music', musicRoute);
        response = { 
          action: 'playlistLoaded', 
          playlist: loadedPlaylist, 
          genres: loadedGenres,
          isReloadingLibrary: isReloadingLibrary
        };
        break;
      case 'rate':
        if (currentTrack) {
          const result = rateTrack(currentTrack.filename, data.rating);
          response = { 
            action: 'playlistUpdated', 
            playlist: result ? result.updatedPlaylist : playlist,
            updatedRating: result ? result.updatedRating : 'Unrated',
            updatedTrackIndex: result ? result.updatedTrackIndex : -1
          };
          // Broadcast the updated playlist to all clients
          // broadcastToAll(response);
        } else {
          log('No track playing to rate');
        }
        break;
      case 'play':
      case 'pause':
      case 'stop':
      case 'skip':
      case 'previousTrack':
      case 'nextTrack':
        // Forward these commands to the desktop client
        if (desktopClient) {
          desktopClient.send(JSON.stringify(data));
        }
        break;
      case 'updateNowPlaying':
        currentTrack = data.track ? playlist.find(track => track.filename === data.track) : null;
        // Forward these updates to all remote clients
        broadcastToRemotes(data);
        break;
      case 'updateProgress':
        // Forward these updates to all remote clients
        broadcastToRemotes(data);
        break;
      case 'copyFiles':
        try {
          const copiedCount = copyFiles(data.destinationPath, data.files, ws);
          response = { action: 'copyFilesComplete', copiedCount: copiedCount };
        } catch (error) {
          log(`Error during file copy: ${error.message}`);
          response = { action: 'copyFilesError', error: error.message };
        }
        break;
    }

    if (response) {
      ws.send(JSON.stringify(response));
    }
  });

  ws.on('close', () => {
    if (isDesktop) {
      desktopClient = null;
      log('Desktop client disconnected');
    } else {
      remoteClients.delete(ws);
      log('Remote client disconnected');
    }
  });

  const {lastFolder, destinationPath} = loadConfig();
  if (lastFolder) ws.send(JSON.stringify({ action: 'lastFolder', folder: lastFolder }));
  if (destinationPath) ws.send(JSON.stringify({ action: 'destinationPath', folder: destinationPath }));  
});


// New function to copy files
function copyFiles(destinationPath, files, ws) {
  log(`Copying ${files.length} files to ${destinationPath}`);
  saveConfig({destinationPath});
  let copiedCount = 0;
  
  // Ensure destination directory exists
  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(destinationPath, { recursive: true });
  }

  files.forEach((file, index) => {
    const sourcePath = path.join(currentFolder, file);
    const destPath = path.join(destinationPath, file);
    try {
      fs.copyFileSync(sourcePath, destPath);
      copiedCount++;
      // Send progress update
      const progress = Math.round((index + 1) / files.length * 100);
      ws.send(JSON.stringify({ action: 'copyProgress', progress: progress }));
    } catch (error) {
      log(`Error copying file ${file}: ${error.message}`);
    }
  });

  log(`Copied ${copiedCount} out of ${files.length} files`);
  return copiedCount;
}

function broadcastToAll(data) {
  const message = JSON.stringify(data);
  if (desktopClient) {
    desktopClient.send(message);
  }
  remoteClients.forEach(client => {
    client.send(message);
  });
}

function broadcastToRemotes(data) {
  const message = JSON.stringify(data);
  remoteClients.forEach(client => {
    client.send(message);
  });
}

server.listen(3000, () => {
  log('Server is running on http://localhost:3000');
});
