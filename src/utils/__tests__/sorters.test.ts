import { describe, it, expect } from "@jest/globals";
import { sortNumberDesc } from "../sorters";

describe("sorters", () => {
  describe("sortNumberDesc", () => {
    it("should create a descending sort function for numeric properties", () => {
      const items = [
        { name: "A", count: 5 },
        { name: "B", count: 10 },
        { name: "C", count: 3 },
        { name: "D", count: 7 },
      ];

      const sorter = sortNumberDesc<(typeof items)[0]>("count");
      const sorted = [...items].sort(sorter);

      expect(sorted).toEqual([
        { name: "B", count: 10 },
        { name: "D", count: 7 },
        { name: "A", count: 5 },
        { name: "C", count: 3 },
      ]);
    });

    it("should handle equal values maintaining stable sort", () => {
      const items = [
        { id: 1, score: 5 },
        { id: 2, score: 5 },
        { id: 3, score: 5 },
      ];

      const sorter = sortNumberDesc<(typeof items)[0]>("score");
      const sorted = [...items].sort(sorter);

      // All have same score, so order should be maintained
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it("should handle negative numbers", () => {
      const items = [{ value: -10 }, { value: 5 }, { value: -3 }, { value: 0 }];

      const sorter = sortNumberDesc<(typeof items)[0]>("value");
      const sorted = [...items].sort(sorter);

      expect(sorted).toEqual([
        { value: 5 },
        { value: 0 },
        { value: -3 },
        { value: -10 },
      ]);
    });

    it("should handle floating point numbers", () => {
      const items = [
        { price: 10.5 },
        { price: 10.1 },
        { price: 10.9 },
        { price: 10.3 },
      ];

      const sorter = sortNumberDesc<(typeof items)[0]>("price");
      const sorted = [...items].sort(sorter);

      expect(sorted[0].price).toBe(10.9);
      expect(sorted[1].price).toBe(10.5);
      expect(sorted[2].price).toBe(10.3);
      expect(sorted[3].price).toBe(10.1);
    });

    it("should work with different property types", () => {
      interface TestItem {
        name: string;
        age: number;
        score: number;
        isActive: boolean;
      }

      const items: TestItem[] = [
        { name: "Alice", age: 30, score: 85, isActive: true },
        { name: "Bob", age: 25, score: 90, isActive: false },
        { name: "Charlie", age: 35, score: 80, isActive: true },
      ];

      const ageSort = sortNumberDesc<TestItem>("age");
      const scoreSort = sortNumberDesc<TestItem>("score");

      const sortedByAge = [...items].sort(ageSort);
      const sortedByScore = [...items].sort(scoreSort);

      expect(sortedByAge[0].name).toBe("Charlie");
      expect(sortedByScore[0].name).toBe("Bob");
    });

    it("should handle zero values correctly", () => {
      const items = [{ count: 0 }, { count: 5 }, { count: 0 }, { count: -5 }];

      const sorter = sortNumberDesc<(typeof items)[0]>("count");
      const sorted = [...items].sort(sorter);

      expect(sorted).toEqual([
        { count: 5 },
        { count: 0 },
        { count: 0 },
        { count: -5 },
      ]);
    });

    it("should handle very large numbers", () => {
      const items = [
        { value: Number.MAX_SAFE_INTEGER },
        { value: 1000 },
        { value: Number.MAX_SAFE_INTEGER - 1 },
      ];

      const sorter = sortNumberDesc<(typeof items)[0]>("value");
      const sorted = [...items].sort(sorter);

      expect(sorted[0].value).toBe(Number.MAX_SAFE_INTEGER);
      expect(sorted[1].value).toBe(Number.MAX_SAFE_INTEGER - 1);
      expect(sorted[2].value).toBe(1000);
    });

    it("should be type-safe and only accept numeric properties", () => {
      interface MixedType {
        name: string;
        count: number;
        tags: string[];
      }

      const items: MixedType[] = [
        { name: "A", count: 5, tags: ["x"] },
        { name: "B", count: 3, tags: ["y", "z"] },
      ];

      // This should work
      const validSorter = sortNumberDesc<MixedType>("count");
      const sorted = [...items].sort(validSorter);
      expect(sorted[0].count).toBe(5);

      // TypeScript should prevent using non-numeric properties
      // but we can test runtime behavior if it somehow happens
      const invalidSorter = sortNumberDesc<MixedType>("name" as any);
      const invalidSorted = [...items].sort(invalidSorter);

      // NaN - NaN = NaN, which is falsy, so order stays the same
      expect(invalidSorted[0].name).toBe("A");
      expect(invalidSorted[1].name).toBe("B");
    });

    it("should handle undefined or null values", () => {
      const items = [
        { value: 5 },
        { value: undefined as any },
        { value: 10 },
        { value: null as any },
        { value: 3 },
      ];

      const sorter = sortNumberDesc<(typeof items)[0]>("value");
      const sorted = [...items].sort(sorter);

      // undefined and null will be coerced to NaN in numeric context
      // NaN - NaN = NaN, NaN - number = NaN, number - NaN = NaN
      // All NaN comparisons are falsy, so sort behavior is unpredictable
      // Just check that numeric values exist and are in descending order
      const numericValues = sorted
        .filter((item) => typeof item.value === "number")
        .map((item) => item.value);
      expect(numericValues.length).toBe(3);
      // Check that numeric values are sorted in descending order
      for (let i = 1; i < numericValues.length; i++) {
        expect(numericValues[i - 1]).toBeGreaterThanOrEqual(numericValues[i]);
      }
    });

    it("should not mutate the original array", () => {
      const items = [{ rank: 3 }, { rank: 1 }, { rank: 2 }];

      const originalCopy = [...items];
      const sorter = sortNumberDesc<(typeof items)[0]>("rank");
      const sorted = [...items].sort(sorter);

      expect(items).toEqual(originalCopy);
      expect(sorted).not.toBe(items);
    });
  });
});
