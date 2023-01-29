import { Input } from "./input"

export type Range = [number, number]

export type Location = {
    line: number
    column: number
}

export type Span = {
    start: Location
    end: Location
    range: Range
    size: number
}

export class Token<A> {
    name: string
    raw: string
    value: A
    span: Span

    constructor(name: string, raw: string, value: A, span: Span) {
        this.name = name
        this.raw = raw
        this.span = span
        this.value = value
    }
}

export interface Tokenizer<A, B> {
    name: string
    readonly casting: boolean

    test(lexer: Lexer, source: Input): boolean
    read(lexer: Lexer, source: Input): Token<A>
}

export interface Lexer {
    queue: Tokenizer<string, any>[];
}

abstract class TnzBase<A, B> implements Tokenizer<A, B> {
    name: string

    readonly casting: boolean = false;

    constructor(name: string) {
        this.name = name
    }

    test(lexer: Lexer, source: Input): boolean {
        throw new Error("Method not implemented.")
    }

    read(lexer: Lexer, source: Input): Token<A> {
        throw new Error("Method not implemented.")
    }
}

export class Reader extends TnzBase<string, string> {
    regex: RegExp

    constructor(name: string, regex: RegExp) {
        super(name)
        this.regex = regex
    }

    test(lexer: Lexer, source: Input): boolean {
        const m = this.regex.exec(source.to_end())
        return m ? m.index === 0 : false
    }

    match(lexer: Lexer, source: Input) {
        return this.test(lexer, source) && this.regex.exec(source.to_end())
    }

    read(lexer: Lexer, source: Input): Token<string> {
        const match = this.match(lexer, source)
        const start_line = source.line + 0
        const start_col = source.column + 0
        if (match) {
            const start = source.index
            const end = start + match[0].length + 0
            const value = source.seek(match[0].length)
            return new Token<string>(this.name, value, this.cast(value), {
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
        throw new Error(`${source.name}:${start_line}:${start_col}\n${source.pan([-100, 0], true)} <- missing ${this.regex}`)
    }

    cast(value: string): string {
        return value
    }
}

export class Wrapper extends TnzBase<string, string>{

}