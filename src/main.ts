import chalk from "chalk";
import { readFileSync } from "fs";
import { Input } from "pulpboard";
import { Cardboard } from "./cardboard";
import { load_commands } from "./minecraft/command";

async function main() {
    // const commands = await load_commands('1.19')
    try {
        const input = new Input('', `'hi'`)
        const grammar = new Input('./test/grammar/test.box', readFileSync('./test/grammar/test.box', {
            encoding: 'utf8'
        }))
        const cardboard = new Cardboard(grammar,true)
        console.log(
            cardboard.run(input)
        )
    } catch (error: any) {
        console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
    }
    // if (commands) {
    //     const lexer = new Lexer(input, commands)
    //     try {
    //         lexer.read()
    //     } catch (error: any) {
    //         console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
    //     }
    // }
}

main()