import { Input, Lexer, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../../lexer"
import { Wrapper } from "./wrapper"

export class Reader implements Tokenizer {
    name: string
    regex: RegExp
    type: TokenizerType = "reader"
    parent!: Lexer
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

    test(source: Input) {
        const m = this.regex.exec(source.to_end())
        return m ? m.index === 0 : false
    }

    match(source: Input) {
        return this.test(source) && this.regex.exec(source.to_end())
    }

    read(source: Input): Token | undefined {
        const match = this.match(source)
        const start_line = source.line + 0
        const start_col = source.column + 0
        if (match) {
            const start = source.index
            const end = start + match[0].length + 0
            const value = source.seek(match[0].length)
            return new Token(this.name, value, {
                start: {
                    line: start_line,
                    column: start_col
                },
                end: {
                    line: source.line,
                    column: source.column
                },
                range: [start, end],
                size: value.length
            })
        }
        if (this.nullable()) {
            return undefined
        }
        throw new Error(`${source.name}:${start_line}:${start_col}\n${source.pan([-100, 0], true)} <- missing ${this.regex}`)
    }
}