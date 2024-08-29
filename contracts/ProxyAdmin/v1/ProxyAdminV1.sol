// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

import {IGovernanceToken} from '../../GovernanceToken/IGovernanceToken.sol';
import {IProxy} from '../../Proxy/IProxy.sol';
import {IProxyAdminV1} from './IProxyAdminV1.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';

abstract contract ProxyAdminV1Core is IProxyAdminV1 {
    // 13! * (2 / 3) + 1
    uint40 internal constant ACCEPTANCE_THRESHOLD = 4_151_347_201;
    // 13! * (1 / 3)
    uint40 internal constant REJECTION_THRESHOLD = 2_075_673_600;
    // 13! * 0.05
    uint40 internal constant PUBLIC_PROPOSAL_THRESHOLD = 311_351_040;

    address internal immutable governanceToken_i;
    address internal immutable proxy_i;

    uint256 internal immutable votingPeriod_i;
    uint256 internal immutable executionPeriod_i;

    address internal developer_s;

    uint256 internal lastProposalID_s;
    mapping(address => uint256[]) internal userProposals_s;

    mapping(uint256 => ProposalMeta) internal proposalMeta_s;
    mapping(uint256 => string) internal proposalDetails_description_s;
    mapping(uint256 => address) internal proposalDetails_createdBy_s;
    mapping(uint256 => address) internal proposalDetails_target_s;

    mapping(uint256 => mapping(address => VotingDecision))
        internal votingDecision_s;

    constructor(
        address _governanceToken,
        address _proxy,
        uint256 _votingPeriod,
        uint256 _executionPeriod,
        address _developer
    ) {
        require(_governanceToken != address(0x0), 'governance token is 0x0');
        require(_proxy != address(0x0), 'proxy is 0x0');
        require(_votingPeriod > 0, 'voting period is 0');
        require(_executionPeriod > 0, 'voting period is 0');
        require(_developer != address(0x0), 'developer is 0x0');

        governanceToken_i = _governanceToken;
        proxy_i = _proxy;
        votingPeriod_i = _votingPeriod;
        executionPeriod_i = _executionPeriod;
        developer_s = _developer;
    }

    modifier proposalShouldExist(uint256 _proposalID) {
        if (_proposalID == 0 || _proposalID > lastProposalID_s) {
            revert ProposalDoesNotExist();
        }
        _;
    }

    modifier contractShouldBeCurrentAdmin() {
        address currentAdmin = IProxy(proxy_i).PROXY_getAdmin();
        if (address(this) != currentAdmin) {
            revert ContractIsNotCurrentAdmin(currentAdmin);
        }
        _;
    }

    function getGovernanceTokenAddress() external view returns (address) {
        return governanceToken_i;
    }

    function getProxyAddress() external view returns (address) {
        return proxy_i;
    }

    function getDeveloperAddress() external view returns (address) {
        return developer_s;
    }

    function getVotingPeriod() external view returns (uint256) {
        return votingPeriod_i;
    }

    function getExecutionPeriod() external view returns (uint256) {
        return executionPeriod_i;
    }

    function getAcceptanceThreshold() external pure returns (uint256) {
        return ACCEPTANCE_THRESHOLD;
    }

    function getRejectionThreshold() external pure returns (uint256) {
        return REJECTION_THRESHOLD;
    }

    function getPublicProposalThreshold() external pure returns (uint256) {
        return PUBLIC_PROPOSAL_THRESHOLD;
    }

    function getLastProposalID() external view returns (uint256) {
        return lastProposalID_s;
    }

    function getUserProposals(
        address _proposer
    ) external view returns (uint256[] memory) {
        return userProposals_s[_proposer];
    }

    function getProposalMeta(
        uint256 _proposalID
    )
        external
        view
        proposalShouldExist(_proposalID)
        returns (ProposalMeta memory)
    {
        return proposalMeta_s[_proposalID];
    }

    function getProposalDetails(
        uint256 _proposalID
    )
        external
        view
        proposalShouldExist(_proposalID)
        returns (ProposalDetails memory)
    {
        return
            ProposalDetails({
                description: proposalDetails_description_s[_proposalID],
                createdBy: proposalDetails_createdBy_s[_proposalID],
                target: proposalDetails_target_s[_proposalID]
            });
    }

    function getProposalStatus(
        uint256 _proposalID
    ) external view proposalShouldExist(_proposalID) returns (ProposalStatus) {
        ProposalMeta memory pm = proposalMeta_s[_proposalID];
        return _getProposalStatus(pm);
    }

    function getVotingPower(
        uint256 _proposalID,
        address _voter
    ) external view proposalShouldExist(_proposalID) returns (uint256) {
        ProposalMeta memory pm = proposalMeta_s[_proposalID];
        return _getVotingPower(_voter, pm.votingStartBlock);
    }

    function getVotingDecision(
        uint256 _proposalID,
        address _voter
    ) external view proposalShouldExist(_proposalID) returns (VotingDecision) {
        return votingDecision_s[_proposalID][_voter];
    }

    function newProposal(
        ProposalType _ptype,
        string calldata _description,
        address _target
    ) external contractShouldBeCurrentAdmin returns (uint256) {
        bool proposedByDev = msg.sender == developer_s;
        uint96 votingStartBlock = SafeCast.toUint96(block.number - 1);

        if (_ptype == ProposalType.NewDeveloper) {
            if (!proposedByDev) {
                uint40 vp = _getVotingPower(msg.sender, votingStartBlock);
                if (vp < PUBLIC_PROPOSAL_THRESHOLD) {
                    revert NewProposal_VotingPowerBelowPublicProposalThreshold(
                        vp
                    );
                }
            }
        } else if (_ptype == ProposalType.NewProxyAdmin) {
            if (!proposedByDev) {
                revert DeveloperOnlyAllowedOperation();
            }
        } else if (_ptype == ProposalType.NewProxyImplementation) {
            if (!proposedByDev) {
                revert DeveloperOnlyAllowedOperation();
            }
        } else {
            revert NewProposal_UnsupportedProposalType(_ptype);
        }

        if (bytes(_description).length == 0) {
            revert NewProposal_DescriptionIsEmpty();
        }

        if (_target == address(0x0)) {
            revert NewProposal_TargetIsEmpty();
        }

        if (userProposals_s[msg.sender].length != 0) {
            uint256 lastUserProposal = userProposals_s[msg.sender][
                userProposals_s[msg.sender].length - 1
            ];
            ProposalMeta memory pm = proposalMeta_s[lastUserProposal];
            ProposalStatus status = _getProposalStatus(pm);
            if (!_isFinalStatus(status)) {
                revert NewProposal_SenderHasActiveProposal(lastUserProposal);
            }
        }

        uint256 proposalID = ++lastProposalID_s;
        proposalMeta_s[proposalID] = ProposalMeta({
            ptype: _ptype,
            votingStartBlock: votingStartBlock,
            votesFor: 0,
            votesAgainst: 0,
            proposedByDev: proposedByDev,
            executed: false,
            cancelled: false
        });
        proposalDetails_description_s[proposalID] = _description;
        proposalDetails_createdBy_s[proposalID] = msg.sender;
        proposalDetails_target_s[proposalID] = _target;
        userProposals_s[msg.sender].push(proposalID);

        emit ProposalCreated(proposalID, msg.sender);

        return proposalID;
    }

    function vote(
        uint256 _proposalID,
        bool _voteFor
    ) external proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta_s[_proposalID];

        ProposalStatus status = _getProposalStatus(pm);
        if (status != ProposalStatus.WaitingForVotes) {
            revert WrongProposalStatus(ProposalStatus.WaitingForVotes, status);
        }

        VotingDecision vd = votingDecision_s[_proposalID][msg.sender];
        if (vd != VotingDecision.NotVoted) {
            revert Vote_SenderAlreadyVoted();
        }

        uint40 vp = _getVotingPower(msg.sender, pm.votingStartBlock);

        if (_voteFor) {
            proposalMeta_s[_proposalID].votesFor = pm.votesFor + vp;
            votingDecision_s[_proposalID][msg.sender] = VotingDecision.VotedFor;
            emit ProposalVoteReceived(_proposalID, msg.sender, vp, 0);
        } else {
            proposalMeta_s[_proposalID].votesAgainst = pm.votesAgainst + vp;
            votingDecision_s[_proposalID][msg.sender] = VotingDecision
                .VotedAgainst;
            emit ProposalVoteReceived(_proposalID, msg.sender, 0, vp);
        }
    }

    function cancel(
        uint256 _proposalID
    ) external proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta_s[_proposalID];
        address createdBy = proposalDetails_createdBy_s[_proposalID];

        if (msg.sender != createdBy) {
            if (pm.proposedByDev) {
                if (msg.sender != developer_s) {
                    revert DeveloperOnlyAllowedOperation();
                }
            } else {
                uint40 vp = _getVotingPower(createdBy, block.number);
                if (vp >= PUBLIC_PROPOSAL_THRESHOLD) {
                    revert Cancel_SenderIsNotProposer(createdBy);
                }
            }
        }

        ProposalStatus status = _getProposalStatus(pm);
        if (_isFinalStatus(status)) {
            revert Cancel_ProposalHasBeenFinalized();
        }

        proposalMeta_s[_proposalID].cancelled = true;
        emit ProposalCancelled(_proposalID, msg.sender);
    }

    function execute(
        uint256 _proposalID
    ) external contractShouldBeCurrentAdmin proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta_s[_proposalID];

        if (pm.proposedByDev) {
            if (msg.sender != developer_s) {
                revert DeveloperOnlyAllowedOperation();
            }
        }

        ProposalStatus status = _getProposalStatus(pm);
        if (status != ProposalStatus.Accepted) {
            revert WrongProposalStatus(ProposalStatus.Accepted, status);
        }
        proposalMeta_s[_proposalID].executed = true;

        address target = proposalDetails_target_s[_proposalID];

        if (pm.ptype == ProposalType.NewDeveloper) {
            developer_s = target;
        } else if (pm.ptype == ProposalType.NewProxyAdmin) {
            IProxy(proxy_i).PROXY_setAdmin(target);
            _callInitialize(target);
        } else if (pm.ptype == ProposalType.NewProxyImplementation) {
            address currentImpl = IProxy(proxy_i).PROXY_getImplementation();
            if (currentImpl != address(0x0)) {
                _callTerminate(proxy_i);
            }
            IProxy(proxy_i).PROXY_setImplementation(target);
            _callInitialize(proxy_i);
        }

        emit ProposalExecuted(_proposalID, msg.sender);
    }

    function _getProposalStatus(
        ProposalMeta memory pm
    ) internal view returns (ProposalStatus) {
        // edge cases
        if (pm.votingStartBlock == 0x0) {
            return ProposalStatus.Invalid;
        }
        if (pm.cancelled) {
            return ProposalStatus.Cancelled;
        }
        if (pm.executed) {
            return ProposalStatus.Executed;
        }
        if (block.number < pm.votingStartBlock) {
            return ProposalStatus.Created;
        }

        uint256 votingEndBlock = pm.votingStartBlock + votingPeriod_i;
        uint256 executionEndBlock = votingEndBlock + executionPeriod_i;

        // explicit
        if (pm.votesAgainst >= REJECTION_THRESHOLD) {
            return ProposalStatus.Rejected;
        }
        if (pm.votesFor >= ACCEPTANCE_THRESHOLD) {
            if (block.number <= executionEndBlock) {
                return ProposalStatus.Accepted;
            } else {
                return ProposalStatus.Expired;
            }
        }

        // timeout
        if (block.number > votingEndBlock) {
            if (pm.proposedByDev) {
                if (block.number <= executionEndBlock) {
                    return ProposalStatus.Accepted;
                } else {
                    return ProposalStatus.Expired;
                }
            } else {
                return ProposalStatus.Rejected;
            }
        }

        return ProposalStatus.WaitingForVotes;
    }

    function _isFinalStatus(
        ProposalStatus status
    ) internal pure returns (bool) {
        return
            status == ProposalStatus.Cancelled ||
            status == ProposalStatus.Rejected ||
            status == ProposalStatus.Expired ||
            status == ProposalStatus.Executed;
    }

    function _getVotingPower(
        address _voter,
        uint256 _blockNumber
    ) internal view returns (uint40) {
        return
            SafeCast.toUint40(
                IGovernanceToken(governanceToken_i).balanceOfAt(
                    _voter,
                    _blockNumber
                )
            );
    }

    function _callTerminate(address _target) internal {
        (bool success, ) = _target.call(abi.encodeWithSignature('Terminate()'));
        require(success);
    }

    function _callInitialize(address _target) internal {
        (bool success, ) = _target.call(
            abi.encodeWithSignature('Initialize()')
        );
        require(success);
    }
}

contract ProxyAdminV1 is ProxyAdminV1Core {
    constructor(
        address _governanceToken,
        address _proxy,
        uint256 _votingPeriod,
        uint256 _executionPeriod,
        address _developer
    )
        ProxyAdminV1Core(
            _governanceToken,
            _proxy,
            _votingPeriod,
            _executionPeriod,
            _developer
        )
    {}

    modifier developerOnly() {
        if (msg.sender != developer_s) {
            revert DeveloperOnlyAllowedOperation();
        }
        _;
    }
}
