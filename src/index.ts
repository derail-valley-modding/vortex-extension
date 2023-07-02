import path from 'path';
import { fs, types, util } from 'vortex-api';

import { DV_GAME } from './dv_constants';
import { registerModHandlers } from './installers';

//let missingBepisNotification = undefined;
let cachedModsDir = undefined;

function main(context: types.IExtensionContext) {
    context.requireExtension('modtype-bepinex');
    context.registerGame({
        id: DV_GAME.nexusId,
        name: 'Derail Valley',
        mergeMods: true,

        logo: 'gameart.jpg',
        executable: () => 'DerailValley.exe',
        requiredFiles: [
            'DerailValley.exe'
        ],
        environment: {
            SteamAPPId: DV_GAME.steamAppId,
        },
        details: {
            steamAppId: +DV_GAME.steamAppId
        },

        queryPath: findGame,
        queryModPath: () => DV_GAME.bepinexDir,
        setup: prepareForModding,
    });

    // ensure that bepinex is installed
    context.once(() => {
        if (context.api.ext.bepinexAddGame !== undefined) {
            context.api.ext.bepinexAddGame({
                gameId: DV_GAME.nexusId,
                autoDownloadBepInEx: true,
                forceGithubDownload: true
            });
        }
    });

    registerModHandlers(context, getModsDir);

    return true;
}

function getModsDir() {
    return cachedModsDir;
}

function findGame() {
    return util.GameStoreHelper.findByAppId([DV_GAME.steamAppId])
        .then((game: types.IGameStoreEntry) => game.gamePath);
}

function prepareForModding(discovery: types.IDiscoveryResult) {
    cachedModsDir = path.join(discovery.path, DV_GAME.bepinexDir);
    return fs.ensureDirWritableAsync(cachedModsDir);
}

export default main;
