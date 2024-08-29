import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';

import * as type from '../var/typechain';

describe('Proxy', () => {
    let owner: Signer, addr1: Signer;
    let proxyContract: type.ProxyTest;

    before(async () => {
        [owner, addr1] = await hre.ethers.getSigners();

        const proxyFactory = new type.ProxyTest__factory(owner);
        proxyContract = await proxyFactory.deploy();
    });

    describe('Deployment', () => {
        it('should assign zero address to implementation', async () => {
            const impl = await proxyContract.PROXY_getImplementation();
            expect(impl).to.be.equal(hre.ethers.ZeroAddress);
        });
        it('should assign deployer as admin', async () => {
            const admin = await proxyContract.PROXY_getAdmin();
            expect(admin).to.be.equal(owner);
        });
    });

    describe('StorageLocation', () => {
        let ERC7201Utils: type.ERC7201Utils;

        before(async () => {
            const ERC7201UtilsFactory = new type.ERC7201Utils__factory(owner);
            ERC7201Utils = await ERC7201UtilsFactory.deploy();
        });

        it('should have correct value for shared storage', async () => {
            expect(await proxyContract.getSharedStorageLocation()).to.be.equal(
                await ERC7201Utils.getStorageLocation('$.shared')
            );
        });

        it('should have correct value for proxy storage', async () => {
            expect(await proxyContract.getProxyStorageLocation()).to.be.equal(
                await ERC7201Utils.getStorageLocation('$.proxy')
            );
        });
    });

    describe('NonAdmin', () => {
        it('should not be able to set new admin', async () => {
            await expect(
                proxyContract.connect(addr1).PROXY_setAdmin(owner)
            ).to.be.revertedWithCustomError(
                proxyContract,
                'AdminOnlyAllowedOperation'
            );
        });
        it('should not be able to set new implementation', async () => {
            const w = hre.ethers.Wallet.createRandom();
            await expect(
                proxyContract.connect(addr1).PROXY_setImplementation(w.address)
            ).to.be.revertedWithCustomError(
                proxyContract,
                'AdminOnlyAllowedOperation'
            );
        });
    });

    describe('Admin', () => {
        it('should be able to set new admin', async () => {
            await expect(proxyContract.connect(owner).PROXY_setAdmin(addr1)).to
                .not.be.reverted;

            const admin = await proxyContract.PROXY_getAdmin();
            expect(admin).to.be.equal(addr1);

            await expect(proxyContract.connect(addr1).PROXY_setAdmin(owner)).to
                .not.be.reverted;
        });
        it('should be able to set new implementation', async () => {
            const w = hre.ethers.Wallet.createRandom();
            await expect(
                proxyContract.connect(owner).PROXY_setImplementation(w.address)
            ).to.not.be.reverted;

            const impl = await proxyContract.PROXY_getImplementation();
            expect(impl).to.be.equal(w.address);

            await expect(
                proxyContract
                    .connect(owner)
                    .PROXY_setImplementation(hre.ethers.ZeroAddress)
            ).to.not.be.reverted;
        });
    });

    describe('Migration', () => {
        let implV1Contract: type.ExampleImplementationV1,
            implV1Proxy: type.ExampleImplementationV1;
        let implV2Contract: type.ExampleImplementationV2,
            implV2Proxy: type.ExampleImplementationV2;

        before(async () => {
            const implV1Factory = new type.ExampleImplementationV1__factory(
                owner
            );
            implV1Contract = await implV1Factory.deploy();
            implV1Proxy = implV1Contract.attach(
                proxyContract
            ) as type.ExampleImplementationV1;

            const implV2Factory = new type.ExampleImplementationV2__factory(
                owner
            );
            implV2Contract = await implV2Factory.deploy();
            implV2Proxy = implV2Contract.attach(
                proxyContract
            ) as type.ExampleImplementationV2;
        });

        const migrate = async (newImpl: type.BaseImplementation) => {
            const p = type.BaseImplementation__factory.connect(
                await proxyContract.getAddress()
            );

            // terminate previous version
            const currentImlpAddr =
                await proxyContract.PROXY_getImplementation();
            if (currentImlpAddr !== hre.ethers.ZeroAddress) {
                await expect(p.connect(owner).Terminate()).to.not.be.reverted;
            }

            // upgrage version
            await expect(
                proxyContract.connect(owner).PROXY_setImplementation(newImpl)
            ).to.not.be.reverted;

            // initialize new version
            await expect(p.connect(owner).Initialize()).to.not.be.reverted;
        };

        it('should be able to setup v1 and set params to it', async () => {
            await migrate(implV1Contract);

            // only admin
            await expect(
                implV1Proxy.connect(addr1).setX(1)
            ).to.be.revertedWithCustomError(
                implV1Proxy,
                'AdminOnlyAllowedOperation'
            );

            expect(await implV1Proxy.getProd()).to.be.equal(0); // x*y; x and y are 0
            await expect(implV1Proxy.connect(owner).setX(1)).to.not.be.reverted;
            await expect(implV1Proxy.connect(addr1).setY(2)).to.not.be.reverted;
            expect(await implV1Proxy.getProd()).to.be.equal(2);
        });

        it('should be able to migrate to v2 and use params from v1', async () => {
            await migrate(implV2Contract);

            // methods do not exist
            await expect(implV1Proxy.connect(owner).setX(3)).to.be.reverted;
            await expect(implV1Proxy.connect(owner).setY(4)).to.be.reverted;

            // only admin
            await expect(
                implV2Proxy.connect(addr1).setZ(3)
            ).to.be.revertedWithCustomError(
                implV2Proxy,
                'AdminOnlyAllowedOperation'
            );

            expect(await implV2Proxy.getProd()).to.be.equal(0); // x*y*z; z is 0
            await expect(implV2Proxy.connect(owner).setZ(3)).to.not.be.reverted;
            expect(await implV2Proxy.getProd()).to.be.equal(6);
        });

        it('can migrate back to v1', async () => {
            await migrate(implV1Contract);
            expect(await implV1Proxy.getProd()).to.be.equal(2); // x*y
        });

        it('can migrate back to v2', async () => {
            await migrate(implV2Contract);
            expect(await implV2Proxy.getProd()).to.be.equal(6); // x*y*z
        });
    });

    describe('Calling a non-existent method', () => {
        let implV1Contract: type.ExampleImplementationV1;
        let implV2Contract: type.ExampleImplementationV2,
            implV2Proxy: type.ExampleImplementationV2;

        before(async () => {
            const implV1Factory = new type.ExampleImplementationV1__factory(
                owner
            );
            implV1Contract = await implV1Factory.deploy();

            const implV2Factory = new type.ExampleImplementationV2__factory(
                owner
            );
            implV2Contract = await implV2Factory.deploy();
            implV2Proxy = implV2Contract.attach(
                proxyContract
            ) as type.ExampleImplementationV2;
        });

        it('reverted if implementation is contract and method should return data', async () => {
            await expect(proxyContract.PROXY_setImplementation(implV1Contract))
                .to.not.be.reverted;

            await expect(implV2Proxy.getZ()).to.be.reverted;
        });

        it('reverted if implementation is contract and method should NOT return data', async () => {
            await expect(proxyContract.PROXY_setImplementation(implV1Contract))
                .to.not.be.reverted;

            await expect(implV2Proxy.setZ(1)).to.be.reverted;
        });

        it('rejected if implementation is NOT a contract and method should return data', async () => {
            await expect(
                proxyContract.PROXY_setImplementation(hre.ethers.ZeroAddress)
            ).to.not.be.reverted;

            await expect(implV2Proxy.getZ()).to.be.rejected;
        });

        it('silently failed if implementation is NOT a contract and method should NOT return data', async () => {
            await expect(
                proxyContract.PROXY_setImplementation(hre.ethers.ZeroAddress)
            ).to.not.be.reverted;

            await expect(implV2Proxy.setZ(999888777)).to.not.be.reverted;
            await expect(implV2Proxy.setZ(999888777)).to.not.be.rejected;

            // check that the data actually not changed
            await expect(proxyContract.PROXY_setImplementation(implV2Contract))
                .to.not.be.reverted;
            const z = await implV2Proxy.getZ();
            expect(z).to.not.be.equal(999888777);
        });
    });
});
