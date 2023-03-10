import path from 'path';
import { fs, log, types } from 'vortex-api';
import { IRule } from 'vortex-api/lib/extensions/mod_management/types/IMod';
import { DV_GAME, SKIN_MANAGER, NUMBER_MANAGER, CCL, ZSOUNDS, IDvDependency } from './dv_constants';

// Mod Installers
//---------------------------------------------------------------------------------------------------------------
// Utility
function checkGameIsDV(gameId: string): boolean {
    return gameId === DV_GAME.nexusId;
}

function containsDvFile(files: string[], searchName: string, gameId: string): Promise<types.ISupportedResult> {
    const supported = (
        (gameId === DV_GAME.nexusId) &&
        (!!files.find(f => path.basename(f).toLowerCase() === searchName))
    );

    return Promise.resolve({
        supported,
        requiredFiles: []
    });
}

function addRequirement(instructions: types.IInstruction[], dependency: IDvDependency, versions = '*', reqType = 'requires') {
    const modRef: types.IModReference & types.IReference = {
        gameId: DV_GAME.nexusId,
        repo: {
            repository: 'nexus',
            gameId: DV_GAME.nexusId,
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
//---------------------------------------------------------------------------------------------------------------
function checkIfCodeMod(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvFile(files, DV_GAME.codeModConfig, gameId);
}

function installCodeMod(files: string[]) {
    const jsonFile = files.find(f => path.basename(f).toLowerCase() === DV_GAME.codeModConfig);
    const baseDir = (typeof(jsonFile) !== 'undefined') ? path.dirname(jsonFile) : '/';

    const filtered = files.filter(file => (file.indexOf(baseDir) !== -1) && (path.extname(file).toLowerCase() !== '.cache'));

    const instructions: types.IInstruction[] = [];
    
    // several framework mods contain empty folder trees for content, and we want to preserve these
    for (const file of filtered) {
        if (file.endsWith(path.sep)) {
            // make directory
            instructions.push({
                type: 'mkdir',
                destination: file
            });
            instructions.push({
                type: 'generatefile',
                destination: path.join(file, '.placeholder'),
                data: 'folder placeholder'
            });
        }
        else {
            // copy file
            instructions.push({
                type: 'copy',
                source: file,
                destination: file
            });
        }
    }

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-umm'
    });

    return Promise.resolve({ instructions });
}

// Skin Manager
//---------------------------------------------------------------------------------------------------------------
function checkIfSkin(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const supported = checkGameIsDV(gameId) && !!files.find(f => SKIN_MANAGER.isSkinImage(f));

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
        

        // detect if packed for CCL folder instead of skins dir
        if (file.startsWith(CCL.carsDir)) {
            log('info', 'Migrating skin mod from CCL folder to Skin Manager');

            const skinDirIdx = file.indexOf(SKIN_MANAGER.skinsDir);
            const carType = path.basename(file.substring(0, skinDirIdx));
            const relPathStart = file.indexOf(path.sep, skinDirIdx);
            const relPath = file.substring(relPathStart);

            dest = path.join(SKIN_MANAGER.baseDir, SKIN_MANAGER.skinsDir, carType, relPath);

        } else {
            if (file.startsWith(SKIN_MANAGER.skinsDir)) {
                // already packed inside Skins
                dest = path.join(SKIN_MANAGER.baseDir, file);
            } else {
                // need to add Skins folder to start of paths
                dest = path.join(SKIN_MANAGER.baseDir, SKIN_MANAGER.skinsDir, file);
            }
        }

        if (path.basename(file).toLowerCase() === NUMBER_MANAGER.configFile) {
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

    // add dependencies and mod suggestions
    addRequirement(instructions, SKIN_MANAGER.dependency);
    if (hasNumberConfig) {
        addRequirement(instructions, NUMBER_MANAGER.dependency, '*', 'recommends');
    }

    return Promise.resolve({ instructions });
}

// Custom Car Loader
//---------------------------------------------------------------------------------------------------------------
function checkIfCustomCar(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvFile(files, CCL.configFile, gameId);
}

async function extractCCLVersion(jsonFile: string | undefined): Promise<string> {
    if (typeof(jsonFile) !== 'undefined') {
        try
        {
            const contents = await fs.readFileAsync(jsonFile);
            const data = JSON.parse(contents);
            if (typeof(data.exportVersion) !== 'undefined') {
                return Promise.resolve('^' + data.exportVersion);
            }
        } catch {
            return Promise.resolve('*');
        }
    }
    return Promise.resolve('*');
}

async function installCustomCar(files: string[], destinationPath: string): Promise<types.IInstallResult> {
    const filtered = files.filter(file => !file.endsWith(path.sep));
    let hasBundledSkins = false;
    let hasNumberConfig = false;

    const instructions: types.IInstruction[] = filtered.map(file => {
        let dest = '';
        if (!(file.startsWith(CCL.carsDir) || file.startsWith(path.sep + CCL.carsDir))) {
            dest = path.join(CCL.baseDir, CCL.carsDir, file)
        } else {
            dest = path.join(CCL.baseDir, file);
        }

        if ((file.indexOf(SKIN_MANAGER.skinsDir) !== -1) && SKIN_MANAGER.isSkinImage(file)) {
            hasBundledSkins = true;
        }

        if (path.basename(file).toLowerCase() === NUMBER_MANAGER.configFile) {
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
        value: 'derailvalley-ccl'
    });

    let jsonFile = files.find(f => path.basename(f).toLowerCase() === CCL.configFile);
    if (typeof(jsonFile) !== 'undefined') {
        jsonFile = path.join(destinationPath, jsonFile);
    }

    // add dependencies and mod suggestions
    const cclVersion = await extractCCLVersion(jsonFile);
    addRequirement(instructions, CCL.dependency, cclVersion);
    if (hasBundledSkins) {
        addRequirement(instructions, SKIN_MANAGER.dependency, '*', 'recommends');
    }
    if (hasNumberConfig) {
        addRequirement(instructions, NUMBER_MANAGER.dependency, '*', 'recommends');
    }

    return Promise.resolve({ instructions });
}

// ZSounds
//---------------------------------------------------------------------------------------------------------------
async function checkIfZSound(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const result = await containsDvFile(files, ZSOUNDS.configFile, gameId);
    if (!result.supported) {
        return result;
    }
    
    const hasClips = !!files.find(ZSOUNDS.isSoundFile);
    return Promise.resolve({
        supported: hasClips,
        requiredFiles: []
    });
}

function installZSound(files: string[]): Promise<types.IInstallResult> {
    const filtered = files.filter(file => !file.endsWith(path.sep));

    const instructions: types.IInstruction[] = filtered.map(file => {
        let targetFile: string;

        const baseIdx = file.indexOf(ZSOUNDS.baseDir);
        if (baseIdx !== -1) {
            targetFile = file.substring(baseIdx);
        } else {
            targetFile = path.join(ZSOUNDS.baseDir, file);
        }

        return {
            type: 'copy',
            source: file,
            destination: targetFile
        };
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-zsound'
    });

    addRequirement(instructions, ZSOUNDS.dependency);

    return Promise.resolve({ instructions });
}

export function registerModHandlers(context: types.IExtensionContext, getModsDir: () => string): void {
    context.registerModType('derailvalley-umm', 21, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Code Mod'});
    context.registerModType('derailvalley-ccl', 22, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Car/Locomotive'});
    context.registerModType('derailvalley-zsound', 23, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Sound Replacement'});
    context.registerModType('derailvalley-skin', 25, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Reskin'});

    context.registerInstaller('derailvalley-umm', 21, checkIfCodeMod, installCodeMod);
    context.registerInstaller('derailvalley-ccl', 22, checkIfCustomCar, installCustomCar);
    context.registerInstaller('derailvalley-zsound', 23, checkIfZSound, installZSound);
    context.registerInstaller('derailvalley-skin', 25, checkIfSkin, installSkin);
}
