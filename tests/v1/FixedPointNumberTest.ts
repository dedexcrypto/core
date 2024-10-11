import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer, ContractTransactionResponse, EventLog } from 'ethers';

import * as type from '../../var/typechain';

describe('FixedPointNumber', () => {
    let owner: Signer;
    let fpnLib: type.FixedPointNumberTest;

    before(async () => {
        [owner] = await hre.ethers.getSigners();

        const fpnLibFactory = new type.FixedPointNumberTest__factory(owner);
        fpnLib = await fpnLibFactory.deploy();
    });

    const DECIMALS = BigInt(18);
    const ZERO = BigInt(0);
    const ONE = BigInt(10) ** DECIMALS;
    const INT256_MAX = BigInt(2) ** BigInt(255) - BigInt(1);
    const INT256_MIN = -(BigInt(2) ** BigInt(255));

    describe('LibraryConstants', () => {
        it('have correct DECIMALS', async () => {
            expect(await fpnLib.DECIMALS()).to.be.equal(DECIMALS);
        });
        it('have correct ZERO', async () => {
            expect(await fpnLib.ZERO()).to.be.equal(ZERO);
        });
        it('have correct ONE', async () => {
            expect(await fpnLib.ONE()).to.be.equal(ONE);
        });
        it('have correct MAX', async () => {
            expect(await fpnLib.MAX()).to.be.equal(INT256_MAX);
        });
        it('have correct MIN', async () => {
            expect(await fpnLib.MIN()).to.be.equal(INT256_MIN);
        });
    });

    describe('Wrap', () => {
        it('"num" arg should be int256', async () => {
            await expect(fpnLib.wrap(INT256_MAX + BigInt(1), 0)).to.be.rejected;
            await expect(fpnLib.wrap(INT256_MAX, 0)).to.not.be.rejected;
            await expect(fpnLib.wrap(INT256_MIN - BigInt(1), 0)).to.be.rejected;
            await expect(fpnLib.wrap(INT256_MIN, 0)).to.not.be.rejected;
        });

        it('"decimals" arg should be uint8', async () => {
            await expect(fpnLib.wrap(0, -BigInt(1))).to.be.rejected;
            await expect(fpnLib.wrap(0, 0)).to.not.be.rejected;
            await expect(fpnLib.wrap(0, BigInt(2) ** BigInt(8))).to.be.rejected;
            await expect(fpnLib.wrap(0, BigInt(2) ** BigInt(8) - BigInt(1))).to
                .not.be.rejected;
        });

        it('should correctly handle int256.min', async () => {
            // underflow
            const [, ok1] = await fpnLib.wrap(INT256_MIN, 0);
            expect(ok1).to.be.equal(false);

            // underflow
            const [, ok2] = await fpnLib.wrap(INT256_MIN, 17);
            expect(ok2).to.be.equal(false);

            // min number: 59 + 18 = 77
            const [res3, ok3] = await fpnLib.wrap(INT256_MIN, 18);
            expect(res3).to.be.equal(INT256_MIN);
            expect(ok3).to.be.equal(true);

            // 58 + 18
            const [res4, ok4] = await fpnLib.wrap(INT256_MIN, 19);
            expect(res4).to.be.equal(INT256_MIN / BigInt(10));
            expect(ok4).to.be.equal(true);

            // 57 + 18
            const [res5, ok5] = await fpnLib.wrap(INT256_MIN, 20);
            expect(res5).to.be.equal(INT256_MIN / BigInt(100));
            expect(ok5).to.be.equal(true);

            // all digits are decimals
            const [res6, ok6] = await fpnLib.wrap(INT256_MIN, 77);
            expect(res6).to.be.equal(-BigInt('578960446186580977'));
            expect(ok6).to.be.equal(true);

            // first char of int256.min
            const [res7, ok7] = await fpnLib.wrap(INT256_MIN, 94);
            expect(res7).to.be.equal(-BigInt(5));
            expect(ok7).to.be.equal(true);

            // 77 + 18: result0
            const [res8, ok8] = await fpnLib.wrap(INT256_MIN, 95);
            expect(res8).to.be.equal(ZERO);
            expect(ok8).to.be.equal(true);

            // result0
            const [res9, ok9] = await fpnLib.wrap(INT256_MIN, 96);
            expect(res9).to.be.equal(ZERO);
            expect(ok9).to.be.equal(true);
        });

        it('should correctly handle -2', async () => {
            const [res1, ok1] = await fpnLib.wrap(-BigInt(2), 0);
            expect(res1).to.be.equal(-(ONE + ONE));
            expect(ok1).to.be.equal(true);

            const [res2, ok2] = await fpnLib.wrap(-BigInt(2), 1);
            expect(res2).to.be.equal(-(ONE + ONE) / BigInt(10));
            expect(ok2).to.be.equal(true);

            const [res3, ok3] = await fpnLib.wrap(-BigInt(2), 18);
            expect(res3).to.be.equal(-BigInt(2));
            expect(ok3).to.be.equal(true);

            const [res4, ok4] = await fpnLib.wrap(-BigInt(2), 19);
            expect(res4).to.be.equal(ZERO);
            expect(ok4).to.be.equal(true);
        });

        it('should correctly handle -1', async () => {
            const [res1, ok1] = await fpnLib.wrap(-BigInt(1), 0);
            expect(res1).to.be.equal(-ONE);
            expect(ok1).to.be.equal(true);

            const [res2, ok2] = await fpnLib.wrap(-BigInt(1), 1);
            expect(res2).to.be.equal(-ONE / BigInt(10));
            expect(ok2).to.be.equal(true);

            const [res3, ok3] = await fpnLib.wrap(-BigInt(1), 18);
            expect(res3).to.be.equal(-BigInt(1));
            expect(ok3).to.be.equal(true);

            const [res4, ok4] = await fpnLib.wrap(-BigInt(1), 19);
            expect(res4).to.be.equal(ZERO);
            expect(ok4).to.be.equal(true);
        });

        it('should correctly handle ZERO', async () => {
            const [res1, ok1] = await fpnLib.wrap(ZERO, 0);
            expect(res1).to.be.equal(ZERO);
            expect(ok1).to.be.equal(true);

            const [res2, ok2] = await fpnLib.wrap(ZERO, 18);
            expect(res2).to.be.equal(ZERO);
            expect(ok2).to.be.equal(true);

            const [res3, ok3] = await fpnLib.wrap(ZERO, 255);
            expect(res3).to.be.equal(ZERO);
            expect(ok3).to.be.equal(true);
        });

        it('should correctly handle 1', async () => {
            const [res1, ok1] = await fpnLib.wrap(BigInt(1), 0);
            expect(res1).to.be.equal(ONE);
            expect(ok1).to.be.equal(true);

            const [res2, ok2] = await fpnLib.wrap(BigInt(1), 1);
            expect(res2).to.be.equal(ONE / BigInt(10));
            expect(ok2).to.be.equal(true);

            const [res3, ok3] = await fpnLib.wrap(BigInt(1), 18);
            expect(res3).to.be.equal(BigInt(1));
            expect(ok3).to.be.equal(true);

            const [res4, ok4] = await fpnLib.wrap(BigInt(1), 19);
            expect(res4).to.be.equal(ZERO);
            expect(ok4).to.be.equal(true);
        });

        it('should correctly handle 2', async () => {
            const [res1, ok1] = await fpnLib.wrap(BigInt(2), 0);
            expect(res1).to.be.equal(ONE + ONE);
            expect(ok1).to.be.equal(true);

            const [res2, ok2] = await fpnLib.wrap(BigInt(2), 1);
            expect(res2).to.be.equal((ONE + ONE) / BigInt(10));
            expect(ok2).to.be.equal(true);

            const [res3, ok3] = await fpnLib.wrap(BigInt(2), 18);
            expect(res3).to.be.equal(BigInt(2));
            expect(ok3).to.be.equal(true);

            const [res4, ok4] = await fpnLib.wrap(BigInt(2), 19);
            expect(res4).to.be.equal(ZERO);
            expect(ok4).to.be.equal(true);
        });

        it('should correctly handle int256.max', async () => {
            // overflow
            const [, ok1] = await fpnLib.wrap(INT256_MAX, 0);
            expect(ok1).to.be.equal(false);

            // overflow
            const [, ok2] = await fpnLib.wrap(INT256_MAX, 17);
            expect(ok2).to.be.equal(false);

            // max number: 59 + 18 = 77
            const [res3, ok3] = await fpnLib.wrap(INT256_MAX, 18);
            expect(res3).to.be.equal(INT256_MAX);
            expect(ok3).to.be.equal(true);

            // 58 + 18
            const [res4, ok4] = await fpnLib.wrap(INT256_MAX, 19);
            expect(res4).to.be.equal(INT256_MAX / BigInt(10));
            expect(ok4).to.be.equal(true);

            // 57 + 18
            const [res5, ok5] = await fpnLib.wrap(INT256_MAX, 20);
            expect(res5).to.be.equal(INT256_MAX / BigInt(100));
            expect(ok5).to.be.equal(true);

            // all digits are decimals
            const [res6, ok6] = await fpnLib.wrap(INT256_MAX, 77);
            expect(res6).to.be.equal(BigInt('578960446186580977'));
            expect(ok6).to.be.equal(true);

            // first char of int256.max
            const [res7, ok7] = await fpnLib.wrap(INT256_MAX, 94);
            expect(res7).to.be.equal(BigInt(5));
            expect(ok7).to.be.equal(true);

            // 77 + 18: result0
            const [res8, ok8] = await fpnLib.wrap(INT256_MAX, 95);
            expect(res8).to.be.equal(ZERO);
            expect(ok8).to.be.equal(true);

            // result0
            const [res9, ok9] = await fpnLib.wrap(INT256_MAX, 96);
            expect(res9).to.be.equal(ZERO);
            expect(ok9).to.be.equal(true);
        });
    });

    describe('Int256ToUint256', () => {
        it('should return correct result for int256.min', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(INT256_MIN);
            expect(res).to.be.equal(-INT256_MIN);
            expect(neg).to.be.equal(true);
        });

        it('should return correct result for -2', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(-BigInt(2));
            expect(res).to.be.equal(BigInt(2));
            expect(neg).to.be.equal(true);
        });

        it('should return correct result for -1', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(-BigInt(1));
            expect(res).to.be.equal(BigInt(1));
            expect(neg).to.be.equal(true);
        });

        it('should return correct result for ZERO', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(ZERO);
            expect(res).to.be.equal(ZERO);
            expect(neg).to.be.equal(false);
        });

        it('should return correct result for 1', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(BigInt(1));
            expect(res).to.be.equal(BigInt(1));
            expect(neg).to.be.equal(false);
        });

        it('should return correct result for 2', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(BigInt(2));
            expect(res).to.be.equal(BigInt(2));
            expect(neg).to.be.equal(false);
        });

        it('should return correct result for int256.max', async () => {
            const [res, neg] = await fpnLib.int256ToUint256(INT256_MAX);
            expect(res).to.be.equal(INT256_MAX);
            expect(neg).to.be.equal(false);
        });
    });

    describe('Uint256ToInt256', () => {
        it('should return correct result for neg = false and x = 0', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(0), false);
            expect(res).to.be.equal(BigInt(0));
        });

        it('should return correct result for neg = false and x = 1', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(1), false);
            expect(res).to.be.equal(BigInt(1));
        });

        it('should return correct result for neg = false and x = 2', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(2), false);
            expect(res).to.be.equal(BigInt(2));
        });

        it('should return correct result for neg = false and x = int256.max', async () => {
            const res = await fpnLib.uint256ToInt256(INT256_MAX, false);
            expect(res).to.be.equal(INT256_MAX);
        });

        it('should be reverted for neg = false and x = (int256.max + 1)', async () => {
            await expect(fpnLib.uint256ToInt256(INT256_MAX + BigInt(1), false))
                .to.be.reverted;
        });

        it('should return correct result for neg = true and x = 0', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(0), true);
            expect(res).to.be.equal(BigInt(0));
        });

        it('should return correct result for neg = true and x = 1', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(1), true);
            expect(res).to.be.equal(-BigInt(1));
        });

        it('should return correct result for neg = true and x = 2', async () => {
            const res = await fpnLib.uint256ToInt256(BigInt(2), true);
            expect(res).to.be.equal(-BigInt(2));
        });

        it('should return correct result for neg = true and x = -(int256.min)', async () => {
            const res = await fpnLib.uint256ToInt256(-INT256_MIN, true);
            expect(res).to.be.equal(INT256_MIN);
        });

        it('should be reverted for neg = true and x = -(int256.min - 1)', async () => {
            await expect(
                fpnLib.uint256ToInt256(-(INT256_MIN - BigInt(1)), true)
            ).to.be.reverted;
        });
    });

    describe('Ln', () => {
        it('should correctly handle negative and zero input', async () => {
            await expect(fpnLib.ln(-BigInt(1))).to.be.reverted;
            await expect(fpnLib.ln(BigInt(0))).to.be.reverted;
        });

        it('should return correct result for 0.001', async () => {
            const res = await fpnLib.ln(ONE / BigInt(1000));
            expect(res).to.be.equal(-BigInt('6907755278982137052')); // -6.90...
        });

        it('should return correct result for 0.01', async () => {
            const res = await fpnLib.ln(ONE / BigInt(100));
            expect(res).to.be.equal(-BigInt('4605170185988091367')); // -4.60...
        });

        it('should return correct result for 0.1', async () => {
            const res = await fpnLib.ln(ONE / BigInt(10));
            expect(res).to.be.equal(-BigInt('2302585092994045683')); // -2.30...
        });

        it('should return correct result for 1.0', async () => {
            const res = await fpnLib.ln(ONE);
            expect(res).to.be.equal(ZERO);
        });

        it('should return correct result for 2.0', async () => {
            const res = await fpnLib.ln(ONE + ONE);
            expect(res).to.be.equal(BigInt('693147180559945309')); // 0.69...
        });

        it('should return correct result for int256.max', async () => {
            const res = await fpnLib.ln(INT256_MAX);
            expect(res).to.be.equal(BigInt('135305999368893231589')); // 135.30...
        });
    });

    describe('MulDiv', () => {
        it('shoud do simple multiplication and division', async () => {
            // full testing:
            // https://github.com/Uniswap/v3-core/blob/0.8/test/FullMath.spec.ts
            const res1 = await fpnLib.mulDiv(
                BigInt(10),
                BigInt(20),
                BigInt(2),
                false
            );
            expect(res1).to.be.equal(BigInt(100));
            const res2 = await fpnLib.mulDiv(
                BigInt(10),
                BigInt(20),
                BigInt(5),
                false
            );
            expect(res2).to.be.equal(BigInt(40));
        });

        it('should return correct sign', async () => {
            const data = [
                [10, 20, 2, 100],
                [10, 20, -2, -100],
                [10, -20, 2, -100],
                [10, -20, -2, 100],
                [-10, 20, 2, -100],
                [-10, 20, -2, 100],
                [-10, -20, 2, 100],
                [-10, -20, -2, -100],
            ];
            for (let i = 0; i < data.length; i++) {
                const tc = data[i];
                const res = await fpnLib.mulDiv(
                    BigInt(tc[0]),
                    BigInt(tc[1]),
                    BigInt(tc[2]),
                    false
                );
                expect(res).to.be.equal(BigInt(tc[3]));
            }
        });

        it('should be able to handle rounding', async () => {
            const res1 = await fpnLib.mulDiv(
                BigInt(10),
                BigInt(10),
                BigInt(3),
                /* roundingUp */ false
            );
            expect(res1).to.be.equal(BigInt(33));
            const res2 = await fpnLib.mulDiv(
                BigInt(10),
                BigInt(10),
                BigInt(3),
                /* roundingUp */ true
            );
            expect(res2).to.be.equal(BigInt(34));
        });

        it('should be able to handle zero devision', async () => {
            await expect(fpnLib.mulDiv(ONE, ONE, ZERO, false)).to.be.reverted;
            await expect(fpnLib.mulDiv(ONE, ONE, ZERO, true)).to.be.reverted;
        });
    });

    describe('GasTracker', () => {
        const gasUsed = async (
            tx: ContractTransactionResponse
        ): Promise<number> => {
            const receipt = await tx.wait();
            if (receipt === null) {
                return 0;
            }
            const event = receipt.logs.find(
                (log) =>
                    log instanceof EventLog &&
                    log.fragment.name === 'GasTracker'
            );
            if (!(event instanceof EventLog)) {
                return 0;
            }
            const parsedEvent = fpnLib.interface.decodeEventLog(
                'GasTracker',
                event.data,
                event.topics
            );

            return parseInt(parsedEvent.usedGas);
        };

        it('Wrap', async () => {
            const vals: number[] = [];
            for (let i = 0; i < 100; i++) {
                const tx = await fpnLib.wrap_GasTracker(
                    BigInt('111111111111111111111111111111'),
                    25
                );
                vals.push(await gasUsed(tx));
            }
            const runs = vals.length;
            const avg = vals.reduce((a, b) => a + b, 0) / runs || 0;
            console.log(`[Wrap] Runs: ${runs} Avg: ${avg}`);
        });

        it('Int256ToUint256', async () => {
            const vals: number[] = [];
            for (let i = 0; i < 100; i++) {
                const tx = await fpnLib.int256ToUint256_GasTracker(
                    -BigInt('111111111111111111111111111111')
                );
                vals.push(await gasUsed(tx));
            }
            const runs = vals.length;
            const avg = vals.reduce((a, b) => a + b, 0) / runs || 0;
            console.log(`[Int256ToUint256] Runs: ${runs} Avg: ${avg}`);
        });

        it('Uint256ToInt256', async () => {
            const vals: number[] = [];
            for (let i = 0; i < 100; i++) {
                const tx = await fpnLib.uint256ToInt256_GasTracker(
                    BigInt('111111111111111111111111111111'),
                    true
                );
                vals.push(await gasUsed(tx));
            }
            const runs = vals.length;
            const avg = vals.reduce((a, b) => a + b, 0) / runs || 0;
            console.log(`[Uint256ToInt256] Runs: ${runs} Avg: ${avg}`);
        });

        it('Ln', async () => {
            const vals: number[] = [];
            for (let i = 0; i < 100; i++) {
                const tx = await fpnLib.ln_GasTracker(INT256_MAX);
                vals.push(await gasUsed(tx));
            }
            const runs = vals.length;
            const avg = vals.reduce((a, b) => a + b, 0) / runs || 0;
            console.log(`[Ln] Runs: ${runs} Avg: ${avg}`);
        });

        it('MulDiv', async () => {
            const vals: number[] = [];
            for (let i = 0; i < 100; i++) {
                const tx = await fpnLib.mulDiv_GasTracker(
                    INT256_MAX,
                    INT256_MIN,
                    INT256_MIN,
                    true
                );
                vals.push(await gasUsed(tx));
            }
            const runs = vals.length;
            const avg = vals.reduce((a, b) => a + b, 0) / runs || 0;
            console.log(`[MulDiv] Runs: ${runs} Avg: ${avg}`);
        });
    });
});
