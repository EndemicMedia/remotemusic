const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/tracks', async (req, res) => {
    try {
        const files = await fs.readdir(path.join(__dirname, 'public', 'music'));
        const tracks = await Promise.all(files.map(async (file) => {
            const stats = await fs.stat(path.join(__dirname, 'public', 'music', file));
            return {
                name: path.parse(file).name,
                path: `/music/${file}`,
                createdAt: stats.birthtime
            };
        }));
        res.json(tracks);
    } catch (error) {
        console.error('Error reading tracks:', error);
        res.status(500).json({ error: 'Unable to retrieve tracks' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});