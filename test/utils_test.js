"use strict";

import chai, { expect } from "chai";

import { partition, pMap, omit, qsify, checkVersion } from "../src/utils";

chai.should();
chai.config.includeStack = true;

describe("Utils", () => {
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

  /** @test {omit} */
  describe("#omit", () => {
    it("should omit provided a single key", () => {
      expect(omit({a: 1, b: 2}, "a")).eql({b: 2});
    });

    it("should omit multiple keys", () => {
      expect(omit({a: 1, b: 2, c: 3}, "a", "c")).eql({b: 2});
    });

    it("should return source if no key is specified", () => {
      expect(omit({a: 1, b: 2})).eql({a: 1, b: 2});
    });
  });

  /** @test {qsify} */
  describe("#qsify", () => {
    it("should generate a query string from an object", () => {
      expect(qsify({a: 1, b: 2})).eql("a=1&b=2");
    });

    it("should strip out undefined values", () => {
      expect(qsify({a: undefined, b: 2})).eql("b=2");
    });
  });

  describe.only("#checkVersion", () => {
    it("should accept a version within provided range", () => {
      checkVersion("1.0", "1.0", "2.0");
      checkVersion("1.10", "1.0", "2.0");
      checkVersion("1.10", "1.9", "2.0");
      checkVersion("2.1", "1.0", "2.2");
      checkVersion("2.1", "1.2", "2.2");
      checkVersion("1.4", "1.4", "2.0");
    });

    it("should not accept a version oustide provided range", () => {
      expect(() => checkVersion("0.9", "1.0", "2.0")).to.Throw(Error);
      expect(() => checkVersion("2.0", "1.0", "2.0")).to.Throw(Error);
      expect(() => checkVersion("2.1", "1.0", "2.0")).to.Throw(Error);
      expect(() => checkVersion("3.9", "1.0", "2.10")).to.Throw(Error);
      expect(() => checkVersion("1.3", "1.4", "2.0")).to.Throw(Error);
    });
  });
});
