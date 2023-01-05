import { Input, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../lexer"
import { Wrapper } from "./wrapper"

export class Reader implements Tokenizer {
    name: string
    regex: RegExp
    type: TokenizerType = "reader"
    parent!: Wrapper
    source!: Input
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    constructor(name: string, regex: RegExp, options?: TokenizerOptions) {
        this.name = name
        this.regex = regex
        if (options) {
            this.options = options
        }
    }

    fragment() {
        return this.options.fragment || false
    }

    nullable(){
        return this.options.mode == 'normal' ? this.options.nullable || false : false
    }

    clone(setting?: { name?: string }, options?: TokenizerOptions) {
        let _ = Object.assign(this, setting ? setting : {})
        if (options) {
            _.options = options
        }
        return _
    }

    test() {
        const m = this.regex.exec(this.source.to_end())
        return m ? m.index === 0 : false
    }

    match() {
        return this.test() && this.regex.exec(this.source.to_end())
    }

    read(): Token | undefined {
        const match = this.match()
        const start_line = this.source.line + 0
        const start_col = this.source.column + 0
        if (match) {
            const start = this.source.index
            const end = start + match[0].length + 0
            const value = this.source.seek(match[0].length)
            return new Token(this.name, value, {
                start: {
                    line: start_line,
                    column: start_col
                },
                end: {
                    line: this.source.line,
                    column: this.source.column
                },
                range: [start, end],
                size: value.length
            })
        }
        if (this.nullable()) {
            return undefined
        }
        throw new Error(`${this.source.name}:${start_line}:${start_col}\n${this.source.pan([-100, 0], true)} <- missing ${this.regex}`)
    }
}