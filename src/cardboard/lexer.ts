import chalk from "chalk"
import { readFileSync } from "node:fs"
import { Group, GroupSerial } from "./base/group"
import { Reader } from "./base/reader"
import { IFWrapper, Wrapper, WrapperSerial } from "./base/wrapper"
import { Expression } from "./tokenizer/expression/Expression"
import { Lexer } from "./tokenizer/lexer_block/Lexer"
import { Strings } from "./tokenizer/strings/Strings"

export type Location = {
    line: number
    column: number
}

export type Range = [number, number]

export type Span = {
    start: Location
    end: Location
    range: Range
    size: number
}

export interface Config { }

export class Token {
    name: string
    raw: string
    span: Span

    constructor(name: string, raw: string, span: Span) {
        this.name = name
        this.raw = raw
        this.span = span
    }
}

export class Input {
    index: number = 0
    line: number = 1
    column: number = 0
    size: number

    line_index: number = 0

    last_index: number = 0

    test_count: number = 0

    stack: { index: number, line: number, column: number, size: number, line_index: number, last_index: number }[] = []

    constructor(public name: string, public input: string, public config?: Config) {
        this.size = input.length
    }

    push() {
        this.test_count++
        // console.log(">>>>>>>:::::::", this.test_count)
        this.stack.unshift({
            index: this.index,
            line: this.line,
            column: this.column,
            size: this.size,
            line_index: this.line_index,
            last_index: this.last_index
        })
    }

    pop() {
        const state = this.stack.shift()
        if (state) {
            this.index = state.index
            this.line = state.line
            this.column = state.column
            this.size = state.size
            this.line_index = state.line_index
            this.last_index = state.last_index
        }
    }

    private validate_move(step: number) {
        const value = this.index + step
        if (value < 0) {
            throw new Error(`index must be more than one. [0,${this.size}] ${value}`)
        }
        if (value > this.size) {
            throw new Error(`index must be lower than input size. [0,${this.size}] ${value}`)
        }
        return true
    }

    private clamp(step: number) {
        const value = this.index + step
        if (value < 0) {
            return 0
        }
        if (value > this.size) {
            return this.size
        }
        return value
    }

    private update_line(step: number) {
        const m = /\n/g.exec(this.pan(step, true))
        this.column += step
        if (m) {
            if (step >= 0) {
                this.line += m.length
            } else {
                this.line -= m.length
            }
            this.line_index = this.index
            this.column = 0
        }
    }

    wreak_havoc(i?: { result?: boolean, err?: Error }) {
        if (i) {
            if (this.last_index === this.index && !this.eof() && !i.result) {
                if (i && i.err) {
                    throw i.err
                }
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        } else {
            if (this.last_index === this.index && !this.eof()) {
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        }
        this.last_index = this.index
    }

    get(index: number, clamp?: boolean) {
        if (clamp) {
            return this.input[this.clamp(index)]
        }
        this.validate_move(index)
        return this.input[this.index + index]
    }

    move(step: number) {
        this.validate_move(step)
        return this.index + step
    }

    seek(step: number, clamp?: boolean) {
        if (clamp) {
            this.last_index = this.index + 0
            const result = this.input.slice(this.index, this.index = this.clamp(step))
            this.update_line(step)
            return result
        }
        this.validate_move(step)
        this.last_index = this.index + 0
        const result = this.input.slice(this.index, this.index += step)
        this.update_line(step)
        return result
    }

    pan(range: number | Range, clamp?: boolean) {
        let value = [0, 0]
        if (typeof range == 'number') {
            if (range > 0) {
                value[1] = range
            } else {
                value[0] = range
            }
        } else {
            value[0] = range[0]
            value[1] = range[1]
        }
        if (clamp) {
            return this.input.slice(this.clamp(value[0]), this.clamp(value[1]))
        }
        this.validate_move(value[0])
        this.validate_move(value[1])
        value[0] += this.index - 1
        value[1] += this.index - 1
        return this.input.slice(value[0], value[1])
    }

    to_end() {
        return this.input.slice(this.index)
    }

    code(step: number) {
        return this.input.charCodeAt(this.index + step)
    }

    eof() {
        return this.index == this.size
    }

    eol() {
        return this.code(0) === '\n'.charCodeAt(0) || this.eof()
    }

    skip() {
        this.index += 1
    }

    skip_char(char: string) {
        if (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }

    skip_until_not(char: string) {
        while (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }
}

export type TokenizerOptions = {
    mode: "pop"
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "push"
    tokenizer: Tokenizer | 'self'
    fragment?: boolean,
    ignored?: boolean
} | {
    mode: "normal"
    fragment?: boolean,
    ignored?: boolean,
    nullable?: boolean
}

export type TokenizerType = "reader" | "group" | "wrapper" | "if-wrapper"

export interface Tokenizer {
    name: string
    type: TokenizerType
    parent: Tokenizer | null
    options: TokenizerOptions
    nullable(): boolean
    fragment(): boolean
    read(input: Input): Token | Token[] | undefined
    test(input: Input): boolean
}

export class CardboardLexer {
    stack: Tokenizer[] = []
    constructor(public source: Input) {
        const header = new Wrapper('header')
        const hidden = new Reader('hidden', /[\s\r\n]*/, { mode: 'normal', ignored: false })
        const Hidden = new Reader('hidden', /[\s\r\n]+/, { mode: 'normal', ignored: false })
        const identifier = new Reader('identifier', /[_\w][_\w\d]*/)

        header.wrap(wrap => {
            wrap(new Reader('hashtag', /#/))
            wrap(new Reader('content', /[^\r\n]*/))
        })


        this.wrap(Hidden)
        this.wrap(header)
        this.wrap(Lexer)
    }

    wrap(tokenizer: Tokenizer) {
        this.stack.push(tokenizer)
    }

    read() {
        const tokens: Token[] = []
        while (!this.source.eof()) {
            for (const tokenizer of this.stack) {
                if (tokenizer.fragment()) continue
                const test = tokenizer.test(this.source)
                if (test) {
                    const result = tokenizer.read(this.source)
                    if (result) {
                        if (!tokenizer.options.ignored) {
                            tokens.push(...[result].flat(1))
                        }
                    }
                }
            }
            this.source.wreak_havoc({
                err: new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- no lexer`)
            })
        }
        // console.log(tokens.map(a=>a.raw).join(''))
        console.log("DONE")
    }
}

export class Cardboard {
    // async load(version: string) {
    //     if (await versions_validator(version)) {

    //     }
    //     throw new Error(`Cardboard: not found minecraft:${version} version`)
    // }

    constructor() {
        const raw = readFileSync('./grammar/test.mccb', 'utf8')
        const input = new Input('./grammar/test.mccb', raw)
        try {
            new CardboardLexer(input).read()
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
            console.log(error)
        }
    }
}