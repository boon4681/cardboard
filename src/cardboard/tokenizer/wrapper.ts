import chalk from "chalk"
import { Input, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../lexer"

export class Wrapper implements Tokenizer {
    name: string
    type: TokenizerType = "wrapper"
    parent!: Wrapper
    source!: Input
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

    stack: Tokenizer[] = []
    queue: Tokenizer[] = []

    constructor(name: string, source: Input, options?: TokenizerOptions) {
        this.name = name
        this.source = source
        if (options) {
            this.options = options
        }
    }

    fragment(): boolean {
        return this.options.fragment || false
    }

    nullable() {
        return this.options.mode == 'normal' ? this.options.nullable || false : false
    }

    box(callback: (wrap: (reader: Tokenizer) => void) => void) {
        const self = this
        function wrap(reader: Tokenizer) {
            reader.parent = self
            reader.source = self.source
            self.stack.push(reader)
        }
        callback(wrap)
        return this
    }

    read(): Token[] {
        const tokens: Token[] = []
        for (const tokenizer of this.stack) {
            if (tokenizer.fragment()) continue
            if (tokenizer.test()) {
                const result = tokenizer.read()
                if (result) {
                    if (tokenizer.type == 'reader' || tokenizer.type == 'wrapper') {
                        if (tokenizer.options.mode == "push") {
                            if (tokenizer.options.tokenizer === 'self') {
                                this.queue.unshift(this)
                            } else {
                                tokenizer.options.tokenizer.parent = this
                                this.queue.unshift(tokenizer.options.tokenizer)
                            }
                        }
                        if (tokenizer.options.mode == "pop") {
                            this.parent.queue.shift()
                        }
                        if (!tokenizer.options.ignored) {
                            tokens.push(...[result].flat(1))
                        }
                    } else if (tokenizer.type == "group") {
                        if (!tokenizer.options.ignored) {
                            tokens.push(...result as Token[])
                        }
                    } else if (tokenizer.type == "if-wrapper") {
                        tokens.push(...result as Token[])
                        return tokens
                    }
                } else {
                    if (!tokenizer.nullable() && tokenizer.type != 'if-wrapper') {
                        throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${tokenizer.name}`)
                    }
                }
            } else {
                if (!tokenizer.nullable() && tokenizer.type != 'if-wrapper') {
                    throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${tokenizer.name}`)
                }
            }
        }
        while (this.queue.length > 0) {
            const reader = this.queue[0]
            const result = reader.read()
            if (result) {
                tokens.push(...[result].flat(1))
            }
            else {
                throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${reader.name}`)
            }
        }
        return tokens
    }

    test(): boolean {
        this.source.push()
        if (this.stack.length > 0) {
            let reader: Tokenizer = this.stack[0]
            let i = 0
            while (!reader.test() &&
                (
                    (reader.type == 'if-wrapper') ||
                    (reader.nullable())
                ) &&
                i < this.stack.length
            ) {
                reader = this.stack[i]
                i++
            }
            for (let j = i; j < this.stack.length; j++) {
                const tokenizer = this.stack[j];
                if (tokenizer.test() || (!tokenizer.test() && tokenizer)) {
                    tokenizer.read()
                } else {
                    this.source.pop()
                    return false
                }
            }
            this.source.pop()
            return true
        }
        this.source.pop()
        return false
    }
}