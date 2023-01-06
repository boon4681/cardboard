import chalk from "chalk"
import { Input, Token, Tokenizer, TokenizerOptions, TokenizerType } from "../lexer"
import { Wrapper } from "./wrapper"

export class Group implements Tokenizer {
    name: string
    type: TokenizerType = "group"
    parent!: Wrapper
    source!: Input
    stack: Tokenizer[] = []
    options: TokenizerOptions = { mode: 'normal', fragment: false, ignored: false, nullable: false }

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

    wrap(callback: (wrap: (reader: Tokenizer) => void) => void) {
        const self = this
        function wrap(tokenizer: Tokenizer) {
            tokenizer.parent = self.parent
            tokenizer.source = self.source
            self.stack.push(tokenizer)
        }
        callback(wrap)
        return this
    }

    read(): Token[] | undefined {
        console.log(this.name)
        for (const tokenizer of this.stack) {
            if (tokenizer.fragment()) continue
            if (tokenizer.test()) {
                const result = tokenizer.read()
                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@", tokenizer.name,tokenizer.type)
                if (result) {
                    if([result].flat(1).length==0) return undefined
                    if (tokenizer.type == 'reader' || tokenizer.type == 'wrapper') {
                        if (tokenizer.options.mode == "push") {
                            if (tokenizer.options.tokenizer === 'self') {
                                this.parent.queue.unshift(this)
                            } else {
                                tokenizer.options.tokenizer.parent = this
                                this.parent.queue.unshift(tokenizer.options.tokenizer)
                            }
                        }
                        if (tokenizer.options.mode == "pop") {
                            this.parent.parent.queue.shift()
                        }
                        if (tokenizer.options.ignored) {
                            return undefined
                        } else {
                            return [...[result].flat(1)]
                        }
                    } else if (tokenizer.type == "group") {
                        if (tokenizer.options.ignored) {
                            return undefined
                        } else {
                            return result as Token[]
                        }
                    } else if (tokenizer.type == "if-wrapper") {
                        return result as Token[]
                    }
                }
            }
        }
        if (!this.nullable()) {
            throw new Error(`No viable alternative.\n${chalk.red(this.source.pan(-100, true))}<- is not ${this.name}`)
        }
        return undefined
    }

    test(): boolean {
        console.log('>>>>>>>>>>>>>>>',this.name)
        for (const tokenizer of this.stack) {
            console.log(';;;;;;;;;;;;',tokenizer.name,tokenizer.type,tokenizer.test())
            if (tokenizer.test()) {
                return true
            }
        }
        return false
    }
}

export class GroupContinuous extends Group {
    read(): Token[] | undefined {
        const tokens: Token[] = []
        while (this.test()) {
            const result = super.read()
            console.log('GroupContinuous',result?.length)
            if (result && result.length > 0) {
                tokens.push(...[result].flat(1))
            } else {
                return undefined
            }
        }
        return tokens
    }
}