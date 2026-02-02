// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ReteToken is ERC20Permit, ERC20Burnable, Ownable {
    using ECDSA for bytes32;

    address public immutable adminSpender;
    bool public mintPaused;
    bool public adminBurnEnabled;

    // EIP 712 per mint gasless
    bytes32 private constant MINT_TYPEHASH = keccak256(
        "MintAuthorization(address signer,address to,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    mapping(address => uint256) public mintNonces;

    // EIP 712 per burn gasless avviato dal Coordinatore
    bytes32 private constant BURN_TYPEHASH = keccak256(
        "BurnAuthorization(address signer,address from,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    mapping(address => uint256) public burnNonces;

    event MintPausedSet(bool paused);
    event AdminBurnToggled(bool enabled);
    event AdminBurn(address indexed from, uint256 amount);
    event AdminBatchBurn(uint256 holders, uint256 total);
    event MintWithSig(address indexed signer, address indexed to, uint256 amount, uint256 nonce);
    event BurnWithSig(address indexed signer, address indexed from, uint256 amount, uint256 nonce);

    constructor(
        string memory name_,
        string memory symbol_,
        address coordinatorOwner,
        address adminSpender_
    ) ERC20(name_, symbol_) ERC20Permit(name_) Ownable(coordinatorOwner) {
        require(coordinatorOwner != address(0), "invalid coordinator");
        require(adminSpender_ != address(0), "invalid adminSpender");
        adminSpender = adminSpender_;
        mintPaused = false;
        adminBurnEnabled = false;
    }

    // Mint on chain, solo owner
    function mint(address to, uint256 amount) external onlyOwner {
        require(!mintPaused, "mint paused");
        _mint(to, amount);
    }

    // Mint con firma del Coordinatore, il server paga gas
    function mintWithSig(
        address signer,
        address to,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(!mintPaused, "mint paused");
        require(block.timestamp <= deadline, "expired");
        require(signer == owner(), "only owner can authorize");

        uint256 nonce = mintNonces[signer]++;
        bytes32 structHash = keccak256(
            abi.encode(MINT_TYPEHASH, signer, to, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, v, r, s);
        require(recovered == signer, "bad signature");

        _mint(to, amount);
        emit MintWithSig(signer, to, amount, nonce);
    }

    // Burn con firma del Coordinatore, il server paga gas
    // Puoi bruciare token dal wallet "from" senza allowance, in base alla firma del Coordinatore
    function burnWithSig(
        address signer,
        address from,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "expired");
        require(signer == owner(), "only owner can authorize");

        uint256 nonce = burnNonces[signer]++;
        bytes32 structHash = keccak256(
            abi.encode(BURN_TYPEHASH, signer, from, amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, v, r, s);
        require(recovered == signer, "bad signature");

        _burn(from, amount);
        emit BurnWithSig(signer, from, amount, nonce);
    }

    function setMintPaused(bool paused) external onlyOwner {
        mintPaused = paused;
        emit MintPausedSet(paused);
    }

    // Facoltativo, se vuoi mantenere anche il burn amministrativo on chain
    function toggleAdminBurn(bool enabled) external onlyOwner {
        adminBurnEnabled = enabled;
        emit AdminBurnToggled(enabled);
    }

    function adminBurn(address from, uint256 amount) external onlyOwner {
        require(adminBurnEnabled, "admin burn disabled");
        _burn(from, amount);
        emit AdminBurn(from, amount);
    }

    function adminBatchBurn(address[] calldata holders, uint256[] calldata amounts) external onlyOwner {
        require(adminBurnEnabled, "admin burn disabled");
        require(holders.length == amounts.length, "arrays mismatch");
        uint256 total;
        for (uint256 i = 0; i < holders.length; i++) {
            _burn(holders[i], amounts[i]);
            total += amounts[i];
            emit AdminBurn(holders[i], amounts[i]);
        }
        emit AdminBatchBurn(holders.length, total);
    }

    // Burn tramite allowance, compatibile con permit
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
    }
}
