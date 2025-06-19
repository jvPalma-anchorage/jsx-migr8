import { describe, it, expect } from "@jest/globals";
import { getPropValue } from "../props";
import { types as t } from "recast";

const b = t.builders;

describe("getPropValue", () => {
  describe("literal values", () => {
    it("should extract string literal values", () => {
      const node = b.stringLiteral("red");
      expect(getPropValue(node)).toBe("red");
    });

    it("should extract numeric literal values as strings", () => {
      const node = b.numericLiteral(42);
      expect(getPropValue(node)).toBe("42");
    });

    it("should extract boolean literal values as strings", () => {
      const trueNode = b.booleanLiteral(true);
      expect(getPropValue(trueNode)).toBe("true");
      
      const falseNode = b.booleanLiteral(false);
      expect(getPropValue(falseNode)).toBe("false");
    });

    it("should extract null literal values", () => {
      const node = b.nullLiteral();
      expect(getPropValue(node)).toBe("null");
    });

  });

  describe("identifier and member expressions", () => {
    it("should extract identifier names", () => {
      const node = b.identifier("handleClick");
      expect(getPropValue(node)).toBe("handleClick");
    });

    it("should handle member expression with dot notation", () => {
      const node = b.memberExpression(
        b.identifier("user"),
        b.identifier("name"),
        false
      );
      expect(getPropValue(node)).toBe("user.name");
    });

    it("should handle member expression with bracket notation", () => {
      const node = b.memberExpression(
        b.identifier("data"),
        b.identifier("key"),
        true
      );
      expect(getPropValue(node)).toBe("data[key]");
    });

  });

  describe("unsupported node types", () => {
    it("should return node type for unsupported nodes", () => {
      const callExpr = b.callExpression(b.identifier("getValue"), []);
      expect(getPropValue(callExpr)).toBe("CallExpression");
      
      const templateLiteral = b.templateLiteral(
        [b.templateElement({ raw: "Hello", cooked: "Hello" }, true)],
        []
      );
      expect(getPropValue(templateLiteral)).toBe("TemplateLiteral");
      
      const objectExpr = b.objectExpression([]);
      expect(getPropValue(objectExpr)).toBe("ObjectExpression");
      
      const arrayExpr = b.arrayExpression([]);
      expect(getPropValue(arrayExpr)).toBe("ArrayExpression");
      
      const arrowFunc = b.arrowFunctionExpression([], b.blockStatement([]));
      expect(getPropValue(arrowFunc)).toBe("ArrowFunctionExpression");
      
      const conditionalExpr = b.conditionalExpression(
        b.identifier("condition"),
        b.literal("true"),
        b.literal("false")
      );
      expect(getPropValue(conditionalExpr)).toBe("ConditionalExpression");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined and null inputs", () => {
      expect(getPropValue(undefined)).toBe(undefined);
      expect(getPropValue(null)).toBe(undefined);
    });
    
    it("should handle JSXText nodes", () => {
      const node = b.jsxText("Some text");
      expect(getPropValue(node)).toBe("JSXText");
    });
    
    it("should handle JSXElement nodes", () => {
      const node = b.jsxElement(
        b.jsxOpeningElement(b.jsxIdentifier("Icon"), []),
        b.jsxClosingElement(b.jsxIdentifier("Icon")),
        []
      );
      expect(getPropValue(node)).toBe("JSXElement");
    });
    
    it("should handle JSXEmptyExpression", () => {
      const node = b.jsxEmptyExpression();
      expect(getPropValue(node)).toBe("JSXEmptyExpression");
    });
  });
});
