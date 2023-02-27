import path from "path";

export const DV_NEXUS_ID = 'derailvalley';
export const STEAMAPP_ID = '588030';
export const DV_MODS_DIR = 'Mods';

export const DV_GAME = {
    nexusId: 'derailvalley',
    steamAppId: '588030',
    baseModsDir: 'Mods',
    codeModConfig: 'info.json'
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
    baseDir: 'SkinManagerMod',
    skinsDir: 'Skins',
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
    carsDir: 'Cars',
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
    soundsDir: 'Sounds',
    configFile: 'zsounds-config.json',
    dependency: ZS_DEPENDENCY,

    isSoundFile: (file: string) => {
        return ZS_SOUND_FILES.includes(path.extname(file));
    }
};
