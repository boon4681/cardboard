import { readFileSync, writeFileSync } from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import { CommandNode } from '../lexer'
import { makeNotExistDir, isExist } from '../utils/file'

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

export const load_registries = async (version: string, root: string = './') => {
    const mcb_module = path.join(root, '.mcb_module')
    const mcb_module_mcb = path.join(mcb_module, '.mcb')
    const mcb_resource = path.join(mcb_module_mcb, 'registries')
    const f_path = path.join(mcb_resource, version + '.registries.json')
    let load
    if (!isExist(f_path)) {
        try {
            load = await fetch(`https://raw.githubusercontent.com/misode/mcmeta/${version}-summary/registries/data.min.json`).then(a => a.json())
            makeNotExistDir([mcb_module, mcb_module_mcb, mcb_resource])
            writeFileSync(f_path, JSON.stringify(load))
        } catch (error) {
            return false
        }
    } else {
        const f = readFileSync(f_path, 'utf-8')
        load = JSON.parse(f)
    }
    return load as CommandNode
}