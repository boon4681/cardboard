import { Node } from "./parser_scheme";
export interface HeaderNode extends Node{
    header:Node;
    children:(Node)[]
}
export interface LexerDeclarationNode extends Node{
    decorator?:Node;
    keyword:Node;
    name:Node;
    children:(Node)[]
}
export interface ExpressionNode extends Node{
    name:Node;
    action?:Node;
    children:(GroupNode|WrapperNode|Node)[]
}
export interface IfStatementNode extends Node{
    condition:Node;
    stop?:Node;
    children:(ExpressionNode|IfStatementNode|Node)[]
}
export interface GroupNode extends Node{
    mode:Node;
    children:(ExpressionNode|Node)[]
}
export interface WrapperNode extends Node{
    mode:Node;
    children:(ExpressionNode|Node)[]
}
export interface BoxNode extends Node{
    header:HeaderNode;
    children:(LexerDeclarationNode|Node)[]
}
export interface LexerDecoratorNode extends Node{
    bind?:Node;
    merge?:Node;
    children:(Node)[]
}