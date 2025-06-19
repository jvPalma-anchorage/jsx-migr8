import { describe, it, expect } from "@jest/globals";
import { matchesRule, getRuleMatch } from "../ruleMatch";
import type { RemapRule } from "@/remap/base-remapper";

describe("ruleMatch", () => {
  describe("matchesRule", () => {
    it("should return true when all conditions in match array are satisfied", () => {
      const props = { 
        color: "red", 
        size: "large", 
        variant: "primary" 
      };
      const match = [{ color: "red", size: "large" }];
      
      expect(matchesRule(props, match)).toBe(true);
    });

    it("should return false when any condition is not satisfied", () => {
      const props = { color: "red" }; // missing 'size'
      const match = [{ color: "red", size: "large" }];
      
      expect(matchesRule(props, match)).toBe(false);
    });

    it("should handle negative conditions (!) correctly", () => {
      const props1 = { 
        color: "red", 
        enabled: "true" 
      };
      const match1 = [{ color: "red" }, { "!disabled": true }];
      
      // Should match: has color, does not have disabled
      expect(matchesRule(props1, match1)).toBe(true);
      
      const props2 = { 
        color: "red", 
        disabled: "true" 
      };
      // Should not match: has both color and disabled
      expect(matchesRule(props2, match1)).toBe(false);
    });

    it("should handle empty match array (always matches)", () => {
      const props = { any: "prop" };
      const match: Record<string, any>[] = [];
      
      expect(matchesRule(props, match)).toBe(true);
      expect(matchesRule({}, match)).toBe(true);
    });

    it("should handle presence-only checks (value = true or undefined)", () => {
      const props = { 
        color: "red", 
        size: "42" 
      };
      const match = [{ color: true, size: undefined }];
      
      expect(matchesRule(props, match)).toBe(true);
    });

    it("should handle exact value matching", () => {
      const props = { 
        variant: "primary", 
        size: "large" 
      };
      const match = [{ variant: "primary", size: "large" }];
      
      expect(matchesRule(props, match)).toBe(true);
      
      // Different value should not match
      const props2 = { 
        variant: "secondary", 
        size: "large" 
      };
      expect(matchesRule(props2, match)).toBe(false);
    });

    it("should handle multiple match objects (OR logic between objects)", () => {
      const props1 = { color: "red" };
      const props2 = { size: "large" };
      const match = [{ color: "red" }, { size: "large" }];
      
      // Either condition should match
      expect(matchesRule(props1, match)).toBe(true);
      expect(matchesRule(props2, match)).toBe(true);
    });

    it("should handle string coercion for values", () => {
      const props = { 
        count: "0", 
        enabled: "true" 
      };
      const match = [{ count: "0", enabled: "true" }];
      
      expect(matchesRule(props, match)).toBe(true);
    });

    it("should handle complex negative conditions", () => {
      const props = { variant: "primary" };
      const match = [{ variant: "primary" }, { "!disabled": true }, { "!loading": true }];
      
      // Should match: has variant, doesn't have disabled or loading
      expect(matchesRule(props, match)).toBe(true);
      
      // Should not match: has loading
      const props2 = { 
        variant: "primary", 
        loading: "true" 
      };
      expect(matchesRule(props2, match)).toBe(false);
    });
  });

  describe("getRuleMatch", () => {
    const createRule = (match: Record<string, any>[], order = 0): RemapRule => ({
      order,
      match,
      set: {},
      remove: [],
      rename: []
    });

    it("should return the first matching rule", () => {
      const rules: RemapRule[] = [
        createRule([{ variant: "primary", size: "large" }], 1),
        createRule([{ variant: "primary" }], 2),
        createRule([{}], 3) // catch-all
      ];
      
      const props = { 
        variant: "primary", 
        size: "large" 
      };
      const match = getRuleMatch(rules, props);
      
      expect(match).toBe(rules[0]);
    });

    it("should return undefined when no rules match", () => {
      const rules: RemapRule[] = [
        createRule([{ variant: "primary" }]),
        createRule([{ color: "red" }])
      ];
      
      const props = { 
        variant: "secondary", 
        color: "blue" 
      };
      const match = getRuleMatch(rules, props);
      
      expect(match).toBeUndefined();
    });

    it("should handle empty rules array", () => {
      const match = getRuleMatch([], { any: "prop" });
      expect(match).toBeUndefined();
    });

    it("should match rules with negative conditions", () => {
      const rules: RemapRule[] = [
        createRule([{ variant: "primary" }, { "!disabled": true }]),
        createRule([{ variant: "primary", disabled: true }])
      ];
      
      // Active primary button
      const props1 = { variant: "primary" };
      expect(getRuleMatch(rules, props1)).toBe(rules[0]);
      
      // Disabled primary button
      const props2 = { 
        variant: "primary", 
        disabled: "true" 
      };
      expect(getRuleMatch(rules, props2)).toBe(rules[1]);
    });

    it("should handle catch-all rules", () => {
      const rules: RemapRule[] = [
        createRule([{ specific: "value" }]),
        createRule([]) // catch-all
      ];
      
      const props = { other: "prop" };
      const match = getRuleMatch(rules, props);
      
      expect(match).toBe(rules[1]); // Should match catch-all
    });
  });
});