const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/songs', (req, res) => {
    const songsDir = path.join(__dirname, 'songs');
    fs.readdir(songsDir, (err, files) => {
        if (err) {
            console.error('Error reading songs directory:', err);
            res.status(500).json({ error: 'Error reading songs directory' });
            return;
        }

        const songs = files
            .filter(file => path.extname(file).toLowerCase() === '.mp3')
            .map(file => {
                const filePath = path.join(songsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: path.basename(file, '.mp3'),
                    filename: file,
                    createdAt: stats.birthtime
                };
            });

        res.json(songs);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});