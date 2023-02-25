import path from 'path';
import { actions, fs, log, types, util } from 'vortex-api';

const DV_NEXUS_ID = 'derailvalley';
const STEAMAPP_ID = '588030';

const SKIN_MANAGER_DIR = 'SkinManagerMod';
const SKINS_ROOT_DIR = 'Skins';
const SKIN_IMAGE_TYPES = ['.jpeg', '.jpg', '.png'];

function main(context: types.IExtensionContext) {
    context.requireExtension('modtype-umm');
    context.registerGame({
        id: DV_NEXUS_ID,
        name: 'Derail Valley',
        mergeMods: true,
        logo: 'gameart.jpg',
        executable: () => 'DerailValley.exe',
        requiredFiles: [
            'DerailValley.exe'
        ],
        environment: {
            SteamAPPId: STEAMAPP_ID,
        },
        details: {
            steamAppId: +STEAMAPP_ID
        },

        queryPath: findGame,
        queryModPath: () => 'Mods',
        setup: (discovery) => prepareForModding(discovery, context.api),
    });

    context.once(() => {
        if (context.api.ext.ummAddGame !== undefined) {
            context.api.ext.ummAddGame({
                gameId: DV_NEXUS_ID,
                autoDownloadUMM: true,
            });
        }
    });

    context.registerInstaller('derailvalley-skin', 25, checkIfModIsSkin, (files, destPath) => installSkin(files, destPath, context.api));

    return true;
}

function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
        .then((game: types.IGameStoreEntry) => game.gamePath);
}

function prepareForModding(discovery: types.IDiscoveryResult, api: types.IExtensionApi) {
    const ummModsPath = path.join(discovery.path, 'Mods');
    const ummLibraryPath = path.join(discovery.path, 'DerailValley_Data', 'Managed', 'UnityModManager', 'UnityModManager.dll');

    return fs.ensureDirWritableAsync(ummModsPath)
        .then(() => checkForUMM(api, ummLibraryPath));
}

function checkForUMM(api: types.IExtensionApi, libraryFile: string) {
    return fs.statAsync(libraryFile)
    .catch(() => {
        api.sendNotification({
            id: 'umm-missing',
            type: 'warning',
            title: 'Unity Mod Manager not installed',
            message: 'UMM Tool must be installed to mod Derail Valley.',
        });
    });
}

// Mod Installers
//-----------------------------------------------
// Skin Manager
function checkIfModIsSkin(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const supported = (
        (gameId === DV_NEXUS_ID) &&
        (!!files.find(f => 
            (f.indexOf(SKINS_ROOT_DIR) !== -1) //&&
            //(path.extname(f) in SKIN_IMAGE_TYPES)
        ))
    );

    log('info', 'checked if skin: ' + supported);

    return Promise.resolve({
        supported,
        requiredFiles: []
    });
}

function installSkin(files: string[], destinationPath: string, api: types.IExtensionApi): Promise<types.IInstallResult> {

    const filtered = files.filter(file => !file.endsWith(path.sep));

    const instructions: types.IInstruction[] = filtered.map(file => {
        const dest = path.join(SKIN_MANAGER_DIR, SKINS_ROOT_DIR, file.replace(SKINS_ROOT_DIR, ''));
        log('info', 'skin file: ' + dest);

        return {
            type: 'copy',
            source: file,
            destination: dest
        };
    });

    const smModReference: types.IReference = {
        gameId: DV_NEXUS_ID,
        id: 34
    };
    api.lookupModReference(smModReference).then((result: types.ILookupResult) => {

    });

    return Promise.resolve({ instructions });
}

// Custom Car Loader

export default main;
