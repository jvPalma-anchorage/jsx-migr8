import { describe, it, expect, jest } from "@jest/globals";
import { stringToJsx } from "../stringToJsx";
import { builders as b } from "ast-types";
import { print } from "recast";

// Mock the babel parser that's causing issues
jest.mock("recast/parsers/babel-ts", () => ({
  default: require("@babel/parser")
}));

describe("stringToJsx", () => {
  const printJSX = (jsxElement: any) => print(jsxElement).code;

  describe("basic template parsing", () => {
    it("should parse a simple JSX element", () => {
      const template = "<Button>Click me</Button>";
      const result = stringToJsx(template);

      expect(result.type).toBe("JSXElement");
      expect((result.openingElement.name as any).name).toBe("Button");
      expect(printJSX(result)).toContain("Click me");
    });

    it("should parse self-closing JSX elements", () => {
      const template = '<Input type="text" />';
      const result = stringToJsx(template);

      expect(result.type).toBe("JSXElement");
      expect((result.openingElement.name as any).name).toBe("Input");
      expect(result.openingElement.selfClosing).toBe(true);
    });

    it("should throw error when no JSX element is found", () => {
      const template = "Just plain text";

      expect(() => stringToJsx(template)).toThrow(
        "Template must contain one JSX element",
      );
    });

    it("should handle elements with attributes", () => {
      const template = '<Button color="primary" size="large" disabled />';
      const result = stringToJsx(template);

      const attrs = result.openingElement.attributes;
      expect(attrs).toHaveLength(3);
      expect((attrs![0] as any).name.name).toBe("color");
      expect((attrs![0] as any).value.value).toBe("primary");
    });
  });

  describe("placeholder substitution", () => {
    it("should replace {...OUTER_PROPS} with provided attributes", () => {
      const template = "<Button {...OUTER_PROPS}>Click</Button>";
      const outerProps = [
        b.jsxAttribute(b.jsxIdentifier("color"), b.literal("red")),
        b.jsxAttribute(b.jsxIdentifier("size"), b.literal("large")),
      ];

      const result = stringToJsx(template, { OUTER_PROPS: outerProps });
      const attrs = result.openingElement.attributes;

      expect(attrs).toHaveLength(2);
      expect((attrs![0] as any).name.name).toBe("color");
      expect((attrs![1] as any).name.name).toBe("size");
    });

    it("should replace {...INNER_PROPS} with provided attributes", () => {
      const template = "<Wrapper><Button {...INNER_PROPS} /></Wrapper>";
      const innerProps = [
        b.jsxAttribute(
          b.jsxIdentifier("onClick"),
          b.jsxExpressionContainer(b.identifier("handleClick")),
        ),
      ];

      const result = stringToJsx(template, { INNER_PROPS: innerProps });
      const buttonElement = result.children![0] as any;
      const attrs = buttonElement.openingElement.attributes;

      expect(attrs).toHaveLength(1);
      expect((attrs[0] as any).name.name).toBe("onClick");
    });

    it("should replace {CHILDREN} placeholder", () => {
      const template = "<Container>{CHILDREN}</Container>";
      const children = [
        b.jsxElement(
          b.jsxOpeningElement(b.jsxIdentifier("Text"), []),
          b.jsxClosingElement(b.jsxIdentifier("Text")),
          [b.jsxText("Hello World")],
        ),
      ];

      const result = stringToJsx(template, { CHILDREN: children });

      expect(result.children).toHaveLength(1);
      expect((result.children![0] as any).openingElement.name.name).toBe("Text");
      expect(printJSX(result)).toContain("Hello World");
    });

    it("should handle multiple placeholders", () => {
      const template = "<Button {...OUTER_PROPS}>{CHILDREN}</Button>";
      const props = [
        b.jsxAttribute(b.jsxIdentifier("variant"), b.literal("primary")),
      ];
      const children = [b.jsxText("Submit")];

      const result = stringToJsx(template, {
        OUTER_PROPS: props,
        CHILDREN: children,
      });

      expect(result.openingElement.attributes).toHaveLength(1);
      expect(result.children).toHaveLength(1);
      expect(printJSX(result)).toContain("Submit");
    });

    it("should handle empty placeholder maps", () => {
      const template = "<Button {...OUTER_PROPS}>{CHILDREN}</Button>";
      const result = stringToJsx(template, {});

      // Placeholders should be removed even if empty
      expect(result.openingElement.attributes).toHaveLength(0);
      expect(result.children).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("should handle templates with multiple newlines", () => {
      const template = "<Button>\n\n\nClick me\n\n\n</Button>";
      const result = stringToJsx(template);

      expect(result.type).toBe("JSXElement");
      // Multiple newlines should be normalized
      expect(printJSX(result)).not.toContain("\n\n\n");
    });

    it("should handle nested JSX elements", () => {
      const template = `
        <Card>
          <CardHeader>
            <Title>Hello</Title>
          </CardHeader>
          <CardBody>
            <Text>Content</Text>
          </CardBody>
        </Card>
      `;

      const result = stringToJsx(template);
      expect((result.openingElement.name as any).name).toBe("Card");
      expect(result.children!.length).toBeGreaterThan(0);
    });

    it("should handle JSX expressions", () => {
      const template =
        '<Button onClick={() => console.log("clicked")}>Click</Button>';
      const result = stringToJsx(template);

      const onClickAttr = result.openingElement.attributes![0] as any;
      expect(onClickAttr.name.name).toBe("onClick");
      expect(onClickAttr.value.type).toBe("JSXExpressionContainer");
    });

    it("should handle fragments in template", () => {
      const template = "<><Button /><Input /></>";
      const result = stringToJsx(template);

      // The template parsing wraps in fragment, so the result is the fragment
      expect(result.type).toBe("JSXFragment");
    });

    it("should handle spread attributes in template", () => {
      const template = '<Button {...props} color="red" />';
      const result = stringToJsx(template);

      const attrs = result.openingElement.attributes;
      expect(attrs![0].type).toBe("JSXSpreadAttribute");
      expect(attrs![1].type).toBe("JSXAttribute");
    });

    it("should handle boolean attributes", () => {
      const template = "<Input disabled required />";
      const result = stringToJsx(template);

      const attrs = result.openingElement.attributes;
      expect((attrs![0] as any).name.name).toBe("disabled");
      expect((attrs![0] as any).value).toBeNull(); // Boolean attributes have null value
      expect((attrs![1] as any).name.name).toBe("required");
      expect((attrs![1] as any).value).toBeNull();
    });

    it("should preserve whitespace in text content", () => {
      const template = "<Code>  const x = 5;  </Code>";
      const result = stringToJsx(template);

      expect(printJSX(result)).toContain("  const x = 5;  ");
    });

    it("should handle complex nested placeholders", () => {
      const template = `
        <Wrapper {...OUTER_PROPS}>
          <Inner>
            {CHILDREN}
          </Inner>
        </Wrapper>
      `;

      const outerProps = [
        b.jsxAttribute(b.jsxIdentifier("className"), b.literal("wrapper")),
      ];
      const children = [b.jsxText("Nested content")];

      const result = stringToJsx(template, {
        OUTER_PROPS: outerProps,
        CHILDREN: children,
      });

      expect(result.openingElement.attributes).toHaveLength(1);
      const innerElement = result.children!.find(
        (child: any) =>
          child.type === "JSXElement" &&
          child.openingElement.name.name === "Inner",
      );
      expect((innerElement as any).children).toHaveLength(1);
    });

    it("should handle invalid JSX gracefully", () => {
      const invalidTemplates = [
        "<Button>Unclosed",
        "<Button><Inner></Button></Inner>",
        "<>",
      ];

      invalidTemplates.forEach((template) => {
        expect(() => stringToJsx(template)).toThrow();
      });
    });
  });

  describe("placeholder edge cases", () => {
    it("should ignore placeholders in text content", () => {
      const template = "<Code>Use {...OUTER_PROPS} in your component</Code>";
      const result = stringToJsx(template);

      // Text content should remain unchanged
      expect(printJSX(result)).toContain("{...OUTER_PROPS}");
    });

    it("should handle multiple spread placeholders", () => {
      const template = "<Button {...OUTER_PROPS} {...INNER_PROPS} />";
      const outerProps = [
        b.jsxAttribute(b.jsxIdentifier("color"), b.literal("red")),
      ];
      const innerProps = [
        b.jsxAttribute(b.jsxIdentifier("size"), b.literal("large")),
      ];

      const result = stringToJsx(template, {
        OUTER_PROPS: outerProps,
        INNER_PROPS: innerProps,
      });

      expect(result.openingElement.attributes).toHaveLength(2);
      expect((result.openingElement.attributes![0] as any).name.name).toBe("color");
      expect((result.openingElement.attributes![1] as any).name.name).toBe("size");
    });

    it("should handle undefined placeholder maps gracefully", () => {
      const template = "<Button {...OUTER_PROPS} />";
      const result = stringToJsx(template, { OUTER_PROPS: undefined as any });

      expect(result.openingElement.attributes).toHaveLength(0);
    });
  });
});
