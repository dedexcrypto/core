// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface IProxyAdminV1Core {
    enum ProposalType {
        Invalid,
        NewDeveloper,
        NewProxyAdmin,
        NewProxyImplementation
    }

    enum ProposalStatus {
        Invalid,
        Created,
        WaitingForVotes,
        Rejected,
        Accepted,
        Executed,
        Expired,
        Cancelled
    }

    enum VotingDecision {
        NotVoted,
        VotedFor,
        VotedAgainst
    }

    struct ProposalMeta {
        ProposalType ptype;
        uint96 votingStartBlock;
        uint40 votesFor;
        uint40 votesAgainst;
        bool proposedByDev;
        bool executed;
        bool cancelled;
    }

    struct ProposalDetails {
        string description;
        address createdBy;
        address target;
    }

    event ProposalCreated(uint256 indexed id, address indexed createdBy);
    event ProposalCancelled(uint256 indexed id, address indexed cancelledBy);
    event ProposalExecuted(uint256 indexed id, address indexed executedBy);
    event ProposalVoteReceived(
        uint256 indexed proposalID,
        address indexed votedBy,
        uint256 vFor,
        uint256 vAgainst
    );

    error ContractIsNotCurrentAdmin(address currentAdmin);
    error ProposalDoesNotExist();
    error DeveloperOnlyAllowedOperation();
    error WrongProposalStatus(ProposalStatus expected, ProposalStatus got);
    error Vote_SenderAlreadyVoted();
    error NewProposal_VotingPowerBelowPublicProposalThreshold(uint256 vp);
    error NewProposal_UnsupportedProposalType(ProposalType ptype);
    error NewProposal_DescriptionIsEmpty();
    error NewProposal_TargetIsEmpty();
    error NewProposal_SenderHasActiveProposal(uint256 proposalID);
    error Cancel_SenderIsNotProposer(address proposer);
    error Cancel_ProposalHasBeenFinalized();

    function getGovernanceTokenAddress() external view returns (address);
    function getProxyAddress() external view returns (address);
    function getDeveloperAddress() external view returns (address);

    function getVotingPeriod() external view returns (uint256);
    function getExecutionPeriod() external view returns (uint256);
    function getAcceptanceThreshold() external view returns (uint256);
    function getRejectionThreshold() external view returns (uint256);
    function getPublicProposalThreshold() external view returns (uint256);

    function getLastProposalID() external view returns (uint256);
    function getUserProposals(
        address _proposer
    ) external view returns (uint256[] memory);

    function getProposalMeta(
        uint256 _proposalID
    ) external view returns (ProposalMeta memory);
    function getProposalDetails(
        uint256 _proposalID
    ) external view returns (ProposalDetails memory);
    function getProposalStatus(
        uint256 _proposalID
    ) external view returns (ProposalStatus);

    function getVotingPower(
        uint256 _proposalID,
        address _voter
    ) external view returns (uint256);
    function getVotingDecision(
        uint256 _proposalID,
        address _voter
    ) external view returns (VotingDecision);

    function newProposal(
        ProposalType _ptype,
        string calldata _description,
        address _target
    ) external returns (uint256);

    function vote(uint256 _proposalID, bool _voteFor) external;
    function cancel(uint256 _proposalID) external;
    function execute(uint256 _proposalID) external;
}

interface IProxyAdminV1 is IProxyAdminV1Core {
    /*_*/
}
