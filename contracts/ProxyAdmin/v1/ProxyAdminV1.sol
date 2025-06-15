// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.28;

import {IGovernanceToken} from '../../GovernanceToken/IGovernanceToken.sol';
import {IProxy} from '../../Proxy/IProxy.sol';
import {BaseImplementation} from '../../Implementation/Common.sol';
import {IProxyAdminV1} from './IProxyAdminV1.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';

abstract contract ProxyAdminV1Core is IProxyAdminV1 {
    error AssertionError(string message);

    // 13! * (2 / 3) + 1
    uint40 internal constant ACCEPTANCE_THRESHOLD = 4_151_347_201;
    // 13! * (1 / 3)
    uint40 internal constant REJECTION_THRESHOLD = 2_075_673_600;
    // 13! * 0.05
    uint40 internal constant PUBLIC_PROPOSAL_THRESHOLD = 311_351_040;

    address internal immutable GOVERNANCE_TOKEN;
    address internal immutable PROXY;

    uint256 internal immutable VOTING_PERIOD;
    uint256 internal immutable EXECUTION_PERIOD;

    address internal developer;

    uint256 internal lastProposalID;
    mapping(address => uint256[]) internal userProposals;

    mapping(uint256 => ProposalMeta) internal proposalMeta;
    mapping(uint256 => string) internal proposalDetailsDescription;
    mapping(uint256 => address) internal proposalDetailsCreatedBy;
    mapping(uint256 => address) internal proposalDetailsTarget;

    mapping(uint256 => mapping(address => VotingDecision))
        internal votingDecisions;

    constructor(
        address _governanceToken,
        address _proxy,
        uint256 _votingPeriod,
        uint256 _executionPeriod,
        address _developer
    ) {
        _assert(_governanceToken != address(0x0), 'governance token is 0x0');
        _assert(_proxy != address(0x0), 'proxy is 0x0');
        _assert(_votingPeriod > 0, 'voting period is 0');
        _assert(_executionPeriod > 0, 'execution period is 0');
        _assert(_developer != address(0x0), 'developer is 0x0');

        GOVERNANCE_TOKEN = _governanceToken;
        PROXY = _proxy;
        VOTING_PERIOD = _votingPeriod;
        EXECUTION_PERIOD = _executionPeriod;
        developer = _developer;
    }

    modifier proposalShouldExist(uint256 _proposalID) {
        if (_proposalID == 0 || _proposalID > lastProposalID) {
            revert ProposalDoesNotExist();
        }
        _;
    }

    modifier contractShouldBeCurrentAdmin() {
        address currentAdmin = IProxy(PROXY).PROXY_getAdmin();
        if (address(this) != currentAdmin) {
            revert ContractIsNotCurrentAdmin(currentAdmin);
        }
        _;
    }

    function getGovernanceTokenAddress() external view returns (address) {
        return GOVERNANCE_TOKEN;
    }

    function getProxyAddress() external view returns (address) {
        return PROXY;
    }

    function getDeveloperAddress() external view returns (address) {
        return developer;
    }

    function getVotingPeriod() external view returns (uint256) {
        return VOTING_PERIOD;
    }

    function getExecutionPeriod() external view returns (uint256) {
        return EXECUTION_PERIOD;
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
        return lastProposalID;
    }

    function getUserProposals(
        address _proposer
    ) external view returns (uint256[] memory) {
        return userProposals[_proposer];
    }

    function getProposalMeta(
        uint256 _proposalID
    )
        external
        view
        proposalShouldExist(_proposalID)
        returns (ProposalMeta memory)
    {
        return proposalMeta[_proposalID];
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
                description: proposalDetailsDescription[_proposalID],
                createdBy: proposalDetailsCreatedBy[_proposalID],
                target: proposalDetailsTarget[_proposalID]
            });
    }

    function getProposalStatus(
        uint256 _proposalID
    ) external view proposalShouldExist(_proposalID) returns (ProposalStatus) {
        ProposalMeta memory pm = proposalMeta[_proposalID];
        return _getProposalStatus(pm);
    }

    function getVotingPower(
        uint256 _proposalID,
        address _voter
    ) external view proposalShouldExist(_proposalID) returns (uint256) {
        ProposalMeta memory pm = proposalMeta[_proposalID];
        return _getVotingPower(_voter, pm.votingStartBlock);
    }

    function getVotingDecision(
        uint256 _proposalID,
        address _voter
    ) external view proposalShouldExist(_proposalID) returns (VotingDecision) {
        return votingDecisions[_proposalID][_voter];
    }

    function newProposal(
        ProposalType _ptype,
        string calldata _description,
        address _target
    ) external contractShouldBeCurrentAdmin returns (uint256) {
        bool proposedByDev = msg.sender == developer;
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

        if (userProposals[msg.sender].length != 0) {
            uint256 lastUserProposal = userProposals[msg.sender][
                userProposals[msg.sender].length - 1
            ];
            ProposalMeta memory pm = proposalMeta[lastUserProposal];
            ProposalStatus status = _getProposalStatus(pm);
            if (!_isFinalStatus(status)) {
                revert NewProposal_SenderHasActiveProposal(lastUserProposal);
            }
        }

        uint256 proposalID = ++lastProposalID;
        proposalMeta[proposalID] = ProposalMeta({
            ptype: _ptype,
            votingStartBlock: votingStartBlock,
            votesFor: 0,
            votesAgainst: 0,
            proposedByDev: proposedByDev,
            executed: false,
            cancelled: false
        });
        proposalDetailsDescription[proposalID] = _description;
        proposalDetailsCreatedBy[proposalID] = msg.sender;
        proposalDetailsTarget[proposalID] = _target;
        userProposals[msg.sender].push(proposalID);

        emit ProposalCreated(proposalID, msg.sender);

        return proposalID;
    }

    function vote(
        uint256 _proposalID,
        bool _voteFor
    ) external proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta[_proposalID];

        ProposalStatus status = _getProposalStatus(pm);
        if (status != ProposalStatus.WaitingForVotes) {
            revert WrongProposalStatus(ProposalStatus.WaitingForVotes, status);
        }

        VotingDecision vd = votingDecisions[_proposalID][msg.sender];
        if (vd != VotingDecision.NotVoted) {
            revert Vote_SenderAlreadyVoted();
        }

        uint40 vp = _getVotingPower(msg.sender, pm.votingStartBlock);

        if (_voteFor) {
            proposalMeta[_proposalID].votesFor = pm.votesFor + vp;
            votingDecisions[_proposalID][msg.sender] = VotingDecision.VotedFor;
            emit ProposalVoteReceived(_proposalID, msg.sender, vp, 0);
        } else {
            proposalMeta[_proposalID].votesAgainst = pm.votesAgainst + vp;
            votingDecisions[_proposalID][msg.sender] = VotingDecision
                .VotedAgainst;
            emit ProposalVoteReceived(_proposalID, msg.sender, 0, vp);
        }
    }

    function cancel(
        uint256 _proposalID
    ) external proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta[_proposalID];
        address createdBy = proposalDetailsCreatedBy[_proposalID];

        if (msg.sender != createdBy) {
            if (pm.proposedByDev) {
                if (msg.sender != developer) {
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

        proposalMeta[_proposalID].cancelled = true;
        emit ProposalCancelled(_proposalID, msg.sender);
    }

    function execute(
        uint256 _proposalID
    ) external contractShouldBeCurrentAdmin proposalShouldExist(_proposalID) {
        ProposalMeta memory pm = proposalMeta[_proposalID];

        if (pm.proposedByDev) {
            if (msg.sender != developer) {
                revert DeveloperOnlyAllowedOperation();
            }
        }

        ProposalStatus status = _getProposalStatus(pm);
        if (status != ProposalStatus.Accepted) {
            revert WrongProposalStatus(ProposalStatus.Accepted, status);
        }
        proposalMeta[_proposalID].executed = true;

        address target = proposalDetailsTarget[_proposalID];

        if (pm.ptype == ProposalType.NewDeveloper) {
            developer = target;
        } else if (pm.ptype == ProposalType.NewProxyAdmin) {
            IProxy(PROXY).PROXY_setAdmin(target);
        } else if (pm.ptype == ProposalType.NewProxyImplementation) {
            IProxy proxy = IProxy(PROXY);
            BaseImplementation pImpl = BaseImplementation(PROXY);

            address currentImpl = proxy.PROXY_getImplementation();
            if (currentImpl != address(0x0)) {
                pImpl.Terminate();
            }
            proxy.PROXY_setImplementation(target);
            pImpl.Initialize();
        }

        emit ProposalExecuted(_proposalID, msg.sender);
    }

    function _getProposalStatus(
        ProposalMeta memory _pm
    ) internal view returns (ProposalStatus) {
        // edge cases
        if (_pm.votingStartBlock == 0x0) {
            return ProposalStatus.Invalid;
        }
        if (_pm.cancelled) {
            return ProposalStatus.Cancelled;
        }
        if (_pm.executed) {
            return ProposalStatus.Executed;
        }
        if (block.number < _pm.votingStartBlock) {
            return ProposalStatus.Created;
        }

        uint256 votingEndBlock = _pm.votingStartBlock + VOTING_PERIOD;
        uint256 executionEndBlock = votingEndBlock + EXECUTION_PERIOD;

        // explicit
        if (_pm.votesAgainst >= REJECTION_THRESHOLD) {
            return ProposalStatus.Rejected;
        }
        if (_pm.votesFor >= ACCEPTANCE_THRESHOLD) {
            if (block.number <= executionEndBlock) {
                return ProposalStatus.Accepted;
            } else {
                return ProposalStatus.Expired;
            }
        }

        // timeout
        if (block.number > votingEndBlock) {
            if (_pm.proposedByDev) {
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
        ProposalStatus _status
    ) internal pure returns (bool) {
        return
            _status == ProposalStatus.Cancelled ||
            _status == ProposalStatus.Rejected ||
            _status == ProposalStatus.Expired ||
            _status == ProposalStatus.Executed;
    }

    function _getVotingPower(
        address _voter,
        uint256 _blockNumber
    ) internal view returns (uint40) {
        return
            SafeCast.toUint40(
                IGovernanceToken(GOVERNANCE_TOKEN).balanceOfAt(
                    _voter,
                    _blockNumber
                )
            );
    }

    function _assert(bool _condition, string memory _message) internal pure {
        if (!_condition) {
            revert AssertionError(_message);
        }
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
        if (msg.sender != developer) {
            revert DeveloperOnlyAllowedOperation();
        }
        _;
    }
}
