import path from 'path';
import { fs, types, util } from 'vortex-api';
import { IRule } from 'vortex-api/lib/extensions/mod_management/types/IMod';

interface IDvDependency {
    modId: string,
    fileId: string,
    name: string
}

const DV_NEXUS_ID = 'derailvalley';
const STEAMAPP_ID = '588030';
const DV_MODS_DIR = 'Mods';
const DV_MOD_JSON = 'info.json';

const SM_MOD_DIR = 'SkinManagerMod';
const SM_SKINS_DIR = 'Skins';
const SKIN_IMAGE_TYPES = ['.jpeg', '.jpg', '.png'];
const SM_DEPENDENCY: IDvDependency = {
    modId: '34',
    fileId: '1564',
    name: 'Skin Manager'
};

const NM_XML_CONFIG = 'numbering.xml';
const NM_DEPENDENCY: IDvDependency = {
    modId: '197',
    fileId: '1563',
    name: 'Number Manager'
};

const CCL_MOD_DIR = 'DVCustomCarLoader';
const CCL_CARS_DIR = 'Cars';
const CCL_CAR_JSON = 'car.json';
const CCL_DEPENDENCY: IDvDependency = {
    modId: '324',
    fileId: '1565',
    name: 'Custom Car Loader'
};

const ZSOUNDS_DIR = 'ZSounds';
const ZSOUNDS_JSON = 'zsounds-config.json';
const ZSOUNDS_CLIPS = ['.ogg', '.wav'];
const ZSOUNDS_DEPENDENCY: IDvDependency = {
    modId: '249',
    fileId: '1356',
    name: 'ZSounds'
};

