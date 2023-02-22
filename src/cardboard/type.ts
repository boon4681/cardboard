import { Node } from "./parser_scheme";
export interface Header extends Node{
    header:Node;
    children:(Node)[]
}
export interface LexerDeclaration extends Node{
    bind?:Node;
    keyword:Node;
    name:Node;
    children:(Node)[]
}
export interface Expression extends Node{
    name:Node;
    action?:Node;
    children:(Group|Wrapper|Node|Node)[]
}
export interface IfStatement extends Node{
    stop?:Node;
    children:(Node|Expression|IfStatement|Node)[]
}
export interface Group extends Node{
    mode:Node;
    children:(Expression|Node|Node)[]
}
export interface Wrapper extends Node{
    mode:Node;
    children:(Expression|Node|Node)[]
}
export interface Box extends Node{
    header:Header;
    children:(LexerDeclaration|Node|Node)[]
}