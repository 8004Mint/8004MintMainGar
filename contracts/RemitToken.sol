// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RemitToken
 * @notice REMIT token with 1% transfer tax
 * @dev Total supply: 1,000,000 REMIT
 *      - 200,000 minted to deployer for LP
 *      - 800,000 mintable through Remittance contract
 */
contract RemitToken is ERC20, Ownable {
    // Tax configuration
    uint256 public constant TAX_RATE = 100; // 1% = 100 basis points
    uint256 public constant TAX_DENOMINATOR = 10000;
    
    // Tax wallet receives all transfer taxes
    address public taxWallet;
    
    // Addresses excluded from tax (e.g., contracts, LP pools)
    mapping(address => bool) public isExcludedFromTax;
    
    // Remittance contract (can mint tokens)
    address public remittanceContract;
    
    // Maximum mintable supply through Remittance (800,000 tokens)
    uint256 public constant MAX_MINTABLE = 800_000 * 10**18;
    uint256 public totalMinted;
    
    // Events
    event TaxWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event ExcludedFromTax(address indexed account, bool excluded);
    event RemittanceContractSet(address indexed remittanceContract);
    event TaxCollected(address indexed from, address indexed to, uint256 taxAmount);
    
    constructor(
        address _taxWallet,
        address _initialHolder
    ) ERC20("Remit", "REMIT") Ownable(msg.sender) {
        require(_taxWallet != address(0), "Tax wallet cannot be zero");
        require(_initialHolder != address(0), "Initial holder cannot be zero");
        
        taxWallet = _taxWallet;
        
        // Mint 200,000 REMIT to initial holder for LP
        _mint(_initialHolder, 200_000 * 10**18);
        
        // Exclude deployer and tax wallet from tax
        isExcludedFromTax[_initialHolder] = true;
        isExcludedFromTax[_taxWallet] = true;
        isExcludedFromTax[address(this)] = true;
    }
    
    /**
     * @notice Set or update the Remittance contract address
     * @param _remittanceContract Address of the Remittance contract
     */
    function setRemittanceContract(address _remittanceContract) external onlyOwner {
        require(_remittanceContract != address(0), "Invalid address");
        
        // Remove tax exclusion from old contract if exists
        if (remittanceContract != address(0)) {
            isExcludedFromTax[remittanceContract] = false;
        }
        
        remittanceContract = _remittanceContract;
        isExcludedFromTax[_remittanceContract] = true;
        
        emit RemittanceContractSet(_remittanceContract);
    }
    
    /**
     * @notice Mint tokens (only callable by Remittance contract)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == remittanceContract, "Only Remittance contract can mint");
        require(totalMinted + amount <= MAX_MINTABLE, "Exceeds max mintable supply");
        
        totalMinted += amount;
        _mint(to, amount);
    }
    
    /**
     * @notice Update tax wallet address
     * @param _newTaxWallet New tax wallet address
     */
    function setTaxWallet(address _newTaxWallet) external onlyOwner {
        require(_newTaxWallet != address(0), "Tax wallet cannot be zero");
        
        address oldWallet = taxWallet;
        isExcludedFromTax[oldWallet] = false;
        
        taxWallet = _newTaxWallet;
        isExcludedFromTax[_newTaxWallet] = true;
        
        emit TaxWalletUpdated(oldWallet, _newTaxWallet);
    }
    
    /**
     * @notice Exclude or include an address from tax
     * @param account Address to update
     * @param excluded Whether to exclude from tax
     */
    function setExcludedFromTax(address account, bool excluded) external onlyOwner {
        isExcludedFromTax[account] = excluded;
        emit ExcludedFromTax(account, excluded);
    }
    
    /**
     * @notice Override transfer to apply tax
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // Skip tax for minting, burning, or excluded addresses
        if (from == address(0) || to == address(0) || 
            isExcludedFromTax[from] || isExcludedFromTax[to]) {
            super._update(from, to, amount);
            return;
        }
        
        // Calculate 1% tax
        uint256 taxAmount = (amount * TAX_RATE) / TAX_DENOMINATOR;
        uint256 transferAmount = amount - taxAmount;
        
        // Transfer tax to tax wallet
        if (taxAmount > 0) {
            super._update(from, taxWallet, taxAmount);
            emit TaxCollected(from, to, taxAmount);
        }
        
        // Transfer remaining amount to recipient
        super._update(from, to, transferAmount);
    }
    
    /**
     * @notice Get remaining mintable amount
     */
    function remainingMintable() external view returns (uint256) {
        return MAX_MINTABLE - totalMinted;
    }
}