let missingUMMNotification = undefined;
let cachedModsDir = undefined;

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
        queryModPath: () => DV_MODS_DIR,
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

    context.registerModType('derailvalley-umm', 21, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Code Modification'});
    context.registerModType('derailvalley-ccl', 22, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Custom Car/Locomotive'});
    context.registerModType('derailvalley-zsound', 23, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Sound Replacement'});
    context.registerModType('derailvalley-skin', 25, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Skin Replacement'});

    context.registerInstaller('derailvalley-umm', 21, checkIfCodeMod, installCodeMod);
    context.registerInstaller('derailvalley-ccl', 22, checkIfCustomCar, installCustomCar);
    context.registerInstaller('derailvalley-zsound', 23, checkIfZSound, installZSound);
    context.registerInstaller('derailvalley-skin', 25, checkIfSkin, installSkin);

    return true;
}

function checkGameIsDV(gameId: string) {
    return gameId === DV_NEXUS_ID;
}

function getModsDir() {
    return cachedModsDir;
}

function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
        .then((game: types.IGameStoreEntry) => game.gamePath);
}

function prepareForModding(discovery: types.IDiscoveryResult, api: types.IExtensionApi) {
    const ummModsPath = path.join(discovery.path, DV_MODS_DIR);

    cachedModsDir = path.join(discovery.path, DV_MODS_DIR);
    return fs.ensureDirWritableAsync(ummModsPath)
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

// Mod Installers
//-----------------------------------------------
function containsDvFile(files: string[], searchName: string, gameId: string): Promise<types.ISupportedResult> {
    const supported = (
        (gameId === DV_NEXUS_ID) &&
        (!!files.find(f => path.basename(f).toLowerCase() === searchName))
    );

    return Promise.resolve({
        supported,
        requiredFiles: []
    });
}

function addRequirement(instructions: types.IInstruction[], dependency: IDvDependency, versions = '*', reqType = 'requires') {
    const modRef: types.IModReference & types.IReference = {
        gameId: DV_NEXUS_ID,
        repo: {
            repository: 'nexus',
            gameId: DV_NEXUS_ID,
            modId: dependency.modId,
            fileId: dependency.fileId
        },
        description: dependency.name,
        versionMatch: versions
    };

    const rule: types.IModRule & IRule = {
        type: reqType,
        reference: modRef,
        comment: dependency.name
    };

    instructions.push({
        type: 'rule',
        rule: rule
    });
}

// Default Code Mod
function checkIfCodeMod(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvFile(files, DV_MOD_JSON, gameId);
}

function installCodeMod(files: string[]) {
    const jsonFile = files.find(f => path.basename(f).toLowerCase() === DV_MOD_JSON);
    const baseDir = path.dirname(jsonFile);

    const filtered = files.filter(file => file.indexOf(baseDir) !== -1);

    const instructions: types.IInstruction[] = filtered.map(file => {
        if (file.endsWith(path.sep)) {
            // make directory
            return {
                type: 'mkdir',
                destination: file
            }
        }
        else {
            // copy file
            return {
                type: 'copy',
                source: file,
                destination: file
            }
        }
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-umm'
    });

    return Promise.resolve({ instructions });
}

// Skin Manager
function checkIfSkin(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const supported = (
        (gameId === DV_NEXUS_ID) &&
        (!!files.find(f => 
            (f.indexOf(SM_SKINS_DIR) !== -1) &&
            (SKIN_IMAGE_TYPES.includes(path.extname(f)))
        ))
    );

    return Promise.resolve({
        supported,
        requiredFiles: []
    });
}

function installSkin(files: string[]): Promise<types.IInstallResult> {

    const filtered = files.filter(file => !file.endsWith(path.sep));
    let hasNumberConfig = false;

    const instructions: types.IInstruction[] = filtered.map(file => {
        let dest = '';
        if (!(file.startsWith(SM_SKINS_DIR) || file.startsWith(path.sep + SM_SKINS_DIR))) {
            dest = path.join(SM_MOD_DIR, SM_SKINS_DIR, file)
        } else {
            dest = path.join(SM_MOD_DIR, file);
        }

        if (path.basename(file).toLowerCase() === NM_XML_CONFIG) {
            hasNumberConfig = true;
        }

        return {
            type: 'copy',
            source: file,
            destination: dest
        };
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-skin'
    });

    addRequirement(instructions, SM_DEPENDENCY);
    if (hasNumberConfig) {
        addRequirement(instructions, NM_DEPENDENCY, '*', 'recommends');
    }

    return Promise.resolve({ instructions });
}

// Custom Car Loader
function checkIfCustomCar(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvFile(files, CCL_CAR_JSON, gameId);
}

async function extractCCLVersion(jsonFile: string): Promise<string> {
    try
    {
        const contents = await fs.readFileAsync(jsonFile);
        const data = JSON.parse(contents);
        if (typeof(data.exportVersion) !== 'undefined') {
            return Promise.resolve('^' + data.exportVersion);
        }
        return Promise.resolve('*');
    } catch {
        return Promise.resolve('*');
    }
}

async function installCustomCar(files: string[], destinationPath: string): Promise<types.IInstallResult> {
    const filtered = files.filter(file => !file.endsWith(path.sep));

    const instructions: types.IInstruction[] = filtered.map(file => {
        let dest = '';
        if (!(file.startsWith(CCL_CARS_DIR) || file.startsWith(path.sep + CCL_CARS_DIR))) {
            dest = path.join(CCL_MOD_DIR, CCL_CARS_DIR, file)
        } else {
            dest = path.join(CCL_MOD_DIR, file);
        }

        return {
            type: 'copy',
            source: file,
            destination: dest
        };
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-ccl'
    });

    let jsonFile = files.find(f => path.basename(f).toLowerCase() === CCL_CAR_JSON);
    jsonFile = path.join(destinationPath, jsonFile);

    const cclVersion = await extractCCLVersion(jsonFile);
    addRequirement(instructions, CCL_DEPENDENCY, cclVersion);

    return Promise.resolve({ instructions });
}

// ZSounds
async function checkIfZSound(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const result = await containsDvFile(files, ZSOUNDS_JSON, gameId);
    if (result.supported) {
        return result;
    }
    
    const hasClips = !!files.find(f => ZSOUNDS_CLIPS.includes(path.extname(f)));
    return Promise.resolve({
        supported: hasClips,
        requiredFiles: []
    });
}

function installZSound(files: string[]): Promise<types.IInstallResult> {
    const filtered = files.filter(file => !file.endsWith(path.sep));

    const instructions: types.IInstruction[] = filtered.map(file => {
        return {
            type: 'copy',
            source: file,
            destination: path.join(ZSOUNDS_DIR, file)
        };
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-zsound'
    });

    addRequirement(instructions, ZSOUNDS_DEPENDENCY);

    return Promise.resolve({ instructions });
}

export default main;
