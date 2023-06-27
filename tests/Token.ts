import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';

import * as type from '../var/typechain';

describe('DAOToken', () => {
    const tokenSupply = 1_000_000_000;
    let daoTokenContract: type.DAOToken;
    let owner: Signer, addr1: Signer;

    before(async () => {
        [owner, addr1] = await hre.ethers.getSigners();

        const daoTokenFactory = new type.DAOToken__factory(owner);
        daoTokenContract = await daoTokenFactory.deploy(tokenSupply);
    });

    describe('Deployment', () => {
        it('Should assign total supply of tokens to the owner/deployer', async () => {
            const ownerBalance = await daoTokenContract.balanceOf(owner);
            expect(await daoTokenContract.totalSupply()).to.equal(ownerBalance);
            expect(await daoTokenContract.totalSupply()).to.equal(tokenSupply);
        });
    });

    describe('Transactions', () => {
        it('Should transfer tokens between accounts', async () => {
            await daoTokenContract.transfer(await addr1.getAddress(), 50);
            const addr1Balance = await daoTokenContract.balanceOf(
                await addr1.getAddress()
            );
            expect(addr1Balance).to.equal(50);
        });

        it('Should transfer tokens between accounts', async () => {
            await expect(
                daoTokenContract
                    .connect(addr1)
                    .transfer(await addr1.getAddress(), 51)
            ).to.be.reverted;
        });
    });
});
