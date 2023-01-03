import { readFileSync, writeFileSync } from 'fs'
import fetch from 'node-fetch'
import path from 'path'
import { makeNotExistDir, isExist } from '../utils/file'

export const load_commands = async (version: string, root: string = './') => {
    const mcb_module = path.join(root, '.mcb_module')
    const mcb_module_mcb = path.join(mcb_module, '.mcb')
    const mcb_resource = path.join(mcb_module_mcb, 'command')
    const f_path = path.join(mcb_resource, version + '.command.json')
    let load
    if (!isExist(f_path)) {
        try {
            load = await fetch(`https://raw.githubusercontent.com/misode/mcmeta/${version}-summary/commands/data.min.json`).then(a => a.json())
            makeNotExistDir([mcb_module, mcb_module_mcb, mcb_resource])
            writeFileSync(f_path, JSON.stringify(load))
        } catch (error) {
            return false
        }
    } else {
        const f = readFileSync(f_path, 'utf-8')
        load = JSON.parse(f)
    }
    return load
}