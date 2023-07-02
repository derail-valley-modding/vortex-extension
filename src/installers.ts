import path from 'path';
import { fs, types } from 'vortex-api';
import { IRule } from 'vortex-api/lib/extensions/mod_management/types/IMod';
import { DV_GAME, SKIN_MANAGER, NUMBER_MANAGER, CCL, ZSOUNDS, MAPIFY, IDvDependency } from './dv_constants';

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

function containsDvCode(files: string[], gameId: string): Promise<types.ISupportedResult> {
    const supported = (
        (gameId === DV_GAME.nexusId) &&
        (!!files.find(f => path.extname(f).toLowerCase() === DV_GAME.codeModExtension))
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

function getContentStructure(contentType: string): string[] {
    return [
        DV_GAME.contentDir,
        contentType
    ];
}

function extendDestinationFile(fileName: string, targetFolders: string[] = []): string {
    let newName = fileName;
    
    if (newName.startsWith(path.sep)) {
        newName = newName.substring(1);
    }
    
    if (newName.startsWith(DV_GAME.bepinexDir)) {
        newName = newName.substring(DV_GAME.bepinexDir.length);

        if (newName !== path.sep) {
            newName = newName.substring(1);
        }
    }

    if (targetFolders.length < 1) {
        return newName;
    }

    for (let currentLevel = 0; currentLevel < targetFolders.length; currentLevel++) {
        if (newName.startsWith(targetFolders[currentLevel])) {
            // found a matching level, move one level up and append each of the parents

            const parts = targetFolders.slice(0, currentLevel);
            parts.push(newName);

            return path.join(...parts);
        }
    }

    const parts = [...targetFolders];
    parts.push(newName);
    return path.join(...parts);
}

// Default Code Mod
//---------------------------------------------------------------------------------------------------------------
function checkIfCodeMod(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvCode(files, gameId);
}

function installCodeMod(files: string[]) {
    const filtered = files.filter(file => path.extname(file).toLowerCase() !== '.cache');

    const instructions: types.IInstruction[] = [];
    
    // several framework mods contain empty folder trees for content, and we want to preserve these
    for (const file of filtered) {
        const dest = extendDestinationFile(file);

        if (dest === path.sep) continue;

        if (file.endsWith(path.sep)) {
            // make directory
            instructions.push({
                type: 'mkdir',
                destination: dest
            });
            instructions.push({
                type: 'generatefile',
                destination: path.join(dest, '.placeholder'),
                data: 'folder placeholder'
            });
        }
        else {
            // copy file
            instructions.push({
                type: 'copy',
                source: file,
                destination: dest
            });
        }
    }

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-code'
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

    const destStructure = [
        DV_GAME.contentDir,
        SKIN_MANAGER.skinsDir
    ]

    const instructions: types.IInstruction[] = filtered.map(file => {
        let dest = file;
        
        // remove legacy skin folder name
        if (dest.startsWith('Skins')) {
            dest = file.substring('Skins'.length + 1);
        }

        dest = extendDestinationFile(dest, destStructure);

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

    const destStructure = [
        DV_GAME.contentDir,
        CCL.carsDir
    ];

    const instructions: types.IInstruction[] = filtered.map(file => {
        const dest = extendDestinationFile(file, destStructure);

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

    const destStructure = getContentStructure(ZSOUNDS.soundsDir);

    const instructions: types.IInstruction[] = filtered.map(file => {
        const targetFile = extendDestinationFile(file, destStructure);

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

// Mapify
//---------------------------------------------------------------------------------------------------------------
function checkIfMap(files: string[], gameId: string): Promise<types.ISupportedResult> {
    return containsDvFile(files, MAPIFY.configFile, gameId);
}

async function extractMapifyVersion(jsonFile: string | undefined): Promise<string> {
    if (typeof(jsonFile) !== 'undefined') {
        try
        {
            const contents = await fs.readFileAsync(jsonFile);
            const data = JSON.parse(contents);
            if (typeof(data.version) !== 'undefined') {
                return Promise.resolve('^' + data.version);
            }
        } catch {
            return Promise.resolve('*');
        }
    }
    return Promise.resolve('*');
}

async function installMap(files: string[], destinationPath: string): Promise<types.IInstallResult> {
    const filtered = files.filter(file => !file.endsWith(path.sep));

    const destStructure = getContentStructure(MAPIFY.mapsDir);

    const instructions: types.IInstruction[] = filtered.map(file => {
        const targetFile = extendDestinationFile(file, destStructure);

        return {
            type: 'copy',
            source: file,
            destination: targetFile
        };
    });

    instructions.push({
        type: 'setmodtype',
        value: 'derailvalley-map'
    });

    let jsonFile = files.find(f => path.basename(f).toLowerCase() === MAPIFY.configFile);
    if (typeof(jsonFile) !== 'undefined') {
        jsonFile = path.join(destinationPath, jsonFile);
    }

    const mapifyVersion = await extractMapifyVersion(jsonFile);
    addRequirement(instructions, MAPIFY.dependency, mapifyVersion);

    return Promise.resolve({ instructions });
}

export function registerModHandlers(context: types.IExtensionContext, getModsDir: () => string): void {
    context.registerModType('derailvalley-code', 21, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Code Mod'});
    context.registerModType('derailvalley-ccl', 22, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Car/Locomotive'});
    context.registerModType('derailvalley-zsound', 23, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Sound Replacement'});
    context.registerModType('derailvalley-skin', 25, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Reskin'});
    context.registerModType('derailvalley-map', 26, checkGameIsDV, getModsDir, () => Promise.resolve(false), { name: 'Map'});

    context.registerInstaller('derailvalley-code', 21, checkIfCodeMod, installCodeMod);
    context.registerInstaller('derailvalley-ccl', 22, checkIfCustomCar, installCustomCar);
    context.registerInstaller('derailvalley-zsound', 23, checkIfZSound, installZSound);
    context.registerInstaller('derailvalley-skin', 25, checkIfSkin, installSkin);
    context.registerInstaller('derailvalley-map', 26, checkIfMap, installMap);
}
