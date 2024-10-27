import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';

import * as type from '../../var/typechain';

describe('ImplementationV1', () => {
    let owner: Signer;
    let implV1Contract: type.ImplementationV1_Test;
    let eth2UsdDataFeed: type.MockV3Aggregator;
    let stakedEth2EthDataFeed: type.MockV3Aggregator;

    before(async () => {
        [owner] = await hre.ethers.getSigners();

        // implV1
        const implV1Factory = new type.ImplementationV1_Test__factory(owner);
        implV1Contract = await implV1Factory.deploy();

        // eth2UsdDataFeed
        const eth2UsdDataFeedFactory = new type.MockV3Aggregator__factory(
            owner
        );
        eth2UsdDataFeed = await eth2UsdDataFeedFactory.deploy(
            8,
            BigInt(1000) * BigInt(10) ** BigInt(8)
        );
        await expect(
            implV1Contract.setParamEth2UsdDataFeedAddress(eth2UsdDataFeed)
        ).to.not.be.reverted;

        // stakedEth2EthDataFeed
        const stakedEth2EthDataFeedFactory = new type.MockV3Aggregator__factory(
            owner
        );
        stakedEth2EthDataFeed = await stakedEth2EthDataFeedFactory.deploy(
            18,
            BigInt(1) * BigInt(10) ** BigInt(18)
        );
        await expect(
            implV1Contract.setParamStakedEth2EthDataFeedAddress(
                stakedEth2EthDataFeed
            )
        ).to.not.be.reverted;
    });

    describe('PriceOracle', () => {
        describe('Eth2Usd', () => {
            it('should return correct initial value', async () => {
                const eth2UsdAddr =
                    await implV1Contract.getParamEth2UsdDataFeedAddress();
                expect(eth2UsdAddr).to.be.equal(eth2UsdDataFeed);

                const eth2UsdRate = await implV1Contract.getEth2UsdRate();
                expect(eth2UsdRate).to.be.equal(
                    BigInt(1000) * BigInt(10) ** BigInt(18)
                );
            });

            it('should return correct value after change', async () => {
                await expect(
                    eth2UsdDataFeed.updateAnswer(
                        BigInt(2000) * BigInt(10) ** BigInt(8)
                    )
                ).to.not.be.reverted;

                const eth2UsdRate = await implV1Contract.getEth2UsdRate();
                expect(eth2UsdRate).to.be.equal(
                    BigInt(2000) * BigInt(10) ** BigInt(18)
                );
            });

            it('should fail on incorrect values', async () => {
                // negative value
                await expect(eth2UsdDataFeed.updateAnswer(-1)).to.not.be
                    .reverted;
                await expect(implV1Contract.getEth2UsdRate())
                    .to.be.revertedWithCustomError(
                        implV1Contract,
                        'IncorrectPriceOracleRate'
                    )
                    .withArgs(-1, 8);

                // correct value
                await expect(eth2UsdDataFeed.updateAnswer(1)).to.not.be
                    .reverted;
                await expect(implV1Contract.getEth2UsdRate()).to.not.be
                    .reverted;

                // zero value
                await expect(eth2UsdDataFeed.updateAnswer(0)).to.not.be
                    .reverted;
                await expect(implV1Contract.getEth2UsdRate())
                    .to.be.to.be.revertedWithCustomError(
                        implV1Contract,
                        'IncorrectPriceOracleRate'
                    )
                    .withArgs(0, 8);

                // correct value
                await expect(
                    eth2UsdDataFeed.updateAnswer(
                        BigInt(1000) * BigInt(10) ** BigInt(8)
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getEth2UsdRate()).to.not.be
                    .reverted;
            });

            it('should fail on wrong price oracle addr', async () => {
                await expect(
                    implV1Contract.setParamEth2UsdDataFeedAddress(
                        hre.ethers.ZeroAddress
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getEth2UsdRate()).to.be.reverted;

                await expect(
                    implV1Contract.setParamEth2UsdDataFeedAddress(
                        eth2UsdDataFeed
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getEth2UsdRate()).to.not.be
                    .reverted;
            });
        });

        describe('StakedEth2Eth', () => {
            it('should return correct initial value', async () => {
                const stakedEth2EthAddr =
                    await implV1Contract.getParamStakedEth2EthDataFeedAddress();
                expect(stakedEth2EthAddr).to.be.equal(stakedEth2EthDataFeed);

                const stakedEth2EthRate =
                    await implV1Contract.getStakedEth2EthRate();
                expect(stakedEth2EthRate).to.be.equal(
                    BigInt(1) * BigInt(10) ** BigInt(18)
                );
            });

            it('should return correct value after change', async () => {
                await expect(
                    stakedEth2EthDataFeed.updateAnswer(
                        BigInt(2) * BigInt(10) ** BigInt(17)
                    )
                ).to.not.be.reverted;

                const stakedEth2EthRate =
                    await implV1Contract.getStakedEth2EthRate();
                expect(stakedEth2EthRate).to.be.equal(
                    BigInt(2) * BigInt(10) ** BigInt(17)
                );
            });

            it('should fail on incorrect values', async () => {
                // negative value
                await expect(stakedEth2EthDataFeed.updateAnswer(-1)).to.not.be
                    .reverted;
                await expect(implV1Contract.getStakedEth2EthRate())
                    .to.be.revertedWithCustomError(
                        implV1Contract,
                        'IncorrectPriceOracleRate'
                    )
                    .withArgs(-1, 18);

                // correct value
                await expect(stakedEth2EthDataFeed.updateAnswer(1)).to.not.be
                    .reverted;
                await expect(implV1Contract.getStakedEth2EthRate()).to.not.be
                    .reverted;

                // zero value
                await expect(stakedEth2EthDataFeed.updateAnswer(0)).to.not.be
                    .reverted;
                await expect(implV1Contract.getStakedEth2EthRate())
                    .to.be.revertedWithCustomError(
                        implV1Contract,
                        'IncorrectPriceOracleRate'
                    )
                    .withArgs(0, 18);

                // correct value
                await expect(
                    stakedEth2EthDataFeed.updateAnswer(
                        BigInt(1) * BigInt(10) ** BigInt(18)
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getStakedEth2EthRate()).to.not.be
                    .reverted;
            });

            it('should fail on wrong price oracle addr', async () => {
                await expect(
                    implV1Contract.setParamStakedEth2EthDataFeedAddress(
                        hre.ethers.ZeroAddress
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getStakedEth2EthRate()).to.be
                    .reverted;

                await expect(
                    implV1Contract.setParamStakedEth2EthDataFeedAddress(
                        stakedEth2EthDataFeed
                    )
                ).to.not.be.reverted;
                await expect(implV1Contract.getStakedEth2EthRate()).to.not.be
                    .reverted;
            });
        });
    });
});
