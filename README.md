# MP3 Player with Remote Control

A Node.js-based MP3 player with ID3 tag support, a web GUI, and remote control functionality.

## Features

- Web-based interface for easy access
- Remote control functionality for smartphones on the same network
- ID3 tag support for displaying and editing track information
- Advanced playlist management with multi-factor filtering:
  - Filter by rating (0-5 stars)
  - Filter by artist sentiment (very negative to very positive)
  - Filter by multiple genres
- Library caching and background reloading
- Smart playback with automatic track advancement
- Artist sentiment analysis with visual feedback
- Real-time updates across all connected devices
- Keyboard shortcuts for quick control

## Main Interface

- Load and manage MP3 files from any folder
- Play, pause, and stop tracks
- Skip forward and backward
- Rate tracks with immediate visual feedback
- Multiple filtering options:
  - Rating-based filtering (0-5 stars)
  - Genre-based filtering (multi-select)
  - Artist sentiment filtering (very negative to very positive)
- Visual artist sentiment indicators using color-coded backgrounds
- Library reload functionality with progress tracking
- Automatic track advancement based on ratings
  
<img width="1564" alt="Screenshot 2024-07-16 at 10 18 44" src="https://github.com/user-attachments/assets/7f5a7a88-9de5-46c4-af77-88fba3779309">

## Smart Features

- Library caching for faster loading
- Background library reloading with progress indicator
- Automatic track advancement when rating songs 2 stars or below
- Artist sentiment analysis based on average ratings
- Visual feedback with color-coded backgrounds for artist sentiment
- Persistent configuration and library state
- Scroll-enabled playlist view for large libraries

## Remote Control

The remote control interface mirrors the main interface but sends commands to the desktop client instead of directly controlling playback. This allows you to control the MP3 player from any device on your local network.

## Prerequisites

- Node.js (v12 or higher recommended)
- npm (usually comes with Node.js)

## Installation

1. Clone this repository or download the source code:
   ```
   git clone https://github.com/endemicmedia/remotemusic.git
   cd remotemusic
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```
   or
   ```
   node server.js
   ```

2. On the desktop computer, open a web browser and navigate to:
   ```
   http://localhost:3000
   ```

3. On a smartphone or another device on the same local network, open a web browser and navigate to:
   ```
   http://<desktop-ip-address>:3000/remote
   ```
   Replace `<desktop-ip-address>` with the IP address of your desktop computer on the local network.

## Keyboard Shortcuts

- Space: Play/Pause
- Left Arrow: Skip back 30 seconds
- Right Arrow: Skip forward 30 seconds
- Up Arrow: Previous track
- Down Arrow: Next track
- 0-5: Rate current track (0 stars to 5 stars)
- `: Unrate current track

## Configuration

The application maintains two configuration files:
- `config.json`: Stores the last used folder path and other settings
- `library.json`: Caches the library data for faster loading

These files are automatically created in the project root directory when you first use the application.

## File Organization

Key files in the project:
- `server.js`: Main server implementation with WebSocket handling and file operations
- `public/index.html`: Main web interface
- `public/script.js`: Client-side JavaScript for the web interface

## Security Note

This application is designed for use on a local network. If you plan to make it accessible over the internet, please implement proper authentication and encryption measures.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [ws (WebSocket library)](https://github.com/websockets/ws)
- [node-id3](https://github.com/Zazama/node-id3)
- [Tailwind CSS](https://tailwindcss.com/)
- [Select2](https://select2.org/)

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.