import path from 'path';
import { fs, types, util } from 'vortex-api';

import { DV_GAME } from './dv_constants';
import { registerModHandlers } from './installers';

let missingUMMNotification = undefined;
let cachedModsDir = undefined;

function main(context: types.IExtensionContext) {
    context.requireExtension('modtype-umm');
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
        queryModPath: () => DV_GAME.ummModsDir,
        setup: (discovery) => prepareForModding(discovery, context.api),
    });

    // ensure that UMM is installed
    context.once(() => {
        if (context.api.ext.ummAddGame !== undefined) {
            context.api.ext.ummAddGame({
                gameId: DV_GAME.nexusId,
                autoDownloadUMM: true
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

function prepareForModding(discovery: types.IDiscoveryResult, api: types.IExtensionApi) {
    cachedModsDir = path.join(discovery.path, DV_GAME.ummModsDir);
    return fs.ensureDirWritableAsync(cachedModsDir)
    .then(() => checkForUMM(api, discovery.path));
}

function checkForUMM(api: types.IExtensionApi, gamePath: string) {
    const ummLibraryPath = path.join(gamePath, 'DerailValley_Data', 'Managed', 'UnityModManager', 'UnityModManager.dll');

    return fs.statAsync(ummLibraryPath)
    .then(() => {
        if (typeof(missingUMMNotification) !== 'undefined') {
            api.dismissNotification(missingUMMNotification);
        }
    }, () => {
        if (typeof(missingUMMNotification) === 'undefined') {
            missingUMMNotification = api.sendNotification({
                id: 'umm-missing',
                type: 'warning',
                title: 'Unity Mod Manager not installed',
                message: 'You must run the UMM tool and install it via doorstop proxy to mod Derail Valley.',
            });
        }
    });
}

export default main;
