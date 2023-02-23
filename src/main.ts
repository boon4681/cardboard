import chalk from "chalk";
import { Input } from "pulpboard";
import { Cardboard } from "./cardboard";
import { load_commands } from "./minecraft/command";

async function main() {
    // const commands = await load_commands('1.19')
    const input = new Input('', `'hi'`)
    // if (commands) {
    //     const lexer = new Lexer(input, commands)
    //     try {
    //         lexer.read()
    //     } catch (error: any) {
    //         console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
    //     }
    // }
    const cardboard = new Cardboard('./test/grammar/test.box')
    console.log(
        cardboard.run(input)
    )
}

main()