import chalk from "chalk";
import { readFileSync } from "fs";
import { Input, Reader, Wrapper } from "../lexer";
import { versions_validator } from "../minecraft/registries";


export class Cardboard {
    // async load(version: string) {
    //     if (await versions_validator(version)) {

    //     }
    //     throw new Error(`Cardboard: not found minecraft:${version} version`)
    // }

    constructor() {
        const raw = readFileSync('./grammar/lexer.mccb', 'utf8')
        const input = new Input(raw)
        try {
            new CardboardWrapper(input).read()
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
        }
    }
}


export class CardboardWrapper extends Wrapper {

    constructor(source: Input) {
        super(source, 'cardboard')
        const HeaderWrapper = new Wrapper(source, 'header')
        HeaderWrapper.cwrap((wrap) => {
            wrap(new Reader({
                name: 'hashtag',
                regex: /\#/
            }))
            wrap(new Reader({
                name: 'content',
                regex: /[^\r\n]+(\n|\r\n)/
            }))
        })
        this.wrapper_stack.push(HeaderWrapper)
    }
    read() {
        let o = 0
        while (!this.source.eof()) {
            o++
            if (this.wrapper_stack.length == 0) {
                for (const wrapper of this.wrapper_stack) {
                    const test = wrapper.test()
                    if (test) {
                        
                        for (const lexer of wrapper.stack) {                            
                            if (test.name === "ErrorCharacter") {
                                throw new Error("Found unexpected Character " + test.read())
                            }
                            const token = lexer.read()
                            console.log(token)
                        }
                        break
                    }
                }
            } else {
                const test = this.wrapper_stack[0].test()
                if (test) {
                    if (test.name === "ErrorCharacter") {
                        throw new Error("Found unexpected Character " + test.read())
                    }
                    const token = test.read()
                    console.log(token)
                }
                else {
                    throw new Error('No viable alternative')
                }
            }
            this.source.make_havoc()
            if (o == 6) break
        }
    }
}

export class LexerWrapper extends Wrapper {

}