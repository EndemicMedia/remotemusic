const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const NodeID3 = require('node-id3');

const CONFIG_FILE = path.join(__dirname, 'config.json');

let currentFolder = '';
let playlist = [];
let desktopClient = null;
let remoteClients = new Set();
let currentTrack = null;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}


function saveConfig(folder) {
  log(`Saving config with folder: ${folder}`);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ lastFolder: folder }));
}

function loadConfig() {
  log('Loading config');
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    log(`Loaded last folder: ${config.lastFolder}`);
    return config.lastFolder;
  } catch (error) {
    log(`Error loading config: ${error.message}`);
    return null;
  }
}

function loadPlaylist(folder) {
  log(`Loading playlist from folder: ${folder}`);
  currentFolder = folder;
  saveConfig(folder);
  playlist = fs.readdirSync(currentFolder)
    .filter(file => path.extname(file).toLowerCase() === '.mp3')
    .map(file => {
      const filepath = path.join(currentFolder, file);
      const tags = NodeID3.read(filepath);
      return {
        filename: file,
        path: `/music/${encodeURIComponent(file)}`,
        rating: getRating(filepath),
        genre: tags.genre || 'Unknown',
      };
    });
  log(`Loaded ${playlist.length} tracks`);
  return playlist;
}

function getRating(filepath) {
  // log(`Getting rating for file: ${filepath}`);
  const tags = NodeID3.read(filepath);
  if (tags.popularimeter && tags.popularimeter.rating !== undefined) {
    const rating = Math.floor(tags.popularimeter.rating / 51);
    // log(`Rating found: ${rating}`);
    return rating;
  }
  log('No rating found');
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
    
    return { updatedPlaylist: playlist, updatedRating: updatedRating, updatedTrackIndex: trackIndex };
  } else {
    log('Failed to save rating');
    return null;
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
    log(`Received WebSocket message: ${data.action}`);
    let response;

    switch (data.action) {
      case 'loadFolder':
        const loadedPlaylist = loadPlaylist(data.folder);
        // Set up the /music route dynamically
        if (musicRoute) {
          app._router.stack.pop();
        }
        musicRoute = express.static(currentFolder);
        app.use('/music', musicRoute);
        response = { action: 'playlistLoaded', playlist: loadedPlaylist };
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
          broadcastToAll(response);
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

  const lastFolder = loadConfig();
  if (lastFolder) {
    ws.send(JSON.stringify({ action: 'lastFolder', folder: lastFolder }));
  }
});

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