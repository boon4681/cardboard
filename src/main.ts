import chalk from "chalk";
import { Cardboard } from "./cardboard";
import { load_commands } from "./minecraft/command";

async function main() {
    // const commands = await load_commands('1.19')
    // const input = new Input("execute as @e[type=hello]")
    // if (commands) {
    //     const lexer = new Lexer(input, commands)
    //     try {
    //         lexer.read()
    //     } catch (error: any) {
    //         console.log(chalk.bgRed.rgb(255, 255, 255)(" ERROR "), error.message)
    //     }
    // }
    new Cardboard()
}


main()