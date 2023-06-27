import { Wallet } from 'ethers';

const wallet = Wallet.createRandom();

console.log('Address: ', wallet.address);
console.log('PublicKey: ', wallet.publicKey);
console.log('PrivateKey: ', wallet.privateKey);
console.log('Mnemonic: ', wallet.mnemonic?.phrase);
