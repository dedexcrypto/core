import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-abi-exporter';
import 'solidity-coverage';

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.20',
    },
    networks: {
        localhost: {},
    },
    typechain: {
        outDir: './var/typechain',
        target: 'ethers-v6',
    },
    paths: {
        tests: './tests',
        cache: './var/cache',
        artifacts: './var/artifacts',
    },
    abiExporter: {
        path: './abi',
        format: 'json',
        spacing: 4,
        only: ['^contracts/.*$'],
        rename(sourceName, contractName) {
            return (
                sourceName.replace(new RegExp('^contracts/'), '') +
                '/' +
                contractName
            );
        },
    },
};

export default config;
