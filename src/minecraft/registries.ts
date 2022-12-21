import { existsSync, mkdirSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path'

let cached = ''

export const versions_validator = async (version: string) => {
    const versions_url = `https://meta.fabricmc.net/v1/versions`
    if (cached == version) {
        return true
    }
    const versions: { game: [{ version: string }] } = await fetch(versions_url).then(a => a.json());
    const check = versions['game'].map(a => a['version']).includes(version)
    cached = version
    return check
}

export const load_registries = async (version: string, path: string = './registries') => {
    const mcb_module = join('\.mcb_module')
    const mcb_module_mcb = join(mcb_module, '\.mcb')
    const mcb_resource = join(mcb_module_mcb, path)
    if (await versions_validator(version)) {
        const registries = `https://raw.githubusercontent.com/misode/mcmeta/${version}-summary/registries/data.min.json`
        if (!existsSync(mcb_resource)) mkdirSync(mcb_resource, { recursive: true })
        const file = join(mcb_resource, version + '.registries.json')
        writeFileSync(file, await fetch(registries).then(a => a.text()))
        return require(join('..', '..', file))
    }
}