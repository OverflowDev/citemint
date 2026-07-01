// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Testnet escrow where every settlement must be covered by the payer's own signed budget
/// voucher (EIP-712). Unlike v1, the operator cannot spend a user's balance on its own: it only relays
/// settlements that stay within a voucher the payer signed (bound to their wallet, question, budget,
/// deadline and nonce). A leaked operator key can never exceed a user's signed authorization.
contract CiteMintEscrowV2 is Ownable2Step, Pausable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    struct SpendAuthorization {
        address payer;
        bytes32 questionHash;
        uint256 maxTotal;
        uint256 deadline;
        bytes32 nonce;
    }

    bytes32 private constant SPEND_AUTHORIZATION_TYPEHASH =
        keccak256("SpendAuthorization(address payer,bytes32 questionHash,uint256 maxTotal,uint256 deadline,bytes32 nonce)");

    uint16 public constant MAX_FEE_BPS = 1_000; // 10% hard cap
    IERC20 public immutable usdc;
    address public treasury;
    uint16 public platformFeeBps;
    uint256 public totalEscrowed;

    mapping(address => uint256) public balances;
    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public settledPayments;
    mapping(bytes32 => uint256) public spentByNonce;

    error ZeroAddress();
    error InvalidAmount();
    error FeeTooHigh();
    error NotOperator();
    error InsufficientBalance();
    error PaymentAlreadySettled();
    error AuthorizationExpired();
    error InvalidSignature();
    error BudgetExceeded();

    event Deposited(address indexed payer, uint256 amount);
    event Withdrawn(address indexed payer, uint256 amount);
    event CitationSettled(bytes32 indexed paymentId, address indexed payer, address indexed creator, uint256 grossAmount, uint256 creatorAmount, uint256 platformFee);
    event OperatorUpdated(address indexed operator, bool allowed);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint16 previousFeeBps, uint16 newFeeBps);

    constructor(address usdcAddress, address initialOwner, address initialTreasury, uint16 initialFeeBps)
        Ownable(initialOwner)
        EIP712("CiteMint", "1")
    {
        if (usdcAddress == address(0) || initialOwner == address(0) || initialTreasury == address(0)) revert ZeroAddress();
        if (initialFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        usdc = IERC20(usdcAddress);
        treasury = initialTreasury;
        platformFeeBps = initialFeeBps;
        operators[initialOwner] = true;
        emit OperatorUpdated(initialOwner, true);
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        balances[msg.sender] += amount;
        totalEscrowed += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        totalEscrowed -= amount;
        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice EIP-712 digest a payer signs to authorize spending. Exposed for off-chain construction/tests.
    function hashAuthorization(SpendAuthorization calldata auth) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(SPEND_AUTHORIZATION_TYPEHASH, auth.payer, auth.questionHash, auth.maxTotal, auth.deadline, auth.nonce))
        );
    }

    /// @notice Remaining spend available under a voucher.
    function remainingBudget(SpendAuthorization calldata auth) external view returns (uint256) {
        uint256 spent = spentByNonce[auth.nonce];
        return spent >= auth.maxTotal ? 0 : auth.maxTotal - spent;
    }

    /// @notice Settle a citation strictly within a payer-signed budget voucher. The operator only relays:
    /// it cannot exceed maxTotal, spend past the deadline, or act without a valid payer signature.
    function settleWithAuthorization(
        SpendAuthorization calldata auth,
        bytes calldata signature,
        address creator,
        uint256 grossAmount,
        bytes32 paymentId
    ) external nonReentrant whenNotPaused onlyOperator {
        if (auth.payer == address(0) || creator == address(0)) revert ZeroAddress();
        if (grossAmount == 0) revert InvalidAmount();
        if (block.timestamp > auth.deadline) revert AuthorizationExpired();
        if (settledPayments[paymentId]) revert PaymentAlreadySettled();

        address signer = ECDSA.recover(hashAuthorization(auth), signature);
        if (signer != auth.payer) revert InvalidSignature();

        uint256 spent = spentByNonce[auth.nonce] + grossAmount;
        if (spent > auth.maxTotal) revert BudgetExceeded();
        if (balances[auth.payer] < grossAmount) revert InsufficientBalance();

        settledPayments[paymentId] = true;
        spentByNonce[auth.nonce] = spent;
        balances[auth.payer] -= grossAmount;
        totalEscrowed -= grossAmount;

        uint256 fee = (grossAmount * platformFeeBps) / 10_000;
        uint256 creatorAmount = grossAmount - fee;
        usdc.safeTransfer(creator, creatorAmount);
        if (fee > 0) usdc.safeTransfer(treasury, fee);

        emit CitationSettled(paymentId, auth.payer, creator, grossAmount, creatorAmount, fee);
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) revert ZeroAddress();
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function setPlatformFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        uint16 oldFeeBps = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFeeBps, newFeeBps);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Owner can recover only tokens above user escrow liabilities.
    function rescueExcess(address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 tokenBalance = usdc.balanceOf(address(this));
        uint256 excess = tokenBalance > totalEscrowed ? tokenBalance - totalEscrowed : 0;
        if (excess == 0) revert InvalidAmount();
        usdc.safeTransfer(recipient, excess);
    }
}
