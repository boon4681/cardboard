# cardboard

Cardboard is a lexer language for Minecraft syntax.

```ts
@bind(brigadier:string)
lexer String {
    lexer Quoted {
        (
            text = "[\\\']+";
            escape = '\\\\[tbrn\'\"\\\\]';
        )*
        close = "'" -> pop;
    }

    lexer DoubleQuoted {
        (
            text = "[\\\"]+";
            escape = '\\\\[tbrn\'\"\\\\]';
        )*
        double_quoted_close = '"' -> pop;
    }

    @if("'"){
        open = "'" -> push(Quoted);
    } -> end

    double_quoted_open = '"' -> push(DoubleQuoted);
}
```

## Grammar

### Keywords

keywords cannot be used as identifiers:

- lexer
- @bind
- @if

#### Identifier

> **syntax in regex:**
>
> `[_\w]\[_\w\d]*`

used as lexer name and token name

Example:

```ts
hello
```

#### Cardboard meta

> **syntax in regex:**
>
> `\@(?:[_\w][_\w\d]*)(?:\.(?:[_\w][_\w\d]*))*`

Example:

```ts
@registries.block
```

#### Strings

> **qouted string syntax:**
>
> `'` `.*` `'`
>
> **double qouted string syntax:**
>
> `"` `.*` `"`

Example:

```ts
"hi this is cardboard"

'cardboard built with pulpboard'
```

#### Token

> **syntax:**
>
> `name` `=` (`strings`, `lexer name`, `cardboard meta`, `group`, `wrapper`) `;`

Example

```ts
hi = "HI" hello @registries.block
```

#### Group

> **read once syntax:**
>
> `(` `token` `)`
>
> **read once or repeat syntax:**
>
> `(` `token` `)+`
>
> **read once or null syntax:**
>
> `(` `token` `)?`
>
> **read null or repeat syntax:**
>
> `(` `token` `)*`

lexer will read items in a group and stoped when find the available index

#### Wrapper

> **read once syntax:**
>
> `[` `token` `]`
>
> **read once or repeat syntax:**
>
> `[` `token` `]+`
>
> **read once or null syntax:**
>
> `[` `token` `]?`
>
> **read null or repeat syntax:**
>
> `[` `token` `]*`

lexer will read items in a wrapper and stoped when reached the last index

#### If statement

> **Not ended syntax:**
>
> `@if` `(` `strings` as a condition `)` `{` `if-context` `}`
>
> **Ended syntax:**
>
> `@if` `(` `strings` as a condition `)` `{` `if-context` `}` `-> end`

Ended means cardboard will not continue on next token in lexer

#### If Context

> **syntax:**
>
> `token` | `if-statement` | `group` | `wrapper`

#### Lexer Declaration

> **syntax:**
>
> `lexer` `name` `{` `lexer-context` `}`

#### Lexer Context

> **syntax:**
>
> `lexer` | `token` | `if-statement` | `group` | `wrapper`
