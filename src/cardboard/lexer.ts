import chalk from "chalk"
import { Input } from "./input"
import { Reader, Tokenizer } from "./tokenizer"

class CardboardLexer implements CardboardLexer {

    queue: Tokenizer<string, any>[] = []

    constructor(public source: Input) {
        const stack = [
            new Reader('hashtag', /#/),
            new Reader('content', /[^\r\n]*/)
        ]

        while (true) {
        }
    }
}

export class Cardboard {
    constructor() {

        let recursion_test = new Array<String>(3).fill("")
        const test = recursion_test.reduce((a, b, i) => {
            return `lexer hi_${i + 1}{${a}}`
        }, "yo= 'wow';")
        const raw = '#hi\n\r#yo\n\r' + test + ''
        console.log(raw)
        const input = new Input('./grammar/test.mccb', raw)
        try {
            new CardboardLexer(input)
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
            console.log(error)
        }
    }
}