import * as hre from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';

import * as type from '../var/typechain';

function Enum(...options: string[]) {
    return Object.fromEntries(
        options.map((key, i) => [key, hre.ethers.toBigInt(i)])
    );
}

const ProposalType = Enum(
    'Invalid',
    'NewDeveloper',
    'NewProxyAdmin',
    'NewProxyImplementation'
);

const ProposalStatus = Enum(
    'Invalid',
    'Created',
    'WaitingForVotes',
    'Rejected',
    'Accepted',
    'Executed',
    'Expired',
    'Cancelled'
);

const VotingDecision = Enum('NotVoted', 'VotedFor', 'VotedAgainst');

function factorial(num: number): number {
    if (num == 0) return 1;
    else return num * factorial(num - 1);
}

describe('ProxyAdminV1', () => {
    let owner: Signer,
        addr1: Signer,
        addr2: Signer,
        addr3: Signer,
        addr4: Signer,
        addr5: Signer;
    let govTokenContract: type.GovernanceTokenTest;
    let proxyContract: type.ProxyTest;
    let proxyAdminV1Contract: type.ProxyAdminV1Test;
    let implV1Contract: type.ExampleImplementationV1;
    let implV2Contract: type.ExampleImplementationV2;

    const votingPeriod: number = 100;
    const executionPeriod: number = 100;

    before(async () => {
        [owner, addr1, addr2, addr3, addr4, addr5] =
            await hre.ethers.getSigners();

        const govTokenFactory = new type.GovernanceTokenTest__factory(owner);
        govTokenContract = await govTokenFactory.deploy();

        const proxyFactory = new type.ProxyTest__factory(owner);
        proxyContract = await proxyFactory.deploy();

        const proxyAdminV1Factory = new type.ProxyAdminV1Test__factory(owner);
        proxyAdminV1Contract = await proxyAdminV1Factory.deploy(
            govTokenContract,
            proxyContract,
            votingPeriod,
            executionPeriod,
            owner
        );

        const implV1Factory = new type.ExampleImplementationV1__factory(owner);
        implV1Contract = await implV1Factory.deploy();
        const implV2Factory = new type.ExampleImplementationV2__factory(owner);
        implV2Contract = await implV2Factory.deploy();

        await expect(proxyContract.PROXY_setImplementation(implV1Contract)).to
            .not.be.reverted;
        await expect(proxyContract.PROXY_setAdmin(proxyAdminV1Contract)).to.not
            .be.reverted;

        // addr1 - 13! * 1/3
        await expect(
            govTokenContract.connect(owner).transfer(addr1, factorial(13) / 3)
        ).to.not.be.reverted;
        // addr2 - 13! * 1/3
        await expect(
            govTokenContract.connect(owner).transfer(addr2, factorial(13) / 3)
        ).to.not.be.reverted;
        // addr3 - 13! * 0.05
        await expect(
            govTokenContract
                .connect(owner)
                .transfer(addr3, factorial(13) * 0.05)
        ).to.not.be.reverted;
        // addr4 - 13! * 0.04
        await expect(
            govTokenContract
                .connect(owner)
                .transfer(addr4, factorial(13) * 0.04)
        ).to.not.be.reverted;
        // addr5 - 1
        await expect(govTokenContract.connect(owner).transfer(addr5, 1)).to.not
            .be.reverted;
        // owner - 13! * (1/3 - 0.05 - 0.04) - 1
    });

    describe('Deployment', () => {
        it('should assign governance token contract', async () => {
            const govTokenAddr =
                await proxyAdminV1Contract.getGovernanceTokenAddress();
            expect(govTokenAddr).to.be.equal(govTokenContract);
        });
        it('should assign proxy contract', async () => {
            const proxyAddr = await proxyAdminV1Contract.getProxyAddress();
            expect(proxyAddr).to.be.equal(proxyContract);
        });
        it('should assign deployer as a developer', async () => {
            const developerAddr =
                await proxyAdminV1Contract.getDeveloperAddress();
            expect(developerAddr).to.be.equal(owner);
        });
        it('should assign voting period', async () => {
            const _votingPeriod = await proxyAdminV1Contract.getVotingPeriod();
            expect(_votingPeriod).to.be.equal(votingPeriod);
        });
        it('should assign execution period', async () => {
            const _executionPeriod =
                await proxyAdminV1Contract.getExecutionPeriod();
            expect(_executionPeriod).to.be.equal(executionPeriod);
        });
        it('should assign acceptance threshold', async () => {
            const threshold =
                await proxyAdminV1Contract.getAcceptanceThreshold();
            expect(threshold).to.be.equal((factorial(13) * 2) / 3 + 1);
        });
        it('should assign rejection threshold', async () => {
            const threshold =
                await proxyAdminV1Contract.getRejectionThreshold();
            expect(threshold).to.be.equal(factorial(13) / 3);
        });
        it('should assign public proposal threshold', async () => {
            const threshold =
                await proxyAdminV1Contract.getPublicProposalThreshold();
            expect(threshold).to.be.equal(factorial(13) * 0.05);
        });
        it('should not create any proposal', async () => {
            const lastProposalID =
                await proxyAdminV1Contract.getLastProposalID();
            expect(lastProposalID).to.be.equal(0);

            await expect(
                proxyAdminV1Contract.getProposalMeta(0)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );

            await expect(
                proxyAdminV1Contract.getProposalMeta(1)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });
        it('should set proxy admin in proxy', async () => {
            const adminAddr = await proxyContract.PROXY_getAdmin();
            expect(adminAddr).to.be.equal(proxyAdminV1Contract);
        });
    });

    describe('E2E', () => {
        describe('NewDeveloperByHolder', () => {
            before(async () => {
                const developerAddr =
                    await proxyAdminV1Contract.getDeveloperAddress();
                expect(developerAddr).to.not.be.equal(addr4);
            });

            it('holder (<5%) cannot create a proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr4) // 4%
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            addr4
                        )
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'NewProposal_VotingPowerBelowPublicProposalThreshold'
                );
            });

            it('holder (>=5%) creates a proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr3) // 5%
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            addr4
                        )
                ).to.not.be.reverted;
            });

            it('timeout happened and the proposal was rejected', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Rejected);
            });

            it('the rejected proposal cannot be executed', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr4).execute(proposalID)
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'WrongProposalStatus'
                    )
                    .withArgs(ProposalStatus.Accepted, ProposalStatus.Rejected);
            });

            it('holder (>=5%) creates a new proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr3) // 5%
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            addr4
                        )
                ).to.not.be.reverted;
            });

            it('others voted for the proposal and it is accepted', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                // before
                const proposalMeta1 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta1.votesFor).to.be.equal(0);
                expect(proposalMeta1.votesAgainst).to.be.equal(0);

                const proposalStatus1 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus1).to.be.equal(
                    ProposalStatus.WaitingForVotes
                );

                await expect(
                    proxyAdminV1Contract.connect(addr1).vote(proposalID, true)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr2).vote(proposalID, true)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr5).vote(proposalID, true)
                ).to.not.be.reverted;

                // after
                const proposalMeta2 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta2.votesFor).to.be.equal(
                    (factorial(13) * 2) / 3 + 1
                );
                expect(proposalMeta2.votesAgainst).to.be.equal(0);

                const proposalStatus2 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus2).to.be.equal(ProposalStatus.Accepted);
            });

            it('anyone can execute it', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr4).execute(proposalID)
                ).to.not.be.reverted;

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Executed);
            });

            after(async () => {
                const developerAddr =
                    await proxyAdminV1Contract.getDeveloperAddress();
                expect(developerAddr).to.be.equal(addr4);
            });
        });

        describe('NewDeveloperByDev', () => {
            before(async () => {
                const developerAddr =
                    await proxyAdminV1Contract.getDeveloperAddress();
                expect(developerAddr).to.not.be.equal(owner);
            });

            it('developer creates a proposal', async () => {
                const proposalBalance = await govTokenContract.balanceOf(addr4);
                const publicProposalThreshold =
                    await proxyAdminV1Contract.getPublicProposalThreshold();
                expect(proposalBalance).to.be.lessThan(publicProposalThreshold);

                await expect(
                    proxyAdminV1Contract
                        .connect(addr4)
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            owner
                        )
                ).to.not.be.reverted;
            });

            it('others voted for the proposal and it is rejected', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                // before
                const proposalMeta1 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta1.votesFor).to.be.equal(0);
                expect(proposalMeta1.votesAgainst).to.be.equal(0);

                const proposalStatus1 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus1).to.be.equal(
                    ProposalStatus.WaitingForVotes
                );

                const vd1 = await proxyAdminV1Contract
                    .connect(addr1)
                    .getVotingDecision(proposalID, owner);
                expect(vd1).to.be.equal(VotingDecision.NotVoted);
                await expect(
                    proxyAdminV1Contract.connect(owner).vote(proposalID, false)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(owner).vote(proposalID, false)
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'Vote_SenderAlreadyVoted'
                );
                const vd2 = await proxyAdminV1Contract
                    .connect(addr1)
                    .getVotingDecision(proposalID, owner);
                expect(vd2).to.be.equal(VotingDecision.VotedAgainst);

                await expect(
                    proxyAdminV1Contract.connect(addr3).vote(proposalID, false)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr4).vote(proposalID, false)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr5).vote(proposalID, false)
                ).to.not.be.reverted;

                // after
                const proposalMeta2 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta2.votesFor).to.be.equal(0);
                expect(proposalMeta2.votesAgainst).to.be.equal(
                    factorial(13) / 3
                );

                const proposalStatus2 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus2).to.be.equal(ProposalStatus.Rejected);
            });

            it('votes are not accepted anymore because the proposal was rejected', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr2).vote(proposalID, false)
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'WrongProposalStatus'
                    )
                    .withArgs(
                        ProposalStatus.WaitingForVotes,
                        ProposalStatus.Rejected
                    );
            });

            it('developer creates a new proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr4)
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            owner
                        )
                ).to.not.be.reverted;
            });

            it('timeout happened and the proposal was accepted but expired', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                // 0
                const proposalMeta1 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta1.votesFor).to.be.equal(0);
                expect(proposalMeta1.votesAgainst).to.be.equal(0);

                const proposalStatus1 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus1).to.be.equal(
                    ProposalStatus.WaitingForVotes
                );

                // 1
                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                // 2
                const proposalMeta2 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta2.votesFor).to.be.equal(0);
                expect(proposalMeta2.votesAgainst).to.be.equal(0);

                const proposalStatus2 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus2).to.be.equal(ProposalStatus.Accepted);

                // 3
                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < executionPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                // 4
                const proposalStatus3 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus3).to.be.equal(ProposalStatus.Expired);
            });

            it('the expired proposal cannot be executed', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr4).execute(proposalID)
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'WrongProposalStatus'
                    )
                    .withArgs(ProposalStatus.Accepted, ProposalStatus.Expired);
            });

            it('developer creates a new proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr4)
                        .newProposal(
                            ProposalType.NewDeveloper,
                            'test: new developer',
                            owner
                        )
                ).to.not.be.reverted;
            });

            it('timeout happened and the proposal was accepted', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                const proposalMeta =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta.votesFor).to.be.equal(0);
                expect(proposalMeta.votesAgainst).to.be.equal(0);

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Accepted);
            });

            it('only developer can execute it', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr1).execute(proposalID)
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'DeveloperOnlyAllowedOperation'
                );
                await expect(
                    proxyAdminV1Contract.connect(addr4).execute(proposalID)
                ).to.not.be.reverted;

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Executed);
            });

            after(async () => {
                const developerAddr =
                    await proxyAdminV1Contract.getDeveloperAddress();
                expect(developerAddr).to.be.equal(owner);
            });
        });

        describe('NewProxyImplementationByDev', () => {
            before(async () => {
                const impl = await proxyContract.PROXY_getImplementation();
                expect(impl).to.not.be.equal(implV2Contract);
            });

            it('only developer can create a proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr1)
                        .newProposal(
                            ProposalType.NewProxyImplementation,
                            'test: new proxy implementation',
                            implV2Contract
                        )
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'DeveloperOnlyAllowedOperation'
                );
                await expect(
                    proxyAdminV1Contract
                        .connect(owner)
                        .newProposal(
                            ProposalType.NewProxyImplementation,
                            'test: new proxy implementation',
                            implV2Contract
                        )
                ).to.not.be.reverted;
            });

            it('developer cannot create the second proposal: the previous one is active', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract
                        .connect(owner)
                        .newProposal(
                            ProposalType.NewProxyImplementation,
                            'test: new proxy implementation',
                            implV2Contract
                        )
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'NewProposal_SenderHasActiveProposal'
                    )
                    .withArgs(proposalID);
            });

            it('the proposal is accepted', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Accepted);
            });

            it('only developer can execute it', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr1).execute(proposalID)
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'DeveloperOnlyAllowedOperation'
                );
                await expect(
                    proxyAdminV1Contract.connect(owner).execute(proposalID)
                ).to.not.be.reverted;

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Executed);
            });

            after(async () => {
                const impl = await proxyContract.PROXY_getImplementation();
                expect(impl).to.be.equal(implV2Contract);
            });
        });

        describe('NewProxyAdminByDev', () => {
            before(async () => {
                const admAddr = await proxyContract.PROXY_getAdmin();
                expect(admAddr).to.not.be.equal(owner);
            });

            it('only developer can create a proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(addr1)
                        .newProposal(
                            ProposalType.NewProxyAdmin,
                            'test: new proxy admin',
                            owner
                        )
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'DeveloperOnlyAllowedOperation'
                );
                await expect(
                    proxyAdminV1Contract
                        .connect(owner)
                        .newProposal(
                            ProposalType.NewProxyAdmin,
                            'test: new proxy admin',
                            owner
                        )
                ).to.not.be.reverted;
            });

            it('the proposal is accepted but expired', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await expect(
                    proxyAdminV1Contract.connect(addr1).vote(proposalID, true)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr2).vote(proposalID, true)
                ).to.not.be.reverted;
                await expect(
                    proxyAdminV1Contract.connect(addr5).vote(proposalID, true)
                ).to.not.be.reverted;

                // accepted
                const proposalMeta1 =
                    await proxyAdminV1Contract.getProposalMeta(proposalID);
                expect(proposalMeta1.votesFor).to.be.equal(
                    (factorial(13) * 2) / 3 + 1
                );
                expect(proposalMeta1.votesAgainst).to.be.equal(0);

                const proposalStatus1 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus1).to.be.equal(ProposalStatus.Accepted);

                // make expired
                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod + executionPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                // expired
                const proposalStatus2 =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus2).to.be.equal(ProposalStatus.Expired);
            });

            it('developer creates a new proposal', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(owner)
                        .newProposal(
                            ProposalType.NewProxyAdmin,
                            'test: new proxy admin',
                            owner
                        )
                ).to.not.be.reverted;
            });

            it('the proposal is accepted', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();

                await hre.network.provider.send('evm_setAutomine', [false]);
                for (let i = 0; i < votingPeriod; i++) {
                    await hre.network.provider.send('evm_mine');
                }
                await hre.network.provider.send('evm_setAutomine', [true]);

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Accepted);
            });

            it('only developer can execute it', async () => {
                const ownerProposals =
                    await proxyAdminV1Contract.getUserProposals(owner);
                expect(ownerProposals.length).to.be.equal(3);
                const proposalID = ownerProposals[
                    ownerProposals.length - 1
                ] as bigint;

                await expect(
                    proxyAdminV1Contract.connect(addr1).execute(proposalID)
                ).to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'DeveloperOnlyAllowedOperation'
                );
                await expect(
                    proxyAdminV1Contract.connect(owner).execute(proposalID)
                ).to.not.be.reverted;

                const proposalStatus =
                    await proxyAdminV1Contract.getProposalStatus(proposalID);
                expect(proposalStatus).to.be.equal(ProposalStatus.Executed);
            });

            it('proxy admin v1 cannot create new proposals anymore', async () => {
                await expect(
                    proxyAdminV1Contract
                        .connect(owner)
                        .newProposal(
                            ProposalType.NewProxyAdmin,
                            'test: new proxy admin',
                            owner
                        )
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'ContractIsNotCurrentAdmin'
                    )
                    .withArgs(owner);
            });

            it('proxy admin v1 cannot execute proposals anymore', async () => {
                const proposalID =
                    await proxyAdminV1Contract.getLastProposalID();
                await expect(
                    proxyAdminV1Contract.connect(owner).execute(proposalID)
                )
                    .to.be.revertedWithCustomError(
                        proxyAdminV1Contract,
                        'ContractIsNotCurrentAdmin'
                    )
                    .withArgs(owner);
            });

            after(async () => {
                const admAddr = await proxyContract.PROXY_getAdmin();
                expect(admAddr).to.be.equal(owner);

                await expect(proxyContract.PROXY_setAdmin(proxyAdminV1Contract))
                    .to.not.be.reverted;
            });
        });
    });

    describe('Cancellation', () => {
        it('a new [validated] proposal created by developer', async () => {
            const w = hre.ethers.Wallet.createRandom();
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .newProposal(
                        ProposalType.Invalid,
                        'test: invalid',
                        w.address
                    )
            )
                .to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'NewProposal_UnsupportedProposalType'
                )
                .withArgs(ProposalType.Invalid);
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .newProposal(
                        ProposalType.NewProxyImplementation,
                        '',
                        w.address
                    )
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'NewProposal_DescriptionIsEmpty'
            );
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .newProposal(
                        ProposalType.NewProxyImplementation,
                        'test: new proxy implementation',
                        hre.ethers.ZeroAddress
                    )
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'NewProposal_TargetIsEmpty'
            );
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .newProposal(
                        ProposalType.NewProxyImplementation,
                        'test: new proxy implementation',
                        w.address
                    )
            ).to.not.be.reverted;
        });

        it('only developer can cancel it', async () => {
            const proposalID = await proxyAdminV1Contract.getLastProposalID();

            await expect(
                proxyAdminV1Contract.connect(owner).setDeveloper(addr2)
            ).to.not.be.reverted;

            await expect(
                proxyAdminV1Contract.connect(addr1).cancel(proposalID)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'DeveloperOnlyAllowedOperation'
            );

            await expect(proxyAdminV1Contract.connect(addr2).cancel(proposalID))
                .to.not.be.reverted;

            await expect(
                proxyAdminV1Contract.connect(owner).setDeveloper(owner)
            ).to.not.be.reverted;

            const proposalStatus =
                await proxyAdminV1Contract.getProposalStatus(proposalID);
            expect(proposalStatus).to.be.equal(ProposalStatus.Cancelled);
        });

        it('holder (>=5%) creates a proposal', async () => {
            const w = hre.ethers.Wallet.createRandom();
            await expect(
                proxyAdminV1Contract
                    .connect(addr3)
                    .newProposal(
                        ProposalType.NewDeveloper,
                        'test: new developer',
                        w.address
                    )
            ).to.not.be.reverted;

            const addr3Proposals =
                await proxyAdminV1Contract.getUserProposals(addr3);
            expect(addr3Proposals.length).to.be.equal(3);
            const proposalID = addr3Proposals[
                addr3Proposals.length - 1
            ] as bigint;

            const details =
                await proxyAdminV1Contract.getProposalDetails(proposalID);
            expect(details.createdBy).to.be.equal(addr3);
            expect(details.description).to.be.equal('test: new developer');
            expect(details.target).to.be.equal(w.address);
        });

        it('holder owns less tokens and anyone can cancel the proposal', async () => {
            const proposalID = await proxyAdminV1Contract.getLastProposalID();

            // cannot cancel
            await expect(proxyAdminV1Contract.connect(owner).cancel(proposalID))
                .to.be.revertedWithCustomError(
                    proxyAdminV1Contract,
                    'Cancel_SenderIsNotProposer'
                )
                .withArgs(addr3);

            const vp1 = await proxyAdminV1Contract.getVotingPower(
                proposalID,
                addr3
            );
            expect(vp1).to.be.equal(factorial(13) * 0.05);

            // sends some tokens, owns less than public proposal threshold
            await expect(govTokenContract.connect(addr3).transfer(addr4, 1)).to
                .not.be.reverted;

            // voting power is not changed because it depends on proposalStartBlock
            const vp2 = await proxyAdminV1Contract.getVotingPower(
                proposalID,
                addr3
            );
            expect(vp2).to.be.equal(factorial(13) * 0.05);

            // but cancel function looks at the latest balance
            await expect(proxyAdminV1Contract.connect(owner).cancel(proposalID))
                .to.not.be.reverted;

            await expect(govTokenContract.connect(addr4).transfer(addr3, 1)).to
                .not.be.reverted;

            const proposalStatus =
                await proxyAdminV1Contract.getProposalStatus(proposalID);
            expect(proposalStatus).to.be.equal(ProposalStatus.Cancelled);
        });

        it('a new proposal is created', async () => {
            const w = hre.ethers.Wallet.createRandom();
            await expect(
                proxyAdminV1Contract
                    .connect(addr3)
                    .newProposal(
                        ProposalType.NewDeveloper,
                        'test: new developer',
                        w.address
                    )
            ).to.not.be.reverted;
        });

        it('it is finalized', async () => {
            const proposalID = await proxyAdminV1Contract.getLastProposalID();

            await hre.network.provider.send('evm_setAutomine', [false]);
            for (let i = 0; i < votingPeriod; i++) {
                await hre.network.provider.send('evm_mine');
            }
            await hre.network.provider.send('evm_setAutomine', [true]);

            const proposalStatus =
                await proxyAdminV1Contract.getProposalStatus(proposalID);
            expect(proposalStatus).to.be.equal(ProposalStatus.Rejected);
        });

        it('the finalized proposal cannot be cancelled', async () => {
            const proposalID = await proxyAdminV1Contract.getLastProposalID();

            await expect(
                proxyAdminV1Contract.connect(addr3).cancel(proposalID)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'Cancel_ProposalHasBeenFinalized'
            );

            const proposalStatus =
                await proxyAdminV1Contract.getProposalStatus(proposalID);
            expect(proposalStatus).to.be.equal(ProposalStatus.Rejected);
        });
    });

    describe('Non-existent proposal', () => {
        it('cannot be used to fetch metaInfo', async () => {
            await expect(
                proxyAdminV1Contract.connect(owner).getProposalMeta(999888777)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be used to fetch details', async () => {
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .getProposalDetails(999888777)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be used to fetch status', async () => {
            await expect(
                proxyAdminV1Contract.connect(owner).getProposalStatus(999888777)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be used to fetch votingPower', async () => {
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .getVotingPower(999888777, owner)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be used to fetch votingDecision', async () => {
            await expect(
                proxyAdminV1Contract
                    .connect(owner)
                    .getVotingDecision(999888777, owner)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be voted', async () => {
            await expect(
                proxyAdminV1Contract.connect(owner).vote(999888777, true)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be cancelled', async () => {
            await expect(
                proxyAdminV1Contract.connect(owner).cancel(999888777)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });

        it('cannot be executed', async () => {
            await expect(
                proxyAdminV1Contract.connect(owner).execute(999888777)
            ).to.be.revertedWithCustomError(
                proxyAdminV1Contract,
                'ProposalDoesNotExist'
            );
        });
    });
});
