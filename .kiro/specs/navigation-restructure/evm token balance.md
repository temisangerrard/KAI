# List EVM token balances

> Lists the token balances of an EVM address on a given network. The balances include ERC-20 tokens and the native gas token (usually ETH). The response is paginated, and by default, returns 20 balances per page.
**Note:** This endpoint is still under development and does not yet provide strong freshness guarantees. Specifically, balances of new tokens can, on occasion, take up to ~30 seconds to appear, while balances of tokens already belonging to an address will generally be close to chain tip. Freshness of new token balances will improve over the coming weeks.

## OpenAPI

````yaml get /v2/evm/token-balances/{network}/{address}
paths:
  path: /v2/evm/token-balances/{network}/{address}
  method: get
  servers:
    - url: https://api.cdp.coinbase.com/platform
      description: The production server of the CDP APIs.
  request:
    security:
      - title: apiKeyAuth
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
              description: >-
                A JWT signed using your CDP API Key Secret, encoded in base64.
                Refer to the [Generate Bearer
                Token](https://docs.cdp.coinbase.com/api-reference/v2/authentication#2-generate-bearer-token)
                section of our Authentication docs for information on how to
                generate your Bearer Token.
          cookie: {}
    parameters:
      path:
        address:
          schema:
            - type: string
              required: true
              description: >-
                The 0x-prefixed EVM address to get balances for. The address
                does not need to be checksummed.
        network:
          schema:
            - type: enum<string>
              enum:
                - base
                - base-sepolia
                - ethereum
              required: true
              description: The human-readable network name to get the balances for.
              example: base
      query:
        pageSize:
          schema:
            - type: integer
              required: false
              description: The number of balances to return per page.
              default: 20
        pageToken:
          schema:
            - type: string
              required: false
              description: >-
                The token for the next page of balances. Will be empty if there
                are no more balances to fetch.
      header: {}
      cookie: {}
    body: {}
  response:
    '200':
      application/json:
        schemaArray:
          - type: object
            properties:
              balances:
                allOf:
                  - type: array
                    items:
                      $ref: '#/components/schemas/TokenBalance'
                    description: The list of EVM token balances.
                    example:
                      - amount:
                          amount: '1250000000000000000'
                          decimals: 18
                        token:
                          network: base
                          symbol: ETH
                          name: ether
                          contractAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
                      - amount:
                          amount: '123456'
                          decimals: 6
                        token:
                          network: base
                          symbol: USDC
                          name: USD Coin
                          contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
              nextPageToken:
                allOf:
                  - type: string
                    description: The token for the next page of items, if any.
                    example: >-
                      eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==
            refIdentifier: '#/components/schemas/ListResponse'
            requiredProperties:
              - balances
        examples:
          example:
            value:
              balances:
                - amount:
                    amount: '1250000000000000000'
                    decimals: 18
                  token:
                    network: base
                    symbol: ETH
                    name: ether
                    contractAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
                - amount:
                    amount: '123456'
                    decimals: 6
                  token:
                    network: base
                    symbol: USDC
                    name: USD Coin
                    contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
              nextPageToken: eyJsYXN0X2lkIjogImFiYzEyMyIsICJ0aW1lc3RhbXAiOiAxNzA3ODIzNzAxfQ==
        description: Successfully listed token balances.
    '400':
      application/json:
        schemaArray:
          - type: object
            properties:
              errorType:
                allOf:
                  - &ref_0
                    $ref: '#/components/schemas/ErrorType'
              errorMessage:
                allOf:
                  - &ref_1
                    description: The error message.
                    type: string
                    example: Unable to create EVM account
              correlationId:
                allOf:
                  - &ref_2
                    description: >-
                      A unique identifier for the request that generated the
                      error. This can be used to help debug issues with the API.
                    type: string
                    example: 41deb8d59a9dc9a7-IAD
              errorLink:
                allOf:
                  - &ref_3
                    description: A link to the corresponding error documentation.
                    type: string
                    example: >-
                      https://docs.cdp.coinbase.com/api-reference/v2/errors#invalid-request
            description: >-
              An error response including the code for the type of error and a
              human-readable message describing the error.
            refIdentifier: '#/components/schemas/Error'
            requiredProperties: &ref_4
              - errorType
              - errorMessage
            example: &ref_5
              errorType: invalid_request
              errorMessage: Invalid request.
              correlationId: 41deb8d59a9dc9a7-IAD
              errorLink: >-
                https://docs.cdp.coinbase.com/api-reference/v2/errors#invalid-request
        examples:
          invalid_request:
            value:
              errorType: invalid_request
              errorMessage: >-
                string doesn't match the regular expression
                "^0x[0-9a-fA-F]{40}$"
        description: Invalid request.
    '404':
      application/json:
        schemaArray:
          - type: object
            properties:
              errorType:
                allOf:
                  - *ref_0
              errorMessage:
                allOf:
                  - *ref_1
              correlationId:
                allOf:
                  - *ref_2
              errorLink:
                allOf:
                  - *ref_3
            description: >-
              An error response including the code for the type of error and a
              human-readable message describing the error.
            refIdentifier: '#/components/schemas/Error'
            requiredProperties: *ref_4
            example: *ref_5
        examples:
          not_found:
            value:
              errorType: not_found
              errorMessage: >-
                Address not found, or no balances found for the given address on
                this chain.
        description: Not found.
    '500':
      application/json:
        schemaArray:
          - type: object
            properties:
              errorType:
                allOf:
                  - *ref_0
              errorMessage:
                allOf:
                  - *ref_1
              correlationId:
                allOf:
                  - *ref_2
              errorLink:
                allOf:
                  - *ref_3
            description: >-
              An error response including the code for the type of error and a
              human-readable message describing the error.
            refIdentifier: '#/components/schemas/Error'
            requiredProperties: *ref_4
            example: *ref_5
        examples:
          internal_server_error:
            value:
              errorType: internal_server_error
              errorMessage: An internal server error occurred. Please try again later.
        description: Internal server error.
    '502':
      application/json:
        schemaArray:
          - type: object
            properties:
              errorType:
                allOf:
                  - *ref_0
              errorMessage:
                allOf:
                  - *ref_1
              correlationId:
                allOf:
                  - *ref_2
              errorLink:
                allOf:
                  - *ref_3
            description: >-
              An error response including the code for the type of error and a
              human-readable message describing the error.
            refIdentifier: '#/components/schemas/Error'
            requiredProperties: *ref_4
            example: *ref_5
        examples:
          bad_gateway:
            value:
              errorType: bad_gateway
              errorMessage: Bad gateway. Please try again later.
        description: Bad gateway.
    '503':
      application/json:
        schemaArray:
          - type: object
            properties:
              errorType:
                allOf:
                  - *ref_0
              errorMessage:
                allOf:
                  - *ref_1
              correlationId:
                allOf:
                  - *ref_2
              errorLink:
                allOf:
                  - *ref_3
            description: >-
              An error response including the code for the type of error and a
              human-readable message describing the error.
            refIdentifier: '#/components/schemas/Error'
            requiredProperties: *ref_4
            example: *ref_5
        examples:
          service_unavailable:
            value:
              errorType: service_unavailable
              errorMessage: Service unavailable. Please try again later.
        description: Service unavailable.
  deprecated: false
  type: path
components:
  schemas:
    ErrorType:
      description: >-
        The code that indicates the type of error that occurred. These error
        codes can be used to determine how to handle the error.
      type: string
      example: invalid_request
      enum:
        - already_exists
        - bad_gateway
        - faucet_limit_exceeded
        - forbidden
        - idempotency_error
        - internal_server_error
        - invalid_request
        - invalid_sql_query
        - invalid_signature
        - malformed_transaction
        - not_found
        - payment_method_required
        - rate_limit_exceeded
        - request_canceled
        - service_unavailable
        - timed_out
        - unauthorized
        - policy_violation
        - policy_in_use
        - account_limit_exceeded
        - network_not_tradable
        - guest_permission_denied
        - guest_region_forbidden
        - guest_transaction_limit
        - guest_transaction_count
        - phone_number_verification_expired
        - document_verification_failed
        - recipient_allowlist_violation
        - recipient_allowlist_pending
        - travel_rules_recipient_violation
      x-error-instructions:
        already_exists: >-
          This error occurs when trying to create a resource that already
          exists.


          **Steps to resolve:**

          1. Check if the resource exists before creation

          2. Use GET endpoints to verify resource state

          3. Use unique identifiers/names for resources
        bad_gateway: >-
          This error occurs when the CDP API is unable to connect to the backend
          service.


          **Steps to resolve:**

          1. Retry your request after a short delay

          2. If persistent, contact CDP support with:
             - The timestamp of the error
             - Request details
          3. Consider implementing retry logic with an exponential backoff


          **Note:** These errors are automatically logged and monitored by CDP.
        faucet_limit_exceeded: >-
          This error occurs when you've exceeded the faucet request limits.


          **Steps to resolve:**

          1. Wait for the time window to reset

          2. Use funds more efficiently in your testing


          For more information on faucet limits, please visit the [EVM Faucet
          endpoint](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/faucets/request-funds-on-evm-test-networks)
          or the [Solana Faucet
          endpoint](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/faucets/request-funds-on-solana-devnet).
        forbidden: >-
          This error occurs when you don't have permission to access the
          resource.


          **Steps to resolve:**

          1. Verify your permissions to access the resource

          2. Ensure that you are the owner of the requested resource
        idempotency_error: >-
          This error occurs when an idempotency key is reused with different
          parameters.


          **Steps to resolve:**

          1. Generate a new UUID v4 for each unique request

          2. Only reuse idempotency keys for exact request duplicates

          3. Track used keys within your application


          **Example idempotency key implementation:**

          ```typescript lines wrap

          import { v4 as uuidv4 } from 'uuid';


          function createIdempotencyKey() {
            return uuidv4();
          }

          ```
        internal_server_error: >-
          This indicates an unexpected error that occurred on the CDP servers.


          **Important**: If you encounter this error, please note that your
          operation's status should be treated as unknown by your application,
          as it could have been a success within the CDP back-end.


          **Steps to resolve:**

          1. Retry your request after a short delay

          2. If persistent, contact CDP support with:
             - Your correlation ID
             - Timestamp of the error
             - Request details
          3. Consider implementing retry logic with an exponential backoff


          **Note:** These errors are automatically logged and monitored by CDP.
        invalid_request: >-
          This error occurs when the request is malformed or contains invalid
          data, including issues with the request body, query parameters, path
          parameters, or headers.


          **Steps to resolve:**

          1. Check all required fields and parameters are present

          2. Ensure request body (if applicable) follows the correct schema

          3. Verify all parameter formats match the API specification:
             - Query parameters
             - Path parameters
             - Request headers
          4. Validate any addresses, IDs, or other formatted strings meet
          requirements


          **Common validation issues:**

          - Missing required parameters

          - Invalid parameter types or formats

          - Malformed JSON in request body

          - Invalid enum values
        invalid_sql_query: |-
          This error occurs when the SQL query is invalid or not allowed.

          **Common causes:**
          - Using non-SELECT SQL statements (INSERT, UPDATE, DELETE, etc.)
          - Invalid table or column names
          - Syntax errors in SQL query
          - Query exceeds character limit
          - Too many JOIN operations
        invalid_signature: >-
          This error occurs when the signature provided for the given user
          operation is invalid.


          **Steps to resolve:**

          1. Verify the signature was generated by the correct owner account

          2. Ensure the signature corresponds to the exact user operation hash

          3. Check that the signature format matches the expected format

          4. Confirm you're using the correct network for the Smart Account


          **Common causes:**

          - Using wrong owner account to sign

          - Signing modified/incorrect user operation data

          - Malformed signature encoding

          - Network mismatch between signature and broadcast
        malformed_transaction: >-
          This error occurs when the transaction data provided is not properly
          formatted or is invalid.


          **Steps to resolve:**

          1. Verify transaction encoding:
             - **EVM networks**: Check RLP encoding is correct
             - **Solana**: Validate base64 encoding
          2. Ensure all required transaction fields are present

          3. Validate transaction parameters are within acceptable ranges

          4. Check that the transaction type is supported on the target network
          (see our [Supported
          Networks](https://docs.cdp.coinbase.com/get-started/supported-networks)
          page for more details)


          **Common causes:**

          - Invalid hex encoding for EVM transactions

          - Missing required transaction fields

          - Incorrect parameter formats

          - Unsupported transaction types

          - Network-specific transaction format mismatches
        not_found: >-
          This error occurs when the resource specified in your request doesn't
          exist or you don't have access to it.


          **Steps to resolve:**

          1. Verify the resource ID/address/account exists

          2. Check your permissions to access the resource

          3. Ensure you're using the correct network/environment

          4. Confirm the resource hasn't been deleted


          **Common causes:**

          - Mistyped addresses

          - Accessing resources from the wrong CDP project

          - Resource was deleted or hasn't been created yet
        payment_method_required: >-
          This error occurs when a payment method is required to complete the
          requested operation but none is configured or available.


          **Steps to resolve:**

          1. Add a valid payment method to your account using the [CDP
          Portal](https://portal.cdp.coinbase.com)

          2. Ensure your payment method is valid and not expired


          **Common causes:**

          - No payment method configured on the account

          - Payment method is expired
        rate_limit_exceeded: |-
          This error occurs when you've exceeded the API rate limits.

          **Steps to resolve:**
          1. Implement exponential backoff
          2. Cache responses where possible
          3. Wait for rate limit window to reset

          **Best practices:**
          ```typescript lines wrap
          async function withRetry(fn: () => Promise<any>) {
            let delay = 1000;
            while (true) {
              try {
                return await fn();
              } catch (e) {
                if (e.errorType === "rate_limit_exceeded") {
                  await sleep(delay);
                  delay *= 2;
                  continue;
                }
                throw e;
              }
            }
          }
          ```
        request_canceled: >-
          This error occurs when the client cancels an in-progress request
          before it completes.


          **Steps to resolve:**

          1. Check client-side timeout configurations

          2. Review request cancellation logic in your code

          3. Consider increasing timeout thresholds for long-running operations

          4. Implement request tracking to identify premature cancellations


          **Best practices:**

          ```typescript lines wrap

          async function withTimeout<T>(promise: Promise<T>, timeoutMs: number):
          Promise<T> {
            const timeout = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error("Operation timed out"));
              }, timeoutMs);
            });

            try {
              return await Promise.race([promise, timeout]);
            } catch (error) {
              // Handle timeout or cancellation
              throw error;
            }
          }

          ```
        service_unavailable: >-
          This error occurs when the CDP API is temporarily unable to handle
          requests due to maintenance or high load.


          **Steps to resolve:**

          1. Retry your request after a short delay

          2. If persistent, contact CDP support with:
             - The timestamp of the error
             - Request details
          3. Consider implementing retry logic with an exponential backoff


          **Note:** These errors are automatically logged and monitored by CDP.
        timed_out: >-
          This error occurs when a request exceeds the maximum allowed
          processing time.


          **Steps to resolve:**

          1. Break down large requests into smaller chunks (if applicable)

          2. Implement retry logic with exponential backoff

          3. Use streaming endpoints for large data sets


          **Example retry implementation:**

          ```typescript lines wrap

          async function withRetryAndTimeout<T>(
            operation: () => Promise<T>,
            maxRetries = 3,
            timeout = 30000,
          ): Promise<T> {
            let attempts = 0;
            while (attempts < maxRetries) {
              try {
                return await Promise.race([
                  operation(),
                  new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), timeout)
                  ),
                ]);
              } catch (error) {
                attempts++;
                if (attempts === maxRetries) throw error;
                // Exponential backoff
                await new Promise(resolve =>
                  setTimeout(resolve, Math.pow(2, attempts) * 1000)
                );
              }
            }
            throw new Error("Max retries exceeded");
          }

          ```
        unauthorized: |-
          This error occurs when authentication fails.

          **Steps to resolve:**
          1. Verify your CDP API credentials:
             - Check that your API key is valid
             - Check that your Wallet Secret is properly configured
          2. Validate JWT token:
             - Not expired
             - Properly signed
             - Contains required claims
          3. Check request headers:
             - Authorization header present
             - X-Wallet-Auth header included when required

          **Security note:** Never share your Wallet Secret or API keys.
        policy_in_use: >-
          This error occurs when trying to delete a Policy that is currently in
          use by at least one project or account.


          **Steps to resolve:**

          1. Update project or accounts to remove references to the Policy in
          question.

          2. Retry your delete request.
        network_not_tradable: >-
          This error occurs when the selected asset cannot be purchased on the
          selected network in the user's location.


          **Steps to resolve:**

          1. Verify the asset is tradable on the selected network

          2. Check the user's location to ensure it is allowed to purchase the
          asset on the selected network


          **Common causes:**

          - Users in NY are not allowed to purchase USDC on any network other
          than Ethereum
        guest_permission_denied: >-
          This error occurs when the user is not allowed to complete onramp
          transactions as a guest.


          **Steps to resolve:**

          1. Redirect the user to create a Coinbase account to buy and send
          crypto.
        guest_region_forbidden: >-
          This error occurs when guest onramp transactions are not allowed in
          the user's region.


          **Steps to resolve:**

          1. Redirect the user to create a Coinbase account to buy and send
          crypto.
        guest_transaction_limit: >-
          This error occurs when the user has reached the weekly guest onramp
          transaction limit.


          **Steps to resolve:**

          1. Inform the user they have reached their weekly limit and will have
          to wait until next week.
        guest_transaction_count: >-
          This error occurs when the user has reached the lifetime guest onramp
          transaction count limit.


          **Steps to resolve:**

          1. Redirect the user to create a Coinbase account to buy and send
          crypto.
        phone_number_verification_expired: >-
          This error occurs when the user's phone number verification has
          expired. Use of guest Onramp requires the user's

          phone number to be verified every 60 days.


          **Steps to resolve:**

          1. Re-verify the user's phone number via OTP.

          2. Retry the request with the phoneNumberVerifiedAt field set to new
          verification timestamp.
        document_verification_failed: >-
          This error occurs when the user has not verified their identity for
          their coinbase.com account.

          **Steps to resolve:**

          1. Verify your coinbase account identity with valid documents at
          https://www.coinbase.com/settings/account-levels.
        recipient_allowlist_violation: >-
          This error occurs when the user is not allowed to receive funds at
          this address, according to their coinbase account allowlist.

          **Steps to resolve:**

          1. Either disable the allowlist or add the wallet address at
          https://www.coinbase.com/settings/allowlist

          2. Wait approximately 2 days for updates to take effect.
        recipient_allowlist_pending: >-
          This error occurs when the user is not allowed to receive funds at
          this address, because changes to their coinbase account allowlist are
          pending.

          **Steps to resolve:**

          1. Wait approximately 2 days for updates to take effect.
        travel_rules_recipient_violation: >-
          This error occurs when the user is not allowed to receive funds at
          this address, because it violates travel rules.

          **Steps to resolve:**

          1. Ensure your desired transfer is not blocked by local travel
          regulations.
    ListEvmTokenBalancesNetwork:
      type: string
      enum:
        - base
        - base-sepolia
        - ethereum
      description: The name of the supported EVM networks in human-readable format.
      example: base
    TokenAmount:
      type: object
      description: Amount of a given token.
      example:
        amount: '125000000000000000000'
        decimals: 18
      properties:
        amount:
          type: string
          pattern: ^[0-9]+$
          description: >-
            The amount is denominated in the smallest indivisible unit of the
            token. For ETH, the smallest indivisible unit is Wei (10^-18 ETH).
            For ERC-20s, the smallest unit is the unit returned from `function
            totalSupply() public view returns (uint256)`.
          example: '1250000000000000000'
        decimals:
          type: integer
          format: int64
          description: >-
            'decimals' is the exponential value N that satisfies the equation
            `amount * 10^-N = standard_denomination`. The standard denomination
            is the most commonly used denomination for the token.

            - In the case of the native gas token, `decimals` is defined via
            convention. As an example, for ETH of Ethereum mainnet, the standard
            denomination is 10^-18 the smallest denomination (Wei). As such, for
            ETH on Ethereum mainnet, `decimals` is 18. - In the case of ERC-20
            tokens, `decimals` is defined via configuration. `decimals` will be
            the number returned by `function decimals() public view returns
            (uint8)` on the underlying token contract.

            Not all tokens have a `decimals` field, as this function is
            [optional in the ERC-20
            specification](https://eips.ethereum.org/EIPS/eip-20#decimals). This
            field will be left empty if the underlying token contract doesn't
            implement `decimals`.

            Further, this endpoint will only populate this value for a small
            subset of whitelisted ERC-20 tokens at this time. We intend to
            improve coverage in the future.
          example: 18
      required:
        - amount
        - decimals
    Token:
      type: object
      description: >-
        General information about a token. Includes the type, the network, and
        other identifying information.
      example:
        network: base
        symbol: ETH
        name: Ether
        contractAddress: '0x1234567890123456789012345678901234567890'
      properties:
        network:
          $ref: '#/components/schemas/ListEvmTokenBalancesNetwork'
        symbol:
          type: string
          description: >-
            The symbol of this token (ex: SOL, ETH, USDC).

            The token symbol is not unique. It is possible for two different
            tokens to have the same symbol.

            For native gas tokens, this symbol is defined via convention. As an
            example, for ETH on Ethereum mainnet, the symbol is "ETH". For
            ERC-20 tokens, this symbol is defined via configuration. `symbol`
            will be the string returned by `function symbol() public view
            returns (string)` on the underlying token contract.

            Not all tokens have a symbol, as this function is [optional in the
            ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#symbol).
            This field will only be populated when the token's underlying ERC-20
            contract has a `symbol()` function.

            Further, this endpoint will only populate this value for a small
            subset of whitelisted ERC-20 tokens at this time. We intend to
            improve coverage in the future.
          example: ETH
        name:
          type: string
          description: >-
            The name of this token (ex: "Solana", "Ether", "USD Coin").

            The token name is not unique. It is possible for two different
            tokens to have the same name.

            For native gas tokens, this name is defined via convention. As an
            example, for ETH on Ethereum mainnet, the name is "Ether". For
            ERC-20 tokens, this name is defined via configuration. `name` will
            be the string returned by `function name() public view returns
            (string)` on the underlying token contract.

            Not all tokens have a name, as this function is [optional in the
            ERC-20 specification](https://eips.ethereum.org/EIPS/eip-20#name).
            This field will only be populated when the token's underlying ERC-20
            contract has a `name()` function.

            Further, this endpoint will only populate this value for a small
            subset of whitelisted ERC-20 tokens at this time. We intend to
            improve coverage in the future.
          example: Ether
        contractAddress:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
          description: >-
            The contract address of the token.

            For Ether, the contract address is
            `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` per
            [EIP-7528](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-7528.md).
            For ERC-20 tokens, this is the contract address where the token is
            deployed.
          example: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
      required:
        - network
        - contractAddress
    TokenBalance:
      type: object
      properties:
        amount:
          $ref: '#/components/schemas/TokenAmount'
        token:
          $ref: '#/components/schemas/Token'
      required:
        - amount
        - token

````