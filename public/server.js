const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/playlist', (req, res) => {
    const audioDir = path.join(__dirname, 'audio');
    fs.readdir(audioDir, (err, files) => {
        if (err) {
            console.error('Error reading audio directory:', err);
            res.status(500).send('Error reading playlist');
            return;
        }

        const playlist = files
            .filter(file => path.extname(file).toLowerCase() === '.mp3')
            .map(file => {
                const filePath = path.join(audioDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: path.basename(file, '.mp3'),
                    url: `/audio/${file}`,
                    createdAt: stats.birthtime
                };
            });

        res.json(playlist);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});