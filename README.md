# MP3 Player with Remote Control

A Node.js-based MP3 player with ID3 tag support, a web GUI, and remote control functionality.

## Features

- Web-based interface for easy access
- Remote control functionality for smartphones on the same network
- ID3 tag support for displaying and editing track information
- Playlist management with filtering by rating and creation date sorting
- Keyboard shortcuts for quick control
- Real-time updates across all connected devices

## Main Interface

- Load a folder containing MP3 files
- Play, pause, and stop tracks
- Skip forward and backward
- Rate tracks
- Filter the playlist by rating
  
<img width="1564" alt="Screenshot 2024-07-16 at 10 18 44" src="https://github.com/user-attachments/assets/7f5a7a88-9de5-46c4-af77-88fba3779309">

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

The application saves the last used folder path in a `config.json` file. This file is automatically created in the project root directory when you load a folder for the first time.

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

## Support

If you encounter any problems or have any questions, please open an issue in the GitHub repository.
