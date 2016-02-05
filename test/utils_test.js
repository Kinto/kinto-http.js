"use strict";

import chai, { expect } from "chai";

import { quote, unquote, partition } from "../src/utils";

chai.should();
chai.config.includeStack = true;

describe("Utils", () => {
  /** @test {quote} */
  describe("#quote", () => {
    it("should add quotes to provided string", () => {
      const quoted = quote("42");
      expect(quoted).eql("\"42\"");
    });
  });

  /** @test {unquote} */
  describe("#unquote", () => {
    it("should remove quotes to provided string", () => {
      const unquoted = unquote("\"42\"");
      expect(unquoted).eql("42");
    });

    it("should return the same string is not quoted", () => {
      const unquoted = unquote("42");
      expect(unquoted).eql("42");
    });
  });

  /** @test {partition} */
  describe("#partition", () => {
    it("should chunk array", () => {
      expect(partition([1, 2, 3], 2)).eql([[1, 2], [3]]);
      expect(partition([1, 2, 3], 1)).eql([[1], [2], [3]]);
      expect(partition([1, 2, 3, 4, 5], 3)).eql([[1, 2, 3], [4, 5]]);
      expect(partition([1, 2], 2)).eql([[1, 2]]);
    });

    it("should not chunk array with n<=0", () => {
      expect(partition([1, 2, 3], 0)).eql([1, 2, 3]);
      expect(partition([1, 2, 3], -1)).eql([1, 2, 3]);
    });
  });
});
