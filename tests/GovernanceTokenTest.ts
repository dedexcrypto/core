import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';

import * as type from '../var/typechain';

describe('GovernanceToken', () => {
    let owner: Signer, addr1: Signer;
    let govTokenContract: type.GovernanceTokenTest;

    before(async () => {
        [owner, addr1] = await hre.ethers.getSigners();

        const govTokenFactory = new type.GovernanceTokenTest__factory(owner);
        govTokenContract = await govTokenFactory.deploy(); // 1
    });

    describe('Deployment', () => {
        it('should assign total supply of tokens to the deployer', async () => {
            const totalSupply = await govTokenContract.totalSupply();
            const ownerBalance = await govTokenContract.balanceOf(owner);
            expect(ownerBalance).to.be.equal(totalSupply);
        });

        it('should assign correct symbol', async () => {
            const symbol = await govTokenContract.symbol();
            expect(symbol).to.be.equal('DEDEX');
        });
    });

    describe('Transfer', () => {
        it('should transfer tokens between accounts', async () => {
            await govTokenContract.connect(owner).transfer(addr1, 100);
            const addr1Balance = await govTokenContract.balanceOf(addr1); // 2
            expect(addr1Balance).to.be.equal(100);
        });

        it('should not transfer tokens if insufficient funds', async () => {
            await expect(govTokenContract.connect(addr1).transfer(owner, 101))
                .to.be.reverted; // 3
        });
    });

    describe('DeployerBalanceHistory', () => {
        it('has 0 in the beginning', async () => {
            const ownerBalance0 = await govTokenContract.balanceOfAt(owner, 0);
            expect(ownerBalance0).to.be.equal(0);
        });
        it('owns the full supply after deployment', async () => {
            const ownerBalance1 = await govTokenContract.balanceOfAt(owner, 1);
            const totalSupply = await govTokenContract.totalSupply();
            expect(ownerBalance1).to.be.equal(totalSupply);
        });
        it('owns less after sending some funds', async () => {
            const ownerBalance2 = await govTokenContract.balanceOfAt(owner, 2);
            const totalSupply = await govTokenContract.totalSupply();
            expect(ownerBalance2).to.be.equal(totalSupply - BigInt(100));
        });
        it('owns the same after reverted transaction', async () => {
            const ownerBalance2 = await govTokenContract.balanceOfAt(owner, 2);
            const ownerBalance3 = await govTokenContract.balanceOfAt(owner, 3);
            expect(ownerBalance2).to.be.equal(ownerBalance3);
        });
    });

    describe('BalanceOfAt', () => {
        it('fails if the requested checkpoint is greater than the latest block number', async () => {
            const latestBlockNumber =
                (await hre.ethers.provider.getBlock('latest'))?.number ?? 0;
            await expect(
                govTokenContract.balanceOfAt(owner, latestBlockNumber + 1)
            ).to.be.revertedWithCustomError(
                govTokenContract,
                'CheckpointFutureLookup'
            );
        });

        it('returns the final account balance from the latest transaction within the block', async () => {
            const ownerBalance = await govTokenContract.balanceOf(owner);

            await hre.network.provider.send('evm_setAutomine', [false]);

            const params = { gasLimit: 1_000_000 };
            await govTokenContract.connect(owner).transfer(addr1, 1000, params);
            await govTokenContract.connect(owner).transfer(addr1, 1001, params);

            await hre.network.provider.send('evm_mine');
            await hre.network.provider.send('evm_setAutomine', [true]);

            const latestBlockNumber =
                (await hre.ethers.provider.getBlock('latest'))?.number ?? 0;
            const ownerBalance4 = await govTokenContract.balanceOfAt(
                owner,
                latestBlockNumber
            );
            expect(ownerBalance4).to.be.equal(ownerBalance - BigInt(2001));
        });

        it('works the same as BalanceOf for the latest block number', async () => {
            await expect(
                govTokenContract
                    .connect(owner)
                    .testBalanceOfAtForTheLatestBlock(addr1, 200)
            ).to.not.be.reverted;
        });
    });

    describe('TransferBenchmark', () => {
        it('sends tokens to 1k random wallets', async () => {
            for (let i = 0; i < 1000; i++) {
                const val = Math.floor(Math.random() * 100) + 1;
                const w = hre.ethers.Wallet.createRandom();
                await govTokenContract.connect(owner).transfer(w.address, val);
            }
        });
    });
});
