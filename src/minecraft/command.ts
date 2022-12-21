import { existsSync, mkdirSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';
import { join } from 'path'
import { TreeNode } from '../lexer';
import { versions_validator } from './registries';

export const load = async (version: string, path: string = './command') => {
    const mcb_module = join('\.mcb_module')
    const mcb_module_mcb = join(mcb_module, '\.mcb')
    const mcb_resource = join(mcb_module_mcb, path)
    if (await versions_validator(version)) {
        const nbtdoc = `https://raw.githubusercontent.com/misode/mcmeta/${version}-summary/commands/data.min.json`
        if (!existsSync(mcb_resource)) mkdirSync(mcb_resource, { recursive: true })
        const file = join(mcb_resource, version + '.nbtdoc.json')
        writeFileSync(file, await fetch(nbtdoc).then(a => a.text()))
        return require(join('..', '..', file)) as TreeNode
    }
}