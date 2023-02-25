const fs = require('fs').promises;
const path = require('path');
const turbowalk = require('turbowalk').default;

async function start() {
    const assetPath = path.join(__dirname, 'assets');
    const distPath = path.join(__dirname, 'dist');
    await turbowalk(assetPath, async entries => {
        for (const asset of entries) {
            if (path.basename(asset.filePath).startsWith('ADD_EXTRA_ASSETS')) {
                continue;
            }
            const relPath = path.relative(assetPath, asset.filePath);
            const destination = path.join(distPath, relPath);
            await fs.mkdir(path.dirname(destination)).catch(err => { if (err.code !== 'EEXIST') { throw err; } });
            await fs.unlink(destination).catch(err => { if (err.code !== 'ENOENT') { throw err; } });
            await fs.copyFile(asset.filePath, destination);
        }
    });
}

start();