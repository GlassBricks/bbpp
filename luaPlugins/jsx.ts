/* eslint-disable @typescript-eslint/no-object-literal-type-assertion */
import * as ts from "typescript"
import {
  createCallExpression,
  createIdentifier,
  createNilLiteral,
  createStringLiteral,
  createTableIndexExpression,
  FunctionVisitor,
  Plugin,
  TransformationContext,
  VisitorResult,
} from "typescript-to-lua"
import { literalVisitors } from "typescript-to-lua/dist/transformation/visitors/literal"

const transformObjectLiteral = literalVisitors[
  ts.SyntaxKind.ObjectLiteralExpression
] as FunctionVisitor<ts.ObjectLiteralExpression>
const transformArrayLiteral = literalVisitors[
  ts.SyntaxKind.ArrayLiteralExpression
] as FunctionVisitor<ts.ArrayLiteralExpression>

function transformJsxAttributesExpression(
  expression: ts.JsxAttributes,
  context: TransformationContext
): VisitorResult<ts.Expression> {
  const properties = expression.properties.map((element) => {
    if (ts.isJsxAttribute(element)) {
      const valueOrExpression = element.initializer ? element.initializer : ts.createLiteral(true)
      return ts.createPropertyAssignment(element.name, valueOrExpression)
    } else {
      // is jxsSpreadAttribute
      return ts.createSpreadAssignment(element.expression)
    }
  })

  return transformObjectLiteral(ts.createObjectLiteral(properties), context)
}

function transformJsxOpeningElement(
  expression: ts.JsxSelfClosingElement | ts.JsxOpeningElement,
  context: TransformationContext,
  children?: ts.NodeArray<ts.JsxChild>
): VisitorResult<ts.JsxSelfClosingElement | ts.JsxOpeningElement> {
  // <Something a="b" />
  // React.createElement(Something, {a = 'b'})
  const [library, create] = context.options.jsxFactory
    ? context.options.jsxFactory.split(".")
    : ["React", "createElement"]
  let createElement
  if (create === undefined) {
    createElement = createIdentifier(library)
  } else {
    createElement = createTableIndexExpression(createIdentifier(library), createStringLiteral(create))
  }
  const tagName = expression.tagName
  const text = tagName.getText()
  const tag =
    ts.isIdentifier(tagName) && text.toLowerCase() === text
      ? createStringLiteral(text, tagName)
      : context.transformExpression(tagName)
  const props = transformJsxAttributesExpression(expression.attributes, context)

  if (children) {
    const childrenOrStringLiterals = children
      .filter((child) => {
        if (ts.isJsxExpression(child)) {
          return !!child.expression
        }
        return !ts.isJsxText(child) || child.text.trim() !== ""
      })
      .map((child) => (ts.isJsxText(child) ? ts.createStringLiteral(child.text.trim()) : child))
    const arrayLiteral = ts.createArrayLiteral(childrenOrStringLiterals, true)

    return createCallExpression(createElement, [tag, props, transformArrayLiteral(arrayLiteral, context)], expression)
  }

  return createCallExpression(createElement, [tag, props], expression)
}

function transformJsxElement(
  expression: ts.JsxElement | ts.JsxSelfClosingElement,
  context: TransformationContext
): VisitorResult<ts.JsxElement | ts.JsxSelfClosingElement> {
  if (ts.isJsxSelfClosingElement(expression)) {
    return transformJsxOpeningElement(expression, context)
  }
  return transformJsxOpeningElement(expression.openingElement, context, expression.children)
}

export default {
  visitors: {
    [ts.SyntaxKind.JsxSelfClosingElement]: (node, context) => transformJsxElement(node, context),
    [ts.SyntaxKind.JsxElement]: (node, context) => transformJsxElement(node, context),
    [ts.SyntaxKind.JsxExpression]: (node, context) => {
      if (node.expression) {
        return context.transformExpression(node.expression)
      }
      return createNilLiteral()
    },
  },
} as Plugin
