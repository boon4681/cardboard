import { Reader } from "../base/reader"
import { Wrapper } from "../base/wrapper"

export const header = new Wrapper('header')
export const hidden = new Reader('hidden', /[\s\r\n]*/, { mode: 'normal', ignored: false })
export const Hidden = new Reader('hidden', /[\s\r\n]+/, { mode: 'normal', ignored: false })
export const identifier = new Reader('identifier', /[_\w][_\w\d]*/)