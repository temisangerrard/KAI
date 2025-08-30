# Requirements Document

## Introduction

The Wallet Dashboard Enhancement focuses on core missing functionality in KAI's smart wallet interface. This enhancement adds total portfolio value calculation, real token detection, custom token support, and network switching to provide users with essential wallet features that work reliably.

## Requirements

### Requirement 1: Total Portfolio Value Display

**User Story:** As a user with multiple crypto assets, I want to see the total USD value of my entire wallet, so that I can quickly understand my overall portfolio worth.

#### Acceptance Criteria

1. WHEN the wallet page loads THEN it SHALL display total portfolio value in USD prominently at the top
2. WHEN calculating total value THEN the system SHALL sum USD values of all tokens with non-zero balances
3. WHEN price data is available THEN each individual token SHALL show its USD value
4. WHEN price data is unavailable THEN the system SHALL display "Price unavailable" for that token
5. WHEN portfolio value is loading THEN a loading indicator SHALL be displayed
6. WHEN there are no assets THEN the total value SHALL show $0.00

### Requirement 2: Real Token Detection and Display

**User Story:** As a user with various ERC-20 tokens, I want to see all tokens I actually own, so that I can manage my complete portfolio instead of just ETH and USDC.

#### Acceptance Criteria

1. WHEN the wallet page loads THEN it SHALL automatically detect all ERC-20 tokens with non-zero balances
2. WHEN displaying tokens THEN each SHALL show symbol, name, balance, and USD value if available
3. WHEN a token has a logo available THEN it SHALL be displayed next to the token information
4. WHEN token detection is loading THEN loading indicators SHALL be shown for the token list
5. WHEN token detection fails THEN an error message SHALL be displayed with retry option
6. WHEN no additional tokens are found THEN only native ETH SHALL be displayed

### Requirement 3: Custom Token Addition

**User Story:** As a user who wants to track specific tokens, I want to add custom tokens by contract address, so that I can monitor tokens that aren't automatically detected.

#### Acceptance Criteria

1. WHEN a user clicks "Add Token" THEN they SHALL see an input field for contract address
2. WHEN a valid contract address is entered THEN the system SHALL fetch token metadata (symbol, name, decimals)
3. WHEN token metadata is retrieved THEN the token SHALL be added to the user's token list
4. WHEN an invalid contract address is entered THEN an error message SHALL be displayed
5. WHEN adding a token that already exists THEN the system SHALL show "Token already added"
6. WHEN a custom token is added THEN it SHALL persist for future wallet visits

### Requirement 4: Network Switching Support

**User Story:** As a user who wants to use different networks, I want to understand and control which network my wallet is connected to, so that I can access testnet for testing or mainnet for real transactions.

#### Acceptance Criteria

1. WHEN the wallet page loads THEN it SHALL clearly display the current network (Base Mainnet/Base Sepolia)
2. WHEN on testnet THEN the interface SHALL display a prominent "TESTNET" warning indicator
3. WHEN network information is available THEN users SHALL see network status and connection details
4. IF network switching is supported by CDP THEN users SHALL be able to switch between available networks
5. WHEN network changes THEN all wallet data SHALL refresh to show data for the new network
6. WHEN network switching fails THEN an appropriate error message SHALL be displayed