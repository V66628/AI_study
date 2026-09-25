/**
 * 被测对象：函数 a
 *
 * 说明：由于需求描述较简略（“生成一个 a”），此处假定 a 为一个“对数值数组求和”的纯函数，
 * 并内联实现以便测试文件可独立运行。若实际被测模块已存在，请删除下方实现，
 * 改为：import { a } from "../src/a";
 *
 * 运行方式（Node 20+，需支持 TS 或用 tsx）：
 *   node --test --experimental-strip-types a.test.ts
 *   或：npx tsx --test a.test.ts
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

/** 内联实现（占位）：对数值数组求和 */
function a(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}

describe("a(values) - 求和函数", () => {
  test("空数组返回 0（单位元）", () => {
    assert.equal(a([]), 0);
  });

  test("单个元素返回该元素本身", () => {
    assert.equal(a([42]), 42);
  });

  test("多个正数求和", () => {
    assert.equal(a([1, 2, 3, 4]), 10);
  });

  test("包含负数与零", () => {
    assert.equal(a([-1, 0, 1]), 0);
    assert.equal(a([-5, -2]), -7);
  });

  test("浮点数存在精度误差时按近似值断言", () => {
    // 0.1 + 0.2 !== 0.3，因此使用容差断言而不是严格相等
    const actual = a([0.1, 0.2]);
    assert.ok(
      Math.abs(actual - 0.3) < Number.EPSILON,
      `期望约等于 0.3，实际 ${actual}`,
    );
  });

  test("不修改入参（无副作用）", () => {
    const input: number[] = [1, 2, 3];
    const snapshot = [...input];
    a(input);
    assert.deepEqual(input, snapshot);
  });

  test("接受只读数组类型（不要求可变数组）", () => {
    const readonly: ReadonlyArray<number> = Object.freeze([10, 20]);
    assert.equal(a(readonly), 30);
  });

  test("大数组性能与正确性（1..1000 求和为 500500）", () => {
    const big = Array.from({ length: 1000 }, (_, i) => i + 1);
    assert.equal(a(big), 500500);
  });

  test("异常输入：非数组抛出 TypeError", () => {
    // 若业务上要求容错而非抛错，请相应调整实现与本用例
    assert.throws(() => a(null as unknown as readonly number[]), TypeError);
    assert.throws(
      () => a(undefined as unknown as readonly number[]),
      TypeError,
    );
  });

  test("异常输入：数组中含非数值元素返回 NaN", () => {
    assert.ok(Number.isNaN(a([1, "2" as unknown as number])));
  });
});
