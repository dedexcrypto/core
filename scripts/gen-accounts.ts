import { Wallet } from 'ethers';

for (let i = 0; i < 10; i++) {
    const wallet = Wallet.createRandom();

    console.log('# ', i + 1, ' #');
    console.log('Address: ', wallet.address);
    console.log('PublicKey: ', wallet.publicKey);
    console.log('PrivateKey: ', wallet.privateKey);
    console.log('Mnemonic: ', wallet.mnemonic?.phrase);
    console.log('');
}
