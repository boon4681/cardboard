import chalk from "chalk"
import { readFileSync, writeFileSync } from "fs"
import { Group, GroupSerial, IFWrapper, Input, LexerBase, Reader, Wrapper, WrapperSerial } from 'pulpboard'

export class Lexer extends LexerBase {
    constructor(source: Input) {
        const lexer = new Wrapper('lexer')
        const lexer_block = new Wrapper('lexer.block')
        const hidden = new Reader('hidden', /[\s\r\n]*/).set({ mode: 'normal', ignore: true, fragment: false, nullable: false })
        const Hidden = new Reader('hidden', /[\s\r\n]+/).set({ mode: 'normal', ignore: true, fragment: false, nullable: false })
        const identifier = new Reader('identifier', /[_\w][_\w\d]*/)
        const expr = new Wrapper('expr')
        const expr_value = new Group('expr.value')
        const strings = new Wrapper('strings')
        const qouted_strings = new Wrapper("strings.qouted")
        const double_qouted_strings = new Wrapper("strings.double_qouted")
        const group = new Wrapper('group')
        const group_children = new Wrapper('group.children')
        const wrapper = new Wrapper('wrapper')
        const wrapper_children = new Wrapper('wrapper.children')

        wrapper.add([
            new Reader('wrapper.children.open', /\[/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: wrapper_children }),
            new Reader('wrapper.mode',/[\*\+\?]/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
        ])

        group.add([
            new Reader('group.children.open', /\(/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: group_children }),
            new Reader('group.mode',/[\*\+\?]/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true })
        ])

        wrapper_children.add([
            new GroupSerial('wrapper.children').add([
                Hidden,
                expr,
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('wrapper.children.close', /\]/).set({ mode: 'pop', ignore: false, nullable: false })
        ])

        group_children.add([
            new GroupSerial('group.children').add([
                Hidden,
                expr,
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('group.children.close', /\)/).set({ mode: 'pop', ignore: false, nullable: false })
        ])

        const if_stats = new Wrapper('if')
        const if_stats_block = new Wrapper('if.block')

        const header = new Wrapper('header').add([
            new Reader('hashtag', /#/),
            new Reader('content', /[^\r\n]*/)
        ])

        lexer.add([
            new IFWrapper('lexer.bind', new Reader('lexer.bind', /\@bind/)).add([
                new Reader('lexer.bind', /\@bind/),
                hidden,
                new Reader('lexer.bind.punctuation.open', /\(/),
                hidden,
                new Reader('lexer.bind.name', /([\w][_\w\d]*)\:([\w][_\w\d]*)|([\w][_\w\d]*)/),
                hidden,
                new Reader('lexer.bind.punctuation.close', /\)/),
                hidden
            ]),
            new Reader('lexer.keyword', /lexer/),
            Hidden,
            identifier.fragment('lexer.name'),
            hidden,
            new Reader('lexer.block.open', /\{/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: lexer_block }),
        ])

        lexer_block.add([
            new GroupSerial('lexer.context').add([
                lexer.clone(),
                expr,
                Hidden,
                if_stats,
                group,
                wrapper
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('lexer.block.close', /\}/).set({ mode: 'pop', ignore: false, nullable: false })
        ])

        expr.add([
            identifier.fragment('expr.variable'),
            hidden,
            new Reader('expr.assignment', /=/),
            hidden,
            expr_value,
            new WrapperSerial('expr.value').add([
                Hidden,
                expr_value
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            hidden,
            new IFWrapper('expr.options', new Reader('expr.options.start.check', /->/)).add([
                new Reader('expr.options.start', /->/),
                hidden,
                new Wrapper('expr.options.option').add([
                    identifier,
                    new IFWrapper('expr.options.option.punctuation.open.check', new Reader('expr.options.option.punctuation.open', /\(/)).add([
                        new Reader('expr.options.option.punctuation.open', /\(/),
                        identifier,
                        new Reader('expr.options.option.punctuation.close', /\)/)
                    ])
                ])
            ]),
            new Reader('expr.end', /\;/)
        ])

        expr_value.add([
            identifier.fragment('lexer.name'),
            strings,
            new Reader('cardboard.metadata', /\@(?:[_\w][_\w\d]*)(?:\.(?:[_\w][_\w\d]*))*/),
            group,
            wrapper
        ])

        if_stats.add([
            new Reader('if.keyword', /\@if/),
            hidden,
            new Reader('if.condition.open', /\(/),
            hidden,
            strings,
            hidden,
            new Reader('if.condition.close', /\)/),
            hidden,
            new Reader('if.block.open', /\{/).set({ mode: 'push', ignore: false, nullable: false, tokenizer: if_stats_block }),
            hidden,
            new IFWrapper('if.block.stop.check', new Reader('if.block.stop.check', /\-\>/)).add([
                new Reader('if.block.stop.start', /\-\>/),
                hidden,
                new Reader('if.block.stop', /end/)
            ])
        ])

        if_stats_block.add([
            new GroupSerial('lexer.context').add([
                expr,
                Hidden,
                if_stats,
                group,
                wrapper
            ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
            new Reader('if.block.close', /\}/).set({ mode: 'pop', ignore: false, nullable: false }),
        ])

        strings.add([
            new IFWrapper('strings.double_qouted', new Reader('strings.double_qouted.open', /\"/)).add([
                double_qouted_strings
            ]).stop(true),
            qouted_strings,
        ])

        qouted_strings.add([
            new Reader('strings.qouted.open', /\'/).set({
                mode: "push",
                ignore: false,
                nullable: false,
                tokenizer: new Wrapper('strings.qouted.text').add([
                    new GroupSerial('strings.text').add([
                        new Reader("text", /[^\\\'\n\r]+/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                        new Reader("escape", /\\[tbrn\"\'\\]/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                    ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                    new Reader('strings.qouted.close', /\'/).set({ mode: 'pop', ignore: false, nullable: false }),
                ]),
            })
        ])

        double_qouted_strings.add([
            new Reader('strings.double_qouted.open', /\"/).set({
                mode: "push",
                ignore: false,
                nullable: false,
                tokenizer: new Wrapper('strings.double_qouted.text').add([
                    new GroupSerial('strings.text').add([
                        new Reader("text", /[^\\\"\r\n]+/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                        new Reader("escape", /\\[tbrn\"\'\\]/).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                    ]).set({ mode: 'normal', ignore: false, fragment: false, nullable: true }),
                    new Reader('strings.double_qouted.close', /\"/).set({ mode: 'pop', ignore: false, nullable: false }),
                ]),
            })
        ])

        strings.merging = true
        header.merging = true

        const scheme = [
            header,
            lexer,
            Hidden
        ]
        super(source, scheme)
    }

    disable_debugger: boolean = true;
}