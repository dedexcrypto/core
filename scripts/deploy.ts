import * as hre from 'hardhat';
import { BaseContract } from 'ethers';
import fs from 'fs';
import path from 'path';
import { vars } from 'hardhat/config';

import * as type from '../var/typechain';

async function main() {
    const deloymentInfoDir: string = 'var/deployments/' + Date.now();

    const [owner] = await hre.ethers.getSigners();

    const govTokenFactory = new type.GovernanceToken__factory(owner);
    const govTokenContract = await govTokenFactory.deploy();
    await govTokenContract.waitForDeployment();
    await writeDeploymentInfo(
        govTokenContract,
        deloymentInfoDir + '/GovernanceToken.json'
    );

    const proxyFactory = new type.Proxy__factory(owner);
    const proxyContract = await proxyFactory.deploy();
    await proxyContract.waitForDeployment();
    await writeDeploymentInfo(proxyContract, deloymentInfoDir + '/Proxy.json');

    const proxyAdminV1Factory = new type.ProxyAdminV1__factory(owner);
    const proxyAdminV1Contract = await proxyAdminV1Factory.deploy(
        govTokenContract,
        proxyContract,
        parseInt(vars.get('PROXY_ADMIN_VOTING_PERIOD', '100')),
        parseInt(vars.get('PROXY_ADMIN_EXECUTION_PERIOD', '100')),
        owner
    );
    await proxyAdminV1Contract.waitForDeployment();
    await writeDeploymentInfo(
        proxyAdminV1Contract,
        deloymentInfoDir + '/ProxyAdminV1.json'
    );

    await proxyContract.connect(owner).PROXY_setAdmin(proxyAdminV1Contract);

    console.log('Deployment info: ' + deloymentInfoDir);
}

async function writeDeploymentInfo(
    contract: BaseContract,
    filename: string = ''
) {
    const data = {
        network: hre.network.name,
        contract: {
            address: await contract.getAddress(),
            sender: contract.deploymentTransaction()?.from,
            abi: contract.interface.format(),
        },
    };
    const content = JSON.stringify(data, null, 4);

    const dirname = path.dirname(filename);
    if (!fs.existsSync(dirname)) {
        await fs.promises.mkdir(dirname, { recursive: true });
    }
    await fs.promises.writeFile(filename, content, { encoding: 'utf-8' });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
