import chalk from "chalk"
import { readFileSync } from "fs"
import { Input } from "pulpboard"
import { Lexer } from "./lexer"
import { Parser } from "./parser"

export class Cardboard {
    constructor() {
        let recursion_test = new Array<String>(2).fill("")
        const test = recursion_test.reduce((a, b, i) => {
            return `lexer hi_${i + 1}{ ${a}}`
        }, `x="y\\""`)
        const raw = '#hi\n\r#yo\n\r' + test + ''
        // const raw = test + ''
        // console.log(raw)
        // writeFileSync('./test',raw)
        console.log(Buffer.byteLength(raw, 'utf8'))
        const input = new Input('./test/grammar/test.box', readFileSync('./test/grammar/test.box', {
            encoding: 'utf8'
        }))
        // const input = new Input('./test/grammar/test.box', raw)
        try {
            const lexer = new Lexer(input)
            const parser = new Parser()
            lexer.run()
            console.log(JSON.stringify(lexer.tokens))
            console.log(lexer.tokens.map(a => a.raw).join(''))
            console.log(lexer.tokens.map(a => {
                return {
                    name: a.name,
                    value: a.value
                }
            }))
            parser.parse(lexer)
        } catch (error: any) {
            console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
            console.log(error)
        }
    }
}