import { describe, expect, it } from 'vitest';
import { calculateShell } from './index';
import { shellParams } from '../../../test/params';
import type { ShellParameters } from '../types';

const expectInvalid = (overrides: Partial<ShellParameters>, message: RegExp) => {
    const result = calculateShell(shellParams(overrides));
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(message);
    return result;
};

describe('input validation', () => {
    describe('non-positive and non-finite dimensions', () => {
        const cases: Array<[string, Partial<ShellParameters>]> = [
            ['zero diameter', { d1: 0 }],
            ['negative diameter', { d1: -2000 }],
            ['zero height', { h: 0 }],
            ['negative height', { h: -1 }],
            ['zero thickness', { thickness: 0 }],
            ['NaN thickness', { thickness: Number.NaN }],
            ['infinite diameter', { d1: Infinity }]
        ];

        it.each(cases)('rejects %s', (_label, overrides) => {
            expectInvalid(overrides, /positive numbers/);
        });

        it('rejects a non-positive D2 in cone modes only', () => {
            expectInvalid({ mode: 'cone', d2: 0 }, /D2 must be positive/);
            expectInvalid({ mode: 'eccentric-cone', d2: -1 }, /D2 must be positive/);
            expect(calculateShell(shellParams({ mode: 'cylinder', d2: 0 })).isValid).toBe(true);
        });

        it('returns a zeroed result rather than partial numbers', () => {
            const result = expectInvalid({ d1: 0 }, /positive numbers/);
            expect(result.flatLength).toBe(0);
            expect(result.d1_neutral).toBe(0);
        });
    });

    describe('K-factor range', () => {
        it('accepts the closed upper bound K = 1', () => {
            expect(calculateShell(shellParams({ kFactor: 1 })).isValid).toBe(true);
        });

        it('rejects K above 1', () => {
            expectInvalid({ kFactor: 1.0001 }, /K-Factor/);
            expectInvalid({ kFactor: 44 }, /K-Factor/);
        });

        it('rejects K = 0 and negative K', () => {
            expectInvalid({ kFactor: 0 }, /positive numbers/);
            expectInvalid({ kFactor: -0.44 }, /positive numbers/);
        });
    });

    describe('weld gap', () => {
        it('accepts a zero gap', () => {
            expect(calculateShell(shellParams({ gap: 0 })).isValid).toBe(true);
        });

        it('rejects negative and non-finite gaps', () => {
            expectInvalid({ gap: -1 }, /welding gap/);
            expectInvalid({ gap: Number.NaN }, /welding gap/);
            expectInvalid({ gap: Infinity }, /welding gap/);
        });

        it('rejects a cylinder gap equal to or larger than the neutral circumference', () => {
            const circumference = Math.PI * 1983.2;
            expectInvalid({ gap: circumference }, /Gap is larger than circumference/);
            expectInvalid({ gap: circumference + 1 }, /Gap is larger than circumference/);
            expect(calculateShell(shellParams({ gap: circumference - 1 })).isValid).toBe(true);
        });

        it('rejects a cone gap that consumes the whole development angle', () => {
            expectInvalid({ mode: 'cone', gap: 1e6 }, /Gap is too large/);
        });
    });

    describe('physical wall thickness', () => {
        it('rejects a wall at least as thick as the neutral radius', () => {
            // OD 100, t 40, K 0.5: Dn = 100 − 40 = 60, r = 30 ≤ t
            expectInvalid({ d1: 100, thickness: 40, kFactor: 0.5 }, /Thickness is too large/);
        });

        it('checks the small end of a cone as well', () => {
            // D2: Dn = 60 − 2·25·0.56 = 32, r = 16 ≤ t = 25 while D1 is fine
            expectInvalid({ mode: 'cone', d1: 2000, d2: 60, thickness: 25 }, /Thickness is too large/);
        });

        it('rejects an OD so small that the neutral diameter is negative', () => {
            expect(calculateShell(shellParams({ d1: 10, thickness: 15 })).isValid).toBe(false);
        });
    });

    describe('mode-specific guards', () => {
        it('refuses a cone whose diameters are practically equal', () => {
            expectInvalid({ mode: 'cone', d1: 2000, d2: 2000.5 }, /Diameters too similar/);
        });

        it('refuses an eccentric cone that is really a cylinder', () => {
            expectInvalid({ mode: 'eccentric-cone', d1: 2000, d2: 2000, eccentricity: 0 }, /use Cylinder mode/);
        });

        it('rejects a non-finite eccentricity', () => {
            expectInvalid({ mode: 'eccentric-cone', eccentricity: Number.NaN }, /eccentricity/i);
        });
    });
});
