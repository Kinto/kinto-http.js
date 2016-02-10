"use strict";

import chai, { expect } from "chai";

import { quote, unquote, partition, pMap } from "../src/utils";

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

  /** @test {pMap} */
  describe("#pMap", () => {
    it("should map list to aggregated results", () => {
      return pMap([1, 2], x => Promise.resolve(x * 2))
        .should.become([2, 4]);
    });

    it("should convert sync reducing function to async", () => {
      return pMap([1, 2], x => x * 2)
        .should.become([2, 4]);
    });

    it("should preserve order of entries", () => {
      return pMap([100, 50], (x) => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(x);
          }, x);
        });
      }).should.become([100, 50]);
    });

    it("should ensure order of execution", () => {
      const logged = [];
      return pMap([100, 50], (x) => {
        return new Promise(resolve => {
          setTimeout(() => {
            logged.push(x);
            resolve(x);
          }, x);
        });
      }).then(_ => expect(logged).eql([100, 50]));
    });
  });
});
