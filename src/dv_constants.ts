import path from "path";

export const DV_GAME = {
    nexusId: 'derailvalley',
    steamAppId: '588030',
    bepinexDir: 'BepInEx',
    pluginsDir: 'plugins',
    contentDir: 'content',
    codeModExtension: '.dll'
};

export interface IDvDependency {
    modId: string,
    fileId: string,
    name: string
}

const SM_DEPENDENCY: IDvDependency = {
    modId: '34',
    fileId: '1564',
    name: 'Skin Manager'
};
const SM_IMAGES = ['.jpeg', '.jpg', '.png'];
export const SKIN_MANAGER = {
    baseDir: 'SkinManager',
    skinsDir: 'skins',
    legacySkinsDir: 'Skins',
    dependency: SM_DEPENDENCY,

    isSkinImage: (file: string) => {
        return SM_IMAGES.includes(path.extname(file));
    }
};

const NM_DEPENDENCY: IDvDependency = {
    modId: '197',
    fileId: '1563',
    name: 'Number Manager'
};
export const NUMBER_MANAGER = {
    configFile: 'numbering.xml',
    dependency: NM_DEPENDENCY
};

const CCL_DEPENDENCY: IDvDependency = {
    modId: '324',
    fileId: '1565',
    name: 'Custom Car Loader'
}
export const CCL = {
    baseDir: 'DVCustomCarLoader',
    carsDir: 'cars',
    configFile: 'car.json',
    dependency: CCL_DEPENDENCY
};

const ZS_DEPENDENCY: IDvDependency = {
    modId: '249',
    fileId: '1356',
    name: 'ZSounds'
}
const ZS_SOUND_FILES = ['.ogg', '.wav'];
export const ZSOUNDS = {
    baseDir: 'ZSounds',
    soundsDir: 'sounds',
    configFile: 'zsounds-config.json',
    dependency: ZS_DEPENDENCY,

    isSoundFile: (file: string) => {
        return ZS_SOUND_FILES.includes(path.extname(file));
    }
};

const MAPIFY_DEPENDENCY: IDvDependency = {
    modId: '593',
    fileId: '1630',
    name: 'Mapify'
}
export const MAPIFY = {
    baseDir: 'Mapify',
    mapsDir: 'maps',
    configFile: 'mapInfo.json',
    dependency: MAPIFY_DEPENDENCY,
};
