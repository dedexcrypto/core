import * as hre from 'hardhat';
import { BaseContract } from 'ethers';
import fs from 'fs';
import path from 'path';

import * as type from '../var/typechain';

async function main() {
    const deloymentInfoDir: string = 'var/deployments/' + Date.now();

    const [owner] = await hre.ethers.getSigners();

    const daoTokenFactory = new type.DAOToken__factory(owner);
    const daoTokenContract = await daoTokenFactory.deploy(1_000_000_000);
    await daoTokenContract.waitForDeployment();
    await writeDeploymentInfo(
        daoTokenContract,
        deloymentInfoDir + '/DAOToken.json'
    );

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
