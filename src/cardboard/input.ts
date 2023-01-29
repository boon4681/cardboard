export class Input {
    index: number = 0
    line: number = 1
    column: number = 0
    size: number

    line_index: number = 0

    last_index: number = 0

    test_count: number = 0

    stack: { index: number, line: number, column: number, size: number, line_index: number, last_index: number }[] = []

    constructor(public name: string, public source: string) {
        this.size = source.length
    }

    push() {
        this.test_count++
        // console.log(">>>>>>>:::::::", this.test_count)
        this.stack.unshift({
            index: this.index,
            line: this.line,
            column: this.column,
            size: this.size,
            line_index: this.line_index,
            last_index: this.last_index
        })
    }

    pop() {
        const state = this.stack.shift()
        if (state) {
            this.index = state.index
            this.line = state.line
            this.column = state.column
            this.size = state.size
            this.line_index = state.line_index
            this.last_index = state.last_index
        }
    }

    private validate_move(step: number) {
        const value = this.index + step
        if (value < 0) {
            throw new Error(`index must be more than one. [0,${this.size}] ${value}`)
        }
        if (value > this.size) {
            throw new Error(`index must be lower than input size. [0,${this.size}] ${value}`)
        }
        return true
    }

    private clamp(step: number) {
        const value = this.index + step
        if (value < 0) {
            return 0
        }
        if (value > this.size) {
            return this.size
        }
        return value
    }

    private update_line(step: number) {
        console.log(this.pan([-step - 1, step], true))
        const m = /\n/g.exec(this.pan([-step - 1, step], true))
        this.column += step
        if (m) {
            if (step >= 0) {
                this.line += m.length
            } else {
                this.line -= m.length
            }
            this.line_index = this.index
            this.column = 0
        }
    }

    wreak_havoc(i?: { result?: boolean, err?: Error }) {
        if (i) {
            if (this.last_index === this.index && !this.eof() && !i.result) {
                if (i && i.err) {
                    throw i.err
                }
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        } else {
            if (this.last_index === this.index && !this.eof()) {
                throw new Error("A havoc was happened somewhere in cardboard")
            }
        }
        this.last_index = this.index
    }

    get(index: number, clamp?: boolean) {
        if (clamp) {
            return this.source[this.clamp(index)]
        }
        this.validate_move(index)
        return this.source[this.index + index]
    }

    move(step: number) {
        this.validate_move(step)
        return this.index + step
    }

    seek(step: number, clamp?: boolean) {
        if (clamp) {
            this.last_index = this.index + 0
            const result = this.source.slice(this.index, this.index = this.clamp(step))
            this.update_line(step)
            return result
        }
        this.validate_move(step)
        this.last_index = this.index + 0
        const result = this.source.slice(this.index, this.index += step)
        this.update_line(step)
        return result
    }

    pan(range: number | [number, number], clamp?: boolean) {
        let value = [0, 0]
        if (typeof range == 'number') {
            if (range > 0) {
                value[1] = range
            } else {
                value[0] = range
            }
        } else {
            value[0] = range[0]
            value[1] = range[1]
        }
        if (clamp) {
            return this.source.slice(this.clamp(value[0]), this.clamp(value[1]))
        }
        this.validate_move(value[0])
        this.validate_move(value[1])
        value[0] += this.index - 1
        value[1] += this.index - 1
        return this.source.slice(value[0], value[1])
    }

    to_end() {
        return this.source.slice(this.index)
    }

    code(step: number) {
        return this.source.charCodeAt(this.index + step)
    }

    eof() {
        return this.index == this.size
    }

    eol() {
        return this.code(0) === '\n'.charCodeAt(0) || this.eof()
    }

    skip() {
        this.index += 1
    }

    skip_char(char: string) {
        if (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }

    skip_until_not(char: string) {
        while (char.charCodeAt(0) == this.code(0)) {
            this.skip()
        }
    }
}