import { describe, it, expect } from 'vitest';
import { sum } from './sum';

describe('sum(a, b)', () => {
  describe('基础功能（数据驱动）', () => {
    it.each([
      { a: 1, b: 2, expected: 3 },
      { a: 0, b: 0, expected: 0 },
      { a: -1, b: -2, expected: -3 },
      { a: -5, b: 5, expected: 0 },
      { a: 100, b: -1, expected: 99 },
      { a: 2.5, b: 3.5, expected: 6 },
    ])('sum($a, $b) 应返回 $expected', ({ a, b, expected }) => {
      expect(sum(a, b)).toBe(expected);
    });
  });

  describe('数学性质', () => {
    it('加 0 不改变原值（单位元）', () => {
      expect(sum(42, 0)).toBe(42);
      expect(sum(0, 42)).toBe(42);
    });

    it('满足交换律 sum(a, b) === sum(b, a)', () => {
      expect(sum(3, 7)).toBe(sum(7, 3));
      expect(sum(-2.5, 1.25)).toBe(sum(1.25, -2.5));
    });
  });

  describe('边界与特殊值', () => {
    it('浮点精度问题应使用近似断言（0.1 + 0.2）', () => {
      expect(sum(0.1, 0.2)).toBeCloseTo(0.3, 10);
      // 记录现状：严格相等会失败
      expect(sum(0.1, 0.2)).not.toBe(0.3);
    });

    it('超出 Number.MAX_SAFE_INTEGER 时精度丢失（记录现状）', () => {
      expect(sum(Number.MAX_SAFE_INTEGER, 1)).toBe(9007199254740992);
      expect(sum(Number.MAX_SAFE_INTEGER, 2)).toBe(9007199254740993);
    });

    it('Infinity 参与运算', () => {
      expect(sum(Infinity, 1)).toBe(Infinity);
      expect(sum(-Infinity, -1)).toBe(-Infinity);
      expect(sum(Infinity, -Infinity)).toBeNaN();
    });

    it('NaN 会传播', () => {
      expect(sum(NaN, 0)).toBeNaN();
      expect(sum(NaN, Infinity)).toBeNaN();
    });
  });

  describe('运行时缺乏类型校验的行为（记录现状，非期望契约）', () => {
    it('传入字符串时会发生拼接而非求和', () => {
      // 绕过 TS 类型检查，验证纯 JS 调用时的实际行为
      const result = sum('1' as unknown as number, 2);
      expect(result).toBe('12');
    });
  });
});
