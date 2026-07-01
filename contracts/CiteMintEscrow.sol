// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet escrow for user-funded CiteMint research.
/// @dev Production nanopayments should prefer Circle Gateway batching/x402.
contract CiteMintEscrow is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint16 public constant MAX_FEE_BPS = 1_000; // 10% hard cap
    IERC20 public immutable usdc;
    address public treasury;
    uint16 public platformFeeBps;
    uint256 public totalEscrowed;

    mapping(address => uint256) public balances;
    mapping(address => bool) public operators;
    mapping(bytes32 => bool) public settledPayments;

    error ZeroAddress();
    error InvalidAmount();
    error FeeTooHigh();
    error NotOperator();
    error InsufficientBalance();
    error PaymentAlreadySettled();

    event Deposited(address indexed payer, uint256 amount);
    event Withdrawn(address indexed payer, uint256 amount);
    event CitationSettled(bytes32 indexed paymentId, address indexed payer, address indexed creator, uint256 grossAmount, uint256 creatorAmount, uint256 platformFee);
    event OperatorUpdated(address indexed operator, bool allowed);
    event TreasuryUpdated(address indexed previousTreasury, address indexed newTreasury);
    event PlatformFeeUpdated(uint16 previousFeeBps, uint16 newFeeBps);

    constructor(address usdcAddress, address initialOwner, address initialTreasury, uint16 initialFeeBps)
        Ownable(initialOwner)
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

    function settleCitation(address payer, address creator, uint256 grossAmount, bytes32 paymentId)
        external
        nonReentrant
        whenNotPaused
        onlyOperator
    {
        if (payer == address(0) || creator == address(0)) revert ZeroAddress();
        if (grossAmount == 0) revert InvalidAmount();
        if (settledPayments[paymentId]) revert PaymentAlreadySettled();
        if (balances[payer] < grossAmount) revert InsufficientBalance();

        settledPayments[paymentId] = true;
        balances[payer] -= grossAmount;
        totalEscrowed -= grossAmount;

        uint256 fee = (grossAmount * platformFeeBps) / 10_000;
        uint256 creatorAmount = grossAmount - fee;
        usdc.safeTransfer(creator, creatorAmount);
        if (fee > 0) usdc.safeTransfer(treasury, fee);

        emit CitationSettled(paymentId, payer, creator, grossAmount, creatorAmount, fee);
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
