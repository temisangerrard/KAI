# API Authentication

## Introduction

<Tip>
  **Looking for Coinbase App authentication?**

  This page covers authentication for Coinbase Developer Platform (CDP) APIs for building onchain apps. If you're looking to access consumer Coinbase App accounts, see the [Coinbase App API Authentication documentation](/coinbase-app/authentication-authorization/api-key-authentication).
</Tip>

Coinbase Developer Platform (CDP) uses three distinct types of authentication keys, each serving a specific purpose:

**Server requests**:

These keys should be stored securely, and used only by trusted back-end services:

* **[Secret API Key](#secret-api-key):** For all server-to-server communication (i.e., REST APIs).
* **[Wallet Secret](#wallet-secret):** Additional requirement for any server-to-server communication that involves sensitive wallet operations (i.e., signing transactions via REST APIs).

**Client requests**:

These keys are designed for client-side communication, and are safe to include in end-user code:

* **[Client API Key](#client-api-key):** For all client-side communication (i.e., JSON-RPC APIs).

## Client API Key

The Client API Key is designed specifically for client-side applications. This key:

* Is present within your [RPC endpoint URL](https://portal.cdp.coinbase.com/products/node) (i.e., `https://api.developer.coinbase.com/rpc/v1/base/<MY-CLIENT-API-KEY>`)
* Authenticates JSON-RPC requests from browser-based applications and mobile apps
* Is safe to include in client-side code
* Has limited functionality by design
* Can be easily rotated if needed

### 1. Create Client API Key

To create a Client API Key:

1. Navigate to your [API Keys dashboard](https://portal.cdp.coinbase.com/projects/api-keys).
2. Select your desired project from the top drop-down.
3. Select the **Client API Key** tab.
4. Copy the generated key.
5. Export as an environment variable:

```bash lines wrap 
export CLIENT_API_KEY="your_client_api_key"
```

<Tip>
  Click the **Rotate** button to expire this key and generate a new one.
</Tip>

### 2. Authenticate

To authenticate your client-side code, include it with your JSON-RPC request:

```bash lines wrap
curl -L -X "$HTTP_METHOD" https://api.developer.coinbase.com/rpc/v1/base/${CLIENT_API_KEY} \
  -H "Content-Type: application/json" \
  -d '${REQUEST_BODY_JSON}'
```

As an example, you can request the [List Historical Balances](api-reference/json-rpc-api/wallet-history#cdp-listbalancehistories) JSON-RPC endpoint like so:

```bash lines wrap
curl -L -X POST https://api.developer.coinbase.com/rpc/v1/base/${CLIENT_API_KEY} \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "cdp_listBalances", "params": [{"address":"0xF7DCa789B08Ed2F7995D9bC22c500A8CA715D0A8","pageToken":"","pageSize":1}]}'
```

## Secret API Key

The Secret API Key is required for **all server-to-server communication** with CDP APIs. This key:

* Is used to generate a [Bearer Token](#generate-bearer-token) (JWT), which authenticates your CDP project ownership
* Is used in the `Authorization` header of your request
* Is required as the base layer of authentication for all server endpoints
* Must be kept secure and never exposed in client-side code
* Can be configured with IP allowlists and more granular permissions

### 1. Create Secret API Key

To create a Secret API Key:

1. Navigate to your [API Keys dashboard](https://portal.cdp.coinbase.com/projects/api-keys).
2. Select your desired project from the top drop-down.
3. Select the **Secret API Keys** tab.
4. Click **Create API key** and name your key.
5. Optional: Configure additional settings
   * IP allowlist
   * Permission restrictions
   * Signature algorithm (Ed25519 recommended)
6. Click **Create & download**.

<Frame>
  <img src="https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=0f24214de7525c978b8cdb4596196e52" className="no-zoom" alt="Create API Key" width="546" height="510" data-path="api-reference/v2/images/api-keys-create.svg" srcset="https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=280&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=050bd1e98869dcf516140cb8ddedd950 280w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=560&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=ac74fa59af587f85d20c222224116b4d 560w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=840&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=f0ac8007e905af0cb45aae8832493555 840w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=1100&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=9dd99acddcc7dd083626f51ff0e8977c 1100w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=1650&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=c9f32aff56cbb4cdac70279f70e5c9ce 1650w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-create.svg?w=2500&maxW=546&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=ee5ba63cd0929090f1fafd4da3cf8e02 2500w" data-optimize="true" data-opv="2" />
</Frame>

A modal will appear with your key details.

<Frame>
  <img src="https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=3836ca2c41e393cdb889b7e266dd87c2" className="no-zoom" alt="API Key Details" width="444" height="569" data-path="api-reference/v2/images/api-keys-details.svg" srcset="https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=280&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=09e8247c179edf4022de459969978d10 280w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=560&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=2881b029a5ed71f23bd3e39cc77de536 560w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=840&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=a00f2435447c203b002905833a435166 840w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=1100&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=f688de18a148a0c1d20c43fba1d955ef 1100w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=1650&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=061b33f16ffb531511547965ff1dd297 1650w, https://mintcdn.com/coinbase-prod/api-reference/v2/images/api-keys-details.svg?w=2500&maxW=444&auto=format&n=cJ6fMgsTfGQZSO3N&q=85&s=3e92c8d5fb49b6a7fc6cb65780076799 2500w" data-optimize="true" data-opv="2" />
</Frame>

Make sure you save the API key ID and Secret in a safe place. You can't re-download it later.

<Tip>
  To regenerate a Secret API key, click **Configure** to delete and recreate the key.
</Tip>

### 2. Generate Bearer Token

Bearer Tokens (JWTs) are required for **server-to-server communication only**, are included in your `Authorization` header, and are generated using your [Secret API Key](#secret-api-key).

<Tip>
  Use our SDK for easier authentication

  The [CDP SDK](https://github.com/coinbase/cdp-sdk) automatically handles generation of Bearer Tokens for you, streamlining the process of making requests to all of our REST endpoints.
</Tip>

For REST API users, continue reading to:

* Set up your environment for Bearer Token generation by configuring environment variables and installing dependencies
* Export your generated Bearer Token as an environment variable

<Expandable title="More on JWTs">
  A JWT is a compact, self-contained, stateless token format used to securely transmit API keys as a JSON object for authentication with the CDP API. They are typically included in the `Authorization` header of your request.

  Read more in our [JWT documentation](/get-started/authentication/jwt-authentication).
</Expandable>

<Warning>
  Never include Secret API key information in your code.

  Instead, securely store it and retrieve it from an environment variable, a secure database, or other storage mechanism intended for highly-sensitive parameters.
</Warning>

#### Environment setup

To begin, export the following environment variables:

```bash lines wrap
export KEY_NAME="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export KEY_SECRET="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=="
export REQUEST_METHOD="GET"
export REQUEST_PATH="/platform/v2/evm/token-balances/base-sepolia/0x8fddcc0c5c993a1968b46787919cc34577d6dc5c"
export REQUEST_HOST="api.cdp.coinbase.com"
```

Complete the remaining setup steps for JWT generation below according to your language choice.

#### Generate Bearer Token (JWT) and export

<Tabs groupId="programming-language">
  <Tab value="javascript" title="JavaScript">
    First, install the CDP SDK:

    ```bash lines wrap
    npm install @coinbase/cdp-sdk
    ```

    Create a new file for JWT generation code:

    ```javascript main.js lines wrap [expandable]
    const { generateJwt } = require("@coinbase/cdp-sdk/auth");

    const main = async () => {
      // Generate the JWT using the CDP SDK
      const token = await generateJwt({
        apiKeyId: process.env.KEY_NAME,
        apiKeySecret: process.env.KEY_SECRET,
        requestMethod: process.env.REQUEST_METHOD,
        requestHost: process.env.REQUEST_HOST,
        requestPath: process.env.REQUEST_PATH,
        expiresIn: 120 // optional (defaults to 120 seconds)
      });
      
      console.log(token);
    };

    main();
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export JWT=$(node main.js)
    echo $JWT
    ```
  </Tab>

  <Tab value="typescript" title="TypeScript">
    First, install the CDP SDK:

    ```bash lines wrap
    npm install @coinbase/cdp-sdk
    ```

    Create a new file for JWT generation code:

    ```typescript main.ts lines wrap [expandable]
    import { generateJwt } from "@coinbase/cdp-sdk/auth";

    const main = async () => {
        // Generate the JWT using the CDP SDK
        const token = await generateJwt({
            apiKeyId: process.env.KEY_NAME!,
            apiKeySecret: process.env.KEY_SECRET!,
            requestMethod: process.env.REQUEST_METHOD!,
            requestHost: process.env.REQUEST_HOST!,
            requestPath: process.env.REQUEST_PATH!,
            expiresIn: 120 // optional (defaults to 120 seconds)
        });
        
        console.log(token);
    };

    main();
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export JWT=$(npx tsx main.ts)
    echo $JWT
    ```
  </Tab>

  <Tab value="python" title="Python">
    First, install the CDP SDK:

    ```bash lines wrap
    pip install cdp-sdk
    ```

    Create a new file for JWT generation code:

    ```python main.py lines wrap [expandable]
    import os
    from cdp.auth.utils.jwt import generate_jwt, JwtOptions

    # Generate the JWT using the CDP SDK
    jwt_token = generate_jwt(JwtOptions(
        api_key_id=os.getenv('KEY_NAME'),
        api_key_secret=os.getenv('KEY_SECRET'),
        request_method=os.getenv('REQUEST_METHOD'),
        request_host=os.getenv('REQUEST_HOST'),
        request_path=os.getenv('REQUEST_PATH'),
        expires_in=120  # optional (defaults to 120 seconds)
    ))

    print(jwt_token)
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export JWT=$(python main.py)
    echo $JWT
    ```
  </Tab>

  <Tab value="go" title="Go">
    First, install the CDP SDK:

    ```bash lines wrap
    go mod init jwt-example
    go get github.com/coinbase/cdp-sdk/go
    ```

    Create a new file for JWT generation code:

    ```go main.go lines wrap [expandable]
    package main

    import (
        "fmt"
        "log"
        "os"

        "github.com/coinbase/cdp-sdk/go/auth"
    )

    func main() {
        // Generate the JWT using the CDP SDK
        jwt, err := auth.GenerateJWT(auth.JwtOptions{
            KeyID:         os.Getenv("KEY_NAME"),
            KeySecret:     os.Getenv("KEY_SECRET"),
            RequestMethod: os.Getenv("REQUEST_METHOD"),
            RequestHost:   os.Getenv("REQUEST_HOST"),
            RequestPath:   os.Getenv("REQUEST_PATH"),
            ExpiresIn:     120, // optional (defaults to 120 seconds)
        })
        if err != nil {
            log.Fatalf("error building jwt: %v", err)
        }
        
        fmt.Println(jwt)
    }
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap 
    export JWT=$(go run main.go)
    echo $JWT
    ```
  </Tab>

  <Tab value="ruby" title="Ruby">
    First, install required dependencies:

    ```bash lines wrap
    gem install jwt
    gem install ed25519
    ```

    Create a new file for JWT generation code:

    ```ruby main.rb lines wrap [expandable]
    require 'jwt'
    require 'ed25519'
    require 'base64'
    require 'time'
    require 'securerandom'

    # Fetching environment variables
    key_name = ENV['KEY_NAME']
    key_secret = ENV['KEY_SECRET']
    request_method = ENV['REQUEST_METHOD']
    request_host = ENV['REQUEST_HOST']
    request_path = ENV['REQUEST_PATH']

    def build_jwt(key_name, key_secret, uri)
      # Decode the Ed25519 private key from base64
      decoded = Base64.decode64(key_secret)
      
      # Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
      if decoded.length != 64
        raise "Invalid Ed25519 key length"
      end
      
      # Extract the seed (first 32 bytes)
      seed = decoded[0, 32]
      signing_key = Ed25519::SigningKey.new(seed)
      
      # Header for the JWT
      header = {
        alg: 'EdDSA',
        typ: 'JWT',
        kid: key_name,
        nonce: SecureRandom.hex(16)
      }

      # Claims for the JWT
      claims = {
        sub: key_name,
        iss: 'cdp',
        aud: ['cdp_service'],
        nbf: Time.now.to_i,
        exp: Time.now.to_i + 120, # Expiration time: 2 minute from now.
        uri: uri
      }

      # Encode the JWT with EdDSA algorithm
      JWT.encode(claims, signing_key, 'EdDSA', header)
    end

    # Build the JWT with the URI
    token = build_jwt(key_name, key_secret, "#{request_method.upcase} #{request_host}#{request_path}")

    # Print the JWT token
    puts token
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export JWT=$(ruby main.rb)
    echo $JWT
    ```
  </Tab>

  <Tab value="php" title="PHP">
    First, ensure the Sodium extension is enabled (included by default in PHP 7.2+):

    ```bash lines wrap
    # Ensure the sodium extension is enabled
    php -m | grep sodium
    ```

    Create a new file for JWT generation code:

    ```php main.php lines wrap [expandable]
    <?php
    function buildJwt() {
        // Fetching values directly from environment variables
        $keyName = getenv('KEY_NAME');  
        $keySecret = getenv('KEY_SECRET');
        $requestMethod = getenv('REQUEST_METHOD'); 
        $requestHost = getenv('REQUEST_HOST');
        $requestPath = getenv('REQUEST_PATH');

        // Ensure that the environment variables are set
        if (!$keyName || !$keySecret || !$requestMethod || !$requestHost || !$requestPath) {
            throw new Exception('Required environment variables are missing');
        }

        // Decode the Ed25519 private key from base64
        $decoded = base64_decode($keySecret);
        
        // Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
        if (strlen($decoded) != 64) {
            throw new Exception('Invalid Ed25519 key length');
        }
        
        // Extract the seed (first 32 bytes) - this is the actual private key for sodium
        $privateKey = substr($decoded, 0, 32);
        
        // Constructing the URI from method, host, and path
        $uri = $requestMethod . ' ' . $requestHost . $requestPath;

        // Setting the current time and creating a unique nonce
        $time = time();
        $nonce = substr(str_replace(['+', '/', '='], '', base64_encode(random_bytes(12))), 0, 16);

        // JWT Header
        $header = [
            'alg' => 'EdDSA',
            'typ' => 'JWT',
            'kid' => $keyName,
            'nonce' => $nonce
        ];

        // JWT Payload
        $payload = [
            'sub' => $keyName,
            'iss' => 'cdp',
            'aud' => ['cdp_service'],
            'nbf' => $time,
            'exp' => $time + 120,  // Token valid for 120 seconds from now
            'uri' => $uri
        ];

        // Encode header and payload
        $encodedHeader = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
        $encodedPayload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        
        // Create the message to sign
        $message = $encodedHeader . '.' . $encodedPayload;
        
        // Sign with Ed25519 using sodium
        $signature = sodium_crypto_sign_detached($message, $privateKey);
        
        // Encode signature
        $encodedSignature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
        
        // Create the JWT
        return $message . '.' . $encodedSignature;
    }

    // Example of calling the function to generate the JWT
    try {
        $jwt = buildJwt();
        echo $jwt . "\n";
    } catch (Exception $e) {
        echo "Error generating JWT: " . $e->getMessage() . "\n";
    }
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export JWT=$(php main.php)
    echo $JWT
    ```
  </Tab>

  <Tab value="java" title="Java">
    First, install required dependencies:

    ```xml lines wrap
    <!-- Add this to your pom.xml -->
    <dependency>
        <groupId>com.nimbusds</groupId>
        <artifactId>nimbus-jose-jwt</artifactId>
        <version>9.31</version>
    </dependency>
    ```

    Create a new file for JWT generation code:

    ```java main.java lines wrap [expandable]
    import com.nimbusds.jose.*;
    import com.nimbusds.jose.crypto.*;
    import com.nimbusds.jwt.*;
    import java.util.Date;
    import java.util.UUID;
    import java.util.Base64;

    public class Main {
        public static void main(String[] args) throws Exception {
            // Load environment variables
            String keySecret = System.getenv("KEY_SECRET");
            String keyName = System.getenv("KEY_NAME");
            String requestMethod = System.getenv("REQUEST_METHOD");
            String requestHost = System.getenv("REQUEST_HOST");
            String requestPath = System.getenv("REQUEST_PATH");

            // Ensure all environment variables are provided
            if (keySecret == null || keyName == null || requestMethod == null || requestHost == null || requestPath == null) {
                throw new IllegalArgumentException("Required environment variables are missing");
            }

            // Decode the Ed25519 private key from base64
            byte[] decoded = Base64.getDecoder().decode(keySecret);
            
            // Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
            if (decoded.length != 64) {
                throw new Exception("Invalid Ed25519 key length");
            }
            
            // Extract the seed (first 32 bytes) and public key (last 32 bytes)
            byte[] seed = new byte[32];
            byte[] publicKey = new byte[32];
            System.arraycopy(decoded, 0, seed, 0, 32);
            System.arraycopy(decoded, 32, publicKey, 0, 32);
            
            // Create OctetKeyPair for Ed25519
            OctetKeyPair okp = new OctetKeyPair.Builder(Curve.Ed25519, Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey))
                .d(Base64.getUrlEncoder().withoutPadding().encodeToString(seed))
                .keyUse(KeyUse.SIGNATURE)
                .build();

            // Create URI string for current request
            String uri = requestMethod + " " + requestHost + requestPath;

            // Create JWT claims
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer("cdp")
                .subject(keyName)
                .notBeforeTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 120000)) // 120 seconds
                .claim("uri", uri)
                .build();

            // Create JWT header with nonce
            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.EdDSA)
                .keyID(keyName)
                .customParam("nonce", UUID.randomUUID().toString().replace("-", ""))
                .build();

            // Sign the JWT
            SignedJWT signedJWT = new SignedJWT(header, claims);
            JWSSigner signer = new Ed25519Signer(okp);
            signedJWT.sign(signer);

            String jwt = signedJWT.serialize();
            System.out.println(jwt);
        }
    }
    ```

    Finally, compile the script and export the JWT output as an environment variable:

    ```bash lines wrap
    javac -cp "nimbus-jose-jwt-9.31.jar:." Main.java
    export JWT=$(java -cp "nimbus-jose-jwt-9.31.jar:." Main)
    echo $JWT
    ```
  </Tab>

  <Tab value="c++" title="C++">
    First, install required dependencies:

    ```bash lines wrap
    # For Ubuntu/Debian
    sudo apt-get install libsodium-dev nlohmann-json3-dev

    # For MacOS
    brew install libsodium nlohmann-json
    ```

    Create a new file for JWT generation code:

    ```cpp main.cpp lines wrap [expandable]
    #include <iostream>
    #include <sstream>
    #include <string>
    #include <cstdlib>
    #include <cstring>
    #include <chrono>
    #include <random>
    #include <sodium.h>
    #include <nlohmann/json.hpp>

    // Base64 URL encoding helper
    std::string base64url_encode(const unsigned char* data, size_t len) {
        static const char* base64_chars = 
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        
        std::string encoded;
        encoded.reserve(((len + 2) / 3) * 4);
        
        for (size_t i = 0; i < len; i += 3) {
            unsigned int octet1 = data[i];
            unsigned int octet2 = (i + 1 < len) ? data[i + 1] : 0;
            unsigned int octet3 = (i + 2 < len) ? data[i + 2] : 0;
            
            unsigned int combined = (octet1 << 16) | (octet2 << 8) | octet3;
            
            encoded += base64_chars[(combined >> 18) & 0x3F];
            encoded += base64_chars[(combined >> 12) & 0x3F];
            if (i + 1 < len) encoded += base64_chars[(combined >> 6) & 0x3F];
            if (i + 2 < len) encoded += base64_chars[combined & 0x3F];
        }
        
        return encoded;
    }

    // Base64 decode helper
    std::vector<unsigned char> base64_decode(const std::string& encoded) {
        static const unsigned char base64_table[256] = {
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 62, 64, 64, 64, 63,
            52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 64, 64, 64, 64, 64, 64,
            64,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
            15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 64, 64, 64, 64, 64,
            64, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
            41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
            64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64
        };
        
        std::vector<unsigned char> decoded;
        decoded.reserve((encoded.length() * 3) / 4);
        
        for (size_t i = 0; i < encoded.length(); ) {
            unsigned char c1 = base64_table[static_cast<unsigned char>(encoded[i++])];
            unsigned char c2 = base64_table[static_cast<unsigned char>(encoded[i++])];
            unsigned char c3 = (i < encoded.length()) ? base64_table[static_cast<unsigned char>(encoded[i++])] : 64;
            unsigned char c4 = (i < encoded.length()) ? base64_table[static_cast<unsigned char>(encoded[i++])] : 64;
            
            if (c1 == 64 || c2 == 64) break;
            
            decoded.push_back((c1 << 2) | (c2 >> 4));
            if (c3 != 64) decoded.push_back((c2 << 4) | (c3 >> 2));
            if (c4 != 64) decoded.push_back((c3 << 6) | c4);
        }
        
        return decoded;
    }

    std::string create_jwt() {
        // Initialize libsodium
        if (sodium_init() < 0) {
            throw std::runtime_error("Failed to initialize libsodium");
        }

        // Fetching environment variables
        const char* key_name_env = std::getenv("KEY_NAME");
        const char* key_secret_env = std::getenv("KEY_SECRET");
        const char* request_method_env = std::getenv("REQUEST_METHOD");
        const char* request_host_env = std::getenv("REQUEST_HOST");
        const char* request_path_env = std::getenv("REQUEST_PATH");

        // Ensure all environment variables are present
        if (!key_name_env || !key_secret_env || !request_method_env || !request_host_env || !request_path_env) {
            throw std::runtime_error("Missing required environment variables");
        }

        std::string key_name = key_name_env;
        std::string key_secret = key_secret_env;
        std::string request_method = request_method_env;
        std::string request_host = request_host_env;
        std::string request_path = request_path_env;
        
        // Decode the Ed25519 private key from base64
        std::vector<unsigned char> decoded = base64_decode(key_secret);
        
        // Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
        if (decoded.size() != 64) {
            throw std::runtime_error("Invalid Ed25519 key length");
        }
        
        // Extract the seed (first 32 bytes)
        unsigned char private_key[32];
        std::memcpy(private_key, decoded.data(), 32);
        
        std::string uri = request_method + " " + request_host + request_path;

        // Generate a random nonce (16 digits)
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, 9);
        std::string nonce;
        for (int i = 0; i < 16; ++i) {
            nonce += std::to_string(dis(gen));
        }

        // Get current timestamp
        auto now = std::chrono::system_clock::now();
        auto now_seconds = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();

        // Create JWT header
        nlohmann::json header = {
            {"alg", "EdDSA"},
            {"typ", "JWT"},
            {"kid", key_name},
            {"nonce", nonce}
        };

        // Create JWT payload
        nlohmann::json payload = {
            {"sub", key_name},
            {"iss", "cdp"},
            {"aud", nlohmann::json::array({"cdp_service"})},
            {"nbf", now_seconds},
            {"exp", now_seconds + 120},
            {"uri", uri}
        };

        // Encode header and payload
        std::string header_json = header.dump();
        std::string payload_json = payload.dump();
        
        std::string encoded_header = base64url_encode(
            reinterpret_cast<const unsigned char*>(header_json.c_str()), 
            header_json.length()
        );
        std::string encoded_payload = base64url_encode(
            reinterpret_cast<const unsigned char*>(payload_json.c_str()), 
            payload_json.length()
        );
        
        // Create message to sign
        std::string message = encoded_header + "." + encoded_payload;
        
        // Sign with Ed25519
        unsigned char signature[crypto_sign_BYTES];
        crypto_sign_detached(signature, nullptr,
            reinterpret_cast<const unsigned char*>(message.c_str()), message.length(),
            private_key);
        
        // Encode signature
        std::string encoded_signature = base64url_encode(signature, crypto_sign_BYTES);
        
        // Return complete JWT
        return message + "." + encoded_signature;
    }

    int main() {
        try {
            std::string token = create_jwt();
            std::cout << token << std::endl;
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << std::endl;
            return 1;
        }
        return 0;
    }
    ```

    Finally, compile the script and export the JWT output as an environment variable:

    ```bash lines wrap
    g++ main.cpp -o myapp -lsodium -std=c++17
    export JWT=$(./myapp)
    echo $JWT
    ```
  </Tab>

  <Tab value="c#" title="C#">
    First, install required dependencies:

    ```bash lines wrap
    dotnet add package System.IdentityModel.Tokens.Jwt
    dotnet add package BouncyCastle.NetCore
    dotnet add package Microsoft.IdentityModel.Tokens
    dotnet add package Newtonsoft.Json
    ```

    Create a new file for JWT generation code:

    ```csharp GenerateBearerJWT.cs lines wrap [expandable]
    using System;
    using System.Collections.Generic;
    using System.Security.Cryptography;
    using System.Text;
    using Org.BouncyCastle.Crypto.Parameters;
    using Org.BouncyCastle.Crypto.Signers;
    using Newtonsoft.Json;

    namespace BearerJWT
    {
        internal class Program
        {
            static void Main(string[] args)
            {
                // Get environment variables
                string keyName = Environment.GetEnvironmentVariable("KEY_NAME");
                string keySecret = Environment.GetEnvironmentVariable("KEY_SECRET");
                string requestMethod = Environment.GetEnvironmentVariable("REQUEST_METHOD");
                string requestHost = Environment.GetEnvironmentVariable("REQUEST_HOST");
                string requestPath = Environment.GetEnvironmentVariable("REQUEST_PATH");

                // Validate environment variables
                if (string.IsNullOrEmpty(keyName) || string.IsNullOrEmpty(keySecret) || 
                    string.IsNullOrEmpty(requestMethod) || string.IsNullOrEmpty(requestHost) || 
                    string.IsNullOrEmpty(requestPath))
                {
                    throw new InvalidOperationException("Missing required environment variables");
                }

                string token = GenerateBearerJWT(keyName, keySecret, requestMethod, requestHost, requestPath);
                Console.WriteLine(token);
            }

            static string GenerateBearerJWT(string keyName, string keySecret, string requestMethod, 
                string requestHost, string requestPath)
            {
                // Decode the Ed25519 private key from base64
                byte[] decoded = Convert.FromBase64String(keySecret);
                
                // Ed25519 keys are 64 bytes (32 bytes seed + 32 bytes public key)
                if (decoded.Length != 64)
                {
                    throw new Exception("Invalid Ed25519 key length");
                }
                
                // Extract the seed (first 32 bytes)
                byte[] seed = new byte[32];
                Array.Copy(decoded, 0, seed, 0, 32);
                
                // Create Ed25519 private key parameters
                var privateKey = new Ed25519PrivateKeyParameters(seed, 0);
                
                // Create the URI
                string uri = $"{requestMethod} {requestHost}{requestPath}";

                // Create header
                var header = new Dictionary<string, object>
                {
                    { "alg", "EdDSA" },
                    { "typ", "JWT" },
                    { "kid", keyName },
                    { "nonce", GenerateNonce() }
                };

                // Create payload with timing
                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var payload = new Dictionary<string, object>
                {
                    { "sub", keyName },
                    { "iss", "cdp" },
                    { "aud", new[] { "cdp_service" } },
                    { "nbf", now },
                    { "exp", now + 120 }, // 2 minutes expiration
                    { "uri", uri }
                };

                // Encode header and payload
                string headerJson = JsonConvert.SerializeObject(header);
                string payloadJson = JsonConvert.SerializeObject(payload);
                
                string encodedHeader = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
                string encodedPayload = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
                
                string message = $"{encodedHeader}.{encodedPayload}";
                
                // Sign with Ed25519
                var signer = new Ed25519Signer();
                signer.Init(true, privateKey);
                byte[] messageBytes = Encoding.UTF8.GetBytes(message);
                signer.BlockUpdate(messageBytes, 0, messageBytes.Length);
                byte[] signature = signer.GenerateSignature();
                
                string encodedSignature = Base64UrlEncode(signature);
                
                return $"{message}.{encodedSignature}";
            }

            // Method to generate a dynamic nonce
            static string GenerateNonce()
            {
                var random = new Random();
                var nonce = new char[16];
                for (int i = 0; i < 16; i++)
                {
                    nonce[i] = (char)('0' + random.Next(10));
                }
                return new string(nonce);
            }

            // Base64 URL encoding without padding
            static string Base64UrlEncode(byte[] input)
            {
                return Convert.ToBase64String(input)
                    .Replace("+", "-")
                    .Replace("/", "_")
                    .Replace("=", "");
            }
        }
    }
    ```

    Finally, build and run the project to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    dotnet build
    export JWT=$(dotnet run)
    echo $JWT
    ```
  </Tab>
</Tabs>

<Info>
  Bearer Tokens are valid for **2 minutes** by default. After 2 minutes, you will need to generate a new Bearer Token (JWT) to ensure uninterrupted access to the CDP APIs.
  If you are experiencing issues, please make sure your machine's clock is accurate.
</Info>

### 3. Authenticate

<Tip>
  Use our SDK for easier authentication

  The [CDP SDK](https://github.com/coinbase/cdp-sdk) automatically handles authentication for you, streamlining the process of making requests to all of our REST endpoints.
</Tip>

To authenticate your server-side code, use the JWT token you generated in the previous step as a [Bearer Token](https://swagger.io/docs/specification/v3_0/authentication/bearer-authentication/) within your request:

```bash lines wrap
export API_ENDPOINT="https://$REQUEST_HOST$REQUEST_PATH"

# Now, use that endpoint in your curl command
curl -L -X "$HTTP_METHOD" "$API_ENDPOINT" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

As an example, [Get Asset by ID](/api-reference/rest-api/assets/get-assets-by-id) could be requested like so:

```bash lines wrap
curl -L -X POST "https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets/BTC" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

## Wallet Secret

The Wallet Secret is an additional layer of security that's required for any server-to-server requests that involve **sensitive wallet write operations** to the EVM and Solana APIs. This key:

* Is used to generate a [Wallet Token](#generate-wallet-token) (JWT), which authenticates your wallet ownership
* Is used in the `X-Wallet-Auth` header of your request
* Is required for sensitive wallet operations (i.e., `POST` and `DELETE` requests), such as signing a transaction
* Should be treated like the password to your onchain wallet
* Is generated by CDP's Trusted Execution Environment (TEE)
* Is never visible to Coinbase

### 1. Create Wallet Secret

To create a Wallet Secret:

1. Navigate to your [Server Wallet dashboard](https://portal.cdp.coinbase.com/products/server-wallets).
2. Ensure your desired project is selected from the top drop-down.
3. In the Wallet Secret section, click the **Generate** button.
4. Save the secret in a secure location - you won't be able to view it again.

<Warning>
  Your Wallet Secret is a **secret** that, when combined with your Secret API Key, can be used to sign transactions and messages. It is generated by CDP's Trusted Execution Environment (TEE), and is never visible to Coinbase. Secure it as you would a password, and never share it or expose it in client-side code.
</Warning>

### 2. Generate Wallet Token

Wallet Tokens (Wallet Authentication JWTs) are required for **any server-to-server communication that requires a `X-Wallet-Auth` header**, and are generated using your [Wallet Secret](#wallet-secret).

<Tip>
  Use our SDK for easier authentication
  The [CDP SDK](https://github.com/coinbase/cdp-sdk) automatically handles generation of Wallet Authentication JWTs for you, streamlining the process of making requests to all of our REST endpoints.
</Tip>

For REST API users, continue reading to:

* Set up your environment for Wallet Authentication JWT generation by configuring environment variables and installing dependencies
* Export your generated Wallet Authentication JWT as an environment variable

<Accordion title="More on Wallet Authentication JWTs">
  The Wallet Authentication JWT provides an additional layer of security for sensitive wallet operations. It is verified by [CDP's Trusted Execution Environment (TEE)](/server-wallets/v2/introduction/security) to ensure that:

  * The request body matches exactly what was signed
  * The endpoint URI matches exactly what was signed
  * The JWT was signed with the correct Wallet Secret
</Accordion>

#### Environment setup

To begin, export the following environment variables:

```bash lines wrap
# Your Wallet Secret from the CDP Portal
export WALLET_SECRET="your-wallet-secret"

# The endpoint you're calling
export REQUEST_METHOD="POST"
export REQUEST_PATH="/platform/v2/evm/accounts/0x742d35Cc6634C0532925a3b844Bc454e4438f44e/sign/transaction"
export REQUEST_HOST="api.cdp.coinbase.com"

# The exact request body you'll send
export REQUEST_BODY='{"transaction": "0x1234567890123456789012345678901234567890"}'
```

Complete the remaining setup steps for JWT generation below according to your language choice.

#### Generate Wallet Token (JWT) and export

<Tabs groupId="programming-language">
  <Tab value="javascript" title="JavaScript">
    First, install required dependencies:

    ```bash lines wrap
    npm install jose crypto
    ```

    Create a new file to generate your Wallet Token:

    ```javascript generate_wallet_jwt.js lines wrap [expandable]
    const jose = require('jose');
    const crypto = require('crypto');

    // Get environment variables
    const walletSecret = process.env.WALLET_SECRET;
    const requestMethod = process.env.REQUEST_METHOD;
    const requestHost = process.env.REQUEST_HOST;
    const requestPath = process.env.REQUEST_PATH;
    const requestBody = process.env.REQUEST_BODY;

    // Create the JWT payload
    const now = Math.floor(Date.now() / 1000);
    const uri = `${requestMethod} ${requestHost}${requestPath}`;

    const payload = {
      iat: now,
      nbf: now,
      jti: crypto.randomBytes(16).toString('hex'),
      uris: [uri]
    };

    function sortKeys(obj) {
      if (!obj || typeof obj !== "object") {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }

      return Object.keys(obj)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = sortKeys(obj[key]);
            return acc;
          },
          {},
        );
    }

    // Add request body if present
    if (requestBody) {
      const sortedBody = sortKeys(JSON.parse(requestBody));
      payload.reqHash = crypto
        .createHash('sha256')
        .update(Buffer.from(JSON.stringify(sortedBody)))
        .digest('hex');
    }

    // Generate the JWT
    (async () => {
      const ecKey = crypto.createPrivateKey({
        key: walletSecret,
        format: "der",
        type: "pkcs8",
        encoding: "base64",
      });

      // Sign JWT
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
        .sign(ecKey);

      console.log(jwt);
    })();
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    # Generate and export the JWT
    export WALLET_AUTH_JWT=$(node generate_wallet_jwt.js)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="typescript" title="TypeScript">
    First, install required dependencies:

    ```bash lines wrap
    npm install jose crypto typescript @types/node
    ```

    Configure your TypeScript compiler options

    ```typescript tsconfig.json
    {
      "compilerOptions": {
        "target": "ES2020",           // or ES2015 or higher
        "module": "CommonJS",         // or "ESNext" for ESM
        "moduleResolution": "node",
        "lib": ["ES2020"],            // include at least ES2020
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true
      }
    }
    ```

    Create a new file to generate your Wallet Token:

    ```typescript generate_wallet_jwt.ts lines wrap [expandable]
    import * as jose from 'jose';
    import * as crypto from "crypto";

    // Get environment variables
    const walletSecret = process.env.WALLET_SECRET!;
    const requestMethod = process.env.REQUEST_METHOD!;
    const requestHost = process.env.REQUEST_HOST!;
    const requestPath = process.env.REQUEST_PATH!;
    const requestBody = process.env.REQUEST_BODY;

    // Create the JWT payload
    const now = Math.floor(Date.now() / 1000);
    const uri = `${requestMethod} ${requestHost}${requestPath}`;

    const payload: jose.JWTPayload = {
      iat: now,
      nbf: now,
      jti: crypto.randomBytes(16).toString('hex'),
      uris: [uri]
    };

    function sortKeys(obj: any): any {
      if (!obj || typeof obj !== "object") {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }

      return Object.keys(obj)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = sortKeys(obj[key]);
            return acc;
          },
          {} as Record<string, any>,
        );
    }

    // Add request body if present
    if (requestBody) {
      const sortedBody = sortKeys(JSON.parse(requestBody));
      payload.reqHash = crypto
        .createHash('sha256')
        .update(Buffer.from(JSON.stringify(sortedBody)))
        .digest('hex');
    }

    // Generate the JWT
    (async () => {
      const ecKey = crypto.createPrivateKey({
        key: walletSecret,
        format: "der",
        type: "pkcs8",
        encoding: "base64",
      });

      // Sign JWT
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
        .sign(ecKey);

      console.log(jwt);
    })();
    ```

    Finally, compile and run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    tsc generate_wallet_jwt.ts
    export WALLET_AUTH_JWT=$(npx ts-node generate_wallet_jwt.t)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="python" title="Python">
    First, install required dependencies:

    ```bash lines wrap
    pip install PyJWT==2.8.0
    pip install cryptography==42.0.5
    ```

    Create a new file to generate your Wallet Token:

    ```python generate_wallet_jwt.py lines wrap [expandable]
    import jwt
    import time
    import uuid
    import os
    import json
    import hashlib
    import base64
    from cryptography.hazmat.primitives import serialization

    # Get environment variables
    wallet_secret = os.getenv('WALLET_SECRET')
    request_method = os.getenv('REQUEST_METHOD')
    request_host = os.getenv('REQUEST_HOST')
    request_path = os.getenv('REQUEST_PATH')
    request_body = json.loads(os.getenv('REQUEST_BODY'))

    # Create the JWT payload
    now = int(time.time())
    uri = f"{request_method} {request_host}{request_path}"

    payload = {
        'iat': now,
        'nbf': now,
        'jti': str(uuid.uuid4()),
        'uris': [uri]
    }

    def sort_keys(obj: dict) -> dict:
        if not obj or not isinstance(obj, dict | list):
            return obj

        if isinstance(obj, list):
            return [sort_keys(item) for item in obj]

        return {key: sort_keys(obj[key]) for key in sorted(obj.keys())}

    # Add request body if present
    if request_body:
        sorted_body = sort_keys(request_body)
        json_bytes = json.dumps(sorted_body, separators=(",", ":"), sort_keys=True).encode("utf-8")
        payload['reqHash'] = hashlib.sha256(json_bytes).hexdigest()

    der_bytes = serialization.load_der_private_key(
        base64.b64decode(wallet_secret), password=None
    )

    token = jwt.encode(
        payload,
        der_bytes,
        algorithm="ES256",
        headers={"typ": "JWT"},
    )

    print(token)
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    # Generate and export the JWT
    export WALLET_AUTH_JWT=$(python generate_wallet_jwt.py)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="go" title="Go">
    First, install required dependencies:

    ```bash lines wrap
    go mod init wallet-jwt-example
    go get github.com/golang-jwt/jwt/v5
    go get github.com/sirupsen/logrus
    ```

    Create a new file to generate your Wallet Token:

    ```go generate_wallet_jwt.go lines wrap [expandable]
    package main

    import (
        "crypto/rand"
        "crypto/sha256"
        "crypto/x509"
        "encoding/base64"
        "encoding/json"
        "fmt"
        "os"
        "sort"
        "time"

        "github.com/golang-jwt/jwt/v5"
        log "github.com/sirupsen/logrus"
    )

    func sortKeys(v interface{}) interface{} {
        switch val := v.(type) {
        case map[string]interface{}:
            sorted := make(map[string]interface{}, len(val))
            keys := make([]string, 0, len(val))
            for k := range val {
                keys = append(keys, k)
            }
            sort.Strings(keys)
            for _, k := range keys {
                sorted[k] = sortKeys(val[k])
            }
            return sorted
        case []interface{}:
            for i, elem := range val {
                val[i] = sortKeys(elem)
            }
            return val
        default:
            return val
        }
    }

    func generateWalletJWT() (string, error) {
        // Get wallet secret from environment variable
        walletSecret := os.Getenv("WALLET_SECRET")
        if walletSecret == "" {
            return "", fmt.Errorf("WALLET_SECRET environment variable is required")
        }

        derBytes, err := base64.StdEncoding.DecodeString(walletSecret)
        if err != nil {
            return "", fmt.Errorf("failed to base64-decode WALLET_SECRET: %w", err)
        }

        privateKey, err := x509.ParsePKCS8PrivateKey(derBytes)
        if err != nil {
            return "", fmt.Errorf("failed to parse EC private key: %w", err)
        }

        // Get request details from environment variables
        requestMethod := os.Getenv("REQUEST_METHOD")
        requestHost := os.Getenv("REQUEST_HOST")
        requestPath := os.Getenv("REQUEST_PATH")
        requestBody := os.Getenv("REQUEST_BODY")

        uri := fmt.Sprintf("%s %s%s", requestMethod, requestHost, requestPath)

        jti := make([]byte, 16)
        if _, err := rand.Read(jti); err != nil {
            return "", fmt.Errorf("failed to generate JTI: %w", err)
        }

        now := time.Now().Unix()
    	claims := jwt.MapClaims{
            "iat":  now,
            "nbf":  now,
            "jti":  fmt.Sprintf("%x", jti),
            "uris": []string{uri},
        }

        // Add request body if present
        if requestBody != "" {
            var body interface{}
            if err := json.Unmarshal([]byte(requestBody), &body); err != nil {
                return "", fmt.Errorf("failed to parse request body: %w", err)
            }

            sorted := sortKeys(body)

            canonicalJSON, err := json.Marshal(sorted)
            if err != nil {
                return "", fmt.Errorf("failed to marshal sorted request body: %w", err)
            }

            hash := sha256.Sum256(canonicalJSON)
            claims["reqHash"] = fmt.Sprintf("%x", hash[:])
        }

        // Create token with claims
        token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
        token.Header["typ"] = "JWT"
        token.Header["alg"] = "ES256"

        // Sign and serialize the JWT
        jwtString, err := token.SignedString(privateKey)
        if err != nil {
            return "", fmt.Errorf("failed to sign JWT: %w", err)
        }

        return jwtString, nil
    }

    func main() {
        token, err := generateWalletJWT()
        if err != nil {
            log.Errorf("error generating wallet JWT: %v", err)
            os.Exit(1)
        }
        fmt.Println(token)
    }
    ```

    Run the following to clean up your dependencies:

    ```bash lines wrap
    go mod tidy
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    export WALLET_AUTH_JWT=$(go run generate_wallet_jwt.go)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="ruby" title="Ruby">
    First, install required dependencies:

    ```bash lines wrap
    gem install jwt
    gem install openssl
    ```

    Create a new file to generate your Wallet Token:

    ```ruby generate_wallet_jwt.rb lines wrap [expandable]
    require 'digest'
    require 'jwt'
    require 'json'
    require 'securerandom'

    # Get environment variables
    wallet_secret = ENV['WALLET_SECRET']
    request_method = ENV['REQUEST_METHOD']
    request_host = ENV['REQUEST_HOST']
    request_path = ENV['REQUEST_PATH']
    request_body = ENV['REQUEST_BODY']

    # Create the JWT payload
    now = Time.now.to_i
    uri = "#{request_method} #{request_host}#{request_path}"

    payload = {
      iat: now,
      nbf: now,
      jti: SecureRandom.uuid,
      uris: [uri]
    }

    def sort_keys(obj)
      case obj
      when Hash
        sorted = obj.keys.sort.each_with_object({}) do |key, result|
          result[key] = sort_keys(obj[key])
        end
        sorted
      when Array
        obj.map { |e| sort_keys(e) }
      else
        obj
      end
    end

    # Add request body if present
    if request_body
      parsed_body = JSON.parse(request_body)
      sorted_body = sort_keys(parsed_body)

      canonical_json = JSON.generate(sorted_body)
      req_hash = Digest::SHA256.hexdigest(canonical_json)

      payload[:reqHash] = req_hash
    end

    # Generate the JWT
    token = JWT.encode(payload, wallet_secret, 'ES256', { typ: 'JWT' })

    puts token
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash
    ruby generate_wallet_jwt.rb
    export WALLET_AUTH_JWT=$(ruby generate_wallet_jwt.rb)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="php" title="PHP">
    First, install required dependencies:

    ```bash lines wrap
    composer require firebase/php-jwt
    ```

    Create a new file to generate your Wallet Token:

    ```php generate_wallet_jwt.php lines wrap [expandable]
    <?php
    require 'vendor/autoload.php';
    use Firebase\JWT\JWT;

    function sortKeys($data) {
        if (is_array($data)) {
            if (array_keys($data) !== range(0, count($data) - 1)) {
                ksort($data);
            }
            foreach ($data as $key => $value) {
                $data[$key] = sortKeys($value);
            }
        }
        return $data;
    }

    function generateWalletJWT() {
        // Get environment variables
        $walletSecret = getenv('WALLET_SECRET');
        $requestMethod = getenv('REQUEST_METHOD');
        $requestHost = getenv('REQUEST_HOST');
        $requestPath = getenv('REQUEST_PATH');
        $requestBody = getenv('REQUEST_BODY');

        // Ensure required environment variables are set
        if (!$walletSecret || !$requestMethod || !$requestHost || !$requestPath) {
            throw new Exception('Required environment variables are missing');
        }

        // Create the URI
        $uri = $requestMethod . ' ' . $requestHost . $requestPath;

        // Create the JWT payload
        $now = time();
        $payload = [
            'iat' => $now,
            'nbf' => $now,
            'jti' => bin2hex(random_bytes(16)),
            'uris' => [$uri]
        ];

        // Add request body if present
        if ($requestBody) {
            $parsedBody = json_decode($requestBody, true);
            $sortedBody = sortKeys($parsedBody);
            $canonicalJson = json_encode($sortedBody, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $reqHash = hash('sha256', $canonicalJson);
            $payload['reqHash'] = $reqHash;
        }

        // Generate the JWT
        return JWT::encode($payload, $walletSecret, 'ES256', null, ['typ' => 'JWT']);
    }

    try {
        $token = generateWalletJWT();
        echo $token;
    } catch (Exception $e) {
        echo "Error generating JWT: " . $e->getMessage();
    }
    ```

    Finally, run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    php generate_wallet_jwt.php
    export WALLET_AUTH_JWT=$(php generate_wallet_jwt.php)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="java" title="Java">
    First, install required dependencies:

    ```xml lines wrap
    <!-- Add these to your pom.xml -->
    <dependencies>
        <dependency>
            <groupId>com.nimbusds</groupId>
            <artifactId>nimbus-jose-jwt</artifactId>
            <version>9.31</version>
        </dependency>
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk15on</artifactId>
            <version>1.70</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.17.0</version>
        </dependency>
    </dependencies>
    ```

    Create a new file to generate your Wallet Token:

    ```java GenerateWalletJWT.java lines wrap [expandable]
    import com.nimbusds.jose.*;
    import com.nimbusds.jose.crypto.*;
    import com.nimbusds.jwt.*;
    import java.security.SecureRandom;
    import java.security.MessageDigest;
    import java.util.*;
    import java.time.Instant;
    import org.bouncycastle.jce.provider.BouncyCastleProvider;
    import java.security.Security;
    import com.fasterxml.jackson.databind.ObjectMapper;
    import com.fasterxml.jackson.databind.SerializationFeature;
    import com.fasterxml.jackson.databind.node.ObjectNode;
    import com.fasterxml.jackson.databind.JsonNode;
    import java.nio.charset.StandardCharsets;

    public class GenerateWalletJWT {
        public static void main(String[] args) throws Exception {
            // Register BouncyCastle as a security provider
            Security.addProvider(new BouncyCastleProvider());

            // Get environment variables
            String walletSecret = System.getenv("WALLET_SECRET");
            String requestMethod = System.getenv("REQUEST_METHOD");
            String requestHost = System.getenv("REQUEST_HOST");
            String requestPath = System.getenv("REQUEST_PATH");
            String requestBody = System.getenv("REQUEST_BODY");

            // Ensure all environment variables are provided
            if (walletSecret == null || requestMethod == null || requestHost == null || requestPath == null) {
                throw new IllegalArgumentException("Required environment variables are missing");
            }

            // Create header
            JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.ES256)
                .type(JOSEObjectType.JWT)
                .build();

            // Create URI
            String uri = requestMethod + " " + requestHost + requestPath;

            // Create claims
            JWTClaimsSet.Builder claimsBuilder = new JWTClaimsSet.Builder()
                .issueTime(Date.from(Instant.now()))
                .notBeforeTime(Date.from(Instant.now()))
                .jwtID(generateJTI());

            // Add URIs
            claimsBuilder.claim("uris", Collections.singletonList(uri));

            ObjectMapper mapper = new ObjectMapper();
            mapper.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);

            // Add request body if present
            if (requestBody != null && !requestBody.isEmpty()) {
                JsonNode parsedBody = mapper.readTree(requestBody);
                JsonNode sortedBody = sortJson(parsedBody);

                // Serialize to canonical JSON
                String canonicalJson = mapper.writeValueAsString(sortedBody);

                // Compute SHA-256 hash
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashBytes = digest.digest(canonicalJson.getBytes(StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                for (byte b : hashBytes) {
                    sb.append(String.format("%02x", b));
                }
                String reqHash = sb.toString();

                claimsBuilder.claim("reqHash", reqHash);
            }

            JWTClaimsSet claims = claimsBuilder.build();

            // Create JWT
            SignedJWT signedJWT = new SignedJWT(header, claims);

            // Create signer
            JWSSigner signer = new MACSigner(walletSecret.getBytes());

            // Sign the JWT
            signedJWT.sign(signer);

            // Serialize the JWT
            String jwtString = signedJWT.serialize();
            System.out.println(jwtString);
        }

        private static JsonNode sortJson(JsonNode node) {
            if (node.isObject()) {
                TreeMap<String, JsonNode> sorted = new TreeMap<>();
                node.fields().forEachRemaining(entry ->
                    sorted.put(entry.getKey(), sortJson(entry.getValue()))
                );
                ObjectNode sortedNode = new ObjectMapper().createObjectNode();
                sorted.forEach(sortedNode::set);
                return sortedNode;
            } else if (node.isArray()) {
                for (int i = 0; i < node.size(); i++) {
                    ((ObjectNode) node).set(String.valueOf(i), sortJson(node.get(i)));
                }
            }
            return node;
        }

        private static String generateJTI() {
            SecureRandom random = new SecureRandom();
            byte[] bytes = new byte[16];
            random.nextBytes(bytes);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        }
    }
    ```

    Finally, compile and run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    mvn compile
    export WALLET_AUTH_JWT=$(mvn exec:java -Dexec.mainClass=GenerateWalletJWT)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="c++" title="C++">
    First, install required dependencies:

    ```bash lines wrap
    # For Ubuntu/Debian
    sudo apt-get install libssl-dev libjwt-dev libcurl4-openssl-dev

    # For MacOS
    brew install openssl jwt-cpp curl
    ```

    Create a new file to generate your Wallet Token:

    ```cpp generate_wallet_jwt.cpp lines wrap [expandable]
    #include <iostream>
    #include <string>
    #include <cstdlib>
    #include <ctime>
    #include <random>
    #include <jwt-cpp/jwt.h>
    #include <nlohmann/json.hpp>
    #include "picosha2.h"

    nlohmann::json sort_json(const nlohmann::json& j) {
        if (j.is_object()) {
            nlohmann::json result(nlohmann::json::value_t::object);
            std::vector<std::string> keys;
            for (auto it = j.begin(); it != j.end(); ++it) {
                keys.push_back(it.key());
            }
            std::sort(keys.begin(), keys.end());
            for (const auto& key : keys) {
                result[key] = sort_json(j.at(key));
            }
            return result;
        } else if (j.is_array()) {
            nlohmann::json result = nlohmann::json::array();
            for (const auto& el : j) {
                result.push_back(sort_json(el));
            }
            return result;
        } else {
            return j;
        }
    }

    std::string generateWalletJWT() {
        // Get environment variables
        const char* walletSecret = std::getenv("WALLET_SECRET");
        const char* requestMethod = std::getenv("REQUEST_METHOD");
        const char* requestHost = std::getenv("REQUEST_HOST");
        const char* requestPath = std::getenv("REQUEST_PATH");
        const char* requestBody = std::getenv("REQUEST_BODY");

        // Ensure all environment variables are present
        if (!walletSecret || !requestMethod || !requestHost || !requestPath) {
            throw std::runtime_error("Missing required environment variables");
        }

        std::string uri = std::string(requestMethod) + " " + std::string(requestHost) + std::string(requestPath);

        // Generate a random JTI
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(0, 15);
        std::string jti;
        for (int i = 0; i < 32; i++) {
            jti += "0123456789abcdef"[dis(gen)];
        }

        // Get current time
        auto now = std::chrono::system_clock::now();
        auto now_seconds = std::chrono::duration_cast<std::chrono::seconds>(now.time_since_epoch()).count();

        // Create JWT token
        auto token = jwt::create()
            .set_issued_at(now)
            .set_not_before(now)
            .set_payload_claim("jti", jwt::claim(jti))
            .set_payload_claim("uris", jwt::claim(std::vector<std::string>{uri}));

        // Add request body if present
        if (requestBody) {
            nlohmann::json body = nlohmann::json::parse(requestBody);
            nlohmann::json sortedBody = sort_json(body);
            std::string canonicalJson = sortedBody.dump();
            std::string hash = picosha2::hash256_hex_string(canonicalJson);
            token.set_payload_claim("reqHash", jwt::claim(hash));
        }

        // Sign and get the token
        return token.sign(jwt::algorithm::es256(walletSecret));
    }

    int main() {
        try {
            std::string token = generateWalletJWT();
            std::cout << token << std::endl;
        } catch (const std::exception& e) {
            std::cerr << "Error: " << e.what() << std::endl;
            return 1;
        }
        return 0;
    }
    ```

    Finally, compile and run the script to generate the JWT output and export it as an environment variable:

    ```bash lines wrap  
    g++ generate_wallet_jwt.cpp -o wallet_jwt -lcurlpp -lcurl -lssl -lcrypto -I/usr/local/include -L/usr/local/lib -ljwt -std=c++17
    export WALLET_AUTH_JWT=$(./wallet_jwt)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>

  <Tab value="c#" title="C#">
    First, install required dependencies:

    ```bash lines wrap
    dotnet add package System.IdentityModel.Tokens.Jwt
    dotnet add package BouncyCastle.NetCore
    dotnet add package Microsoft.IdentityModel.Tokens
    ```

    Create a new file to generate your Wallet Token:

    ```csharp GenerateWalletJWT.cs lines wrap [expandable]
    using System;
    using System.Collections.Generic;
    using System.IdentityModel.Tokens.Jwt;
    using System.Linq;
    using System.Security.Cryptography;
    using Microsoft.IdentityModel.Tokens;
    using System.Text;
    using System.Text.Json;
    using System.Text.Json.Nodes;

    namespace WalletJWT
    {
        internal class Program
        {
            static void Main(string[] args)
            {
                // Get environment variables
                string walletSecret = Environment.GetEnvironmentVariable("WALLET_SECRET");
                string requestMethod = Environment.GetEnvironmentVariable("REQUEST_METHOD");
                string requestHost = Environment.GetEnvironmentVariable("REQUEST_HOST");
                string requestPath = Environment.GetEnvironmentVariable("REQUEST_PATH");
                string requestBody = Environment.GetEnvironmentVariable("REQUEST_BODY");

                // Validate environment variables
                if (string.IsNullOrEmpty(walletSecret) || string.IsNullOrEmpty(requestMethod) ||
                    string.IsNullOrEmpty(requestHost) || string.IsNullOrEmpty(requestPath))
                {
                    throw new InvalidOperationException("Missing required environment variables");
                }

                string token = GenerateWalletJWT(walletSecret, requestMethod, requestHost, requestPath, requestBody);
                Console.WriteLine(token);
            }

            static string GenerateWalletJWT(string walletSecret, string requestMethod, string requestHost, 
                string requestPath, string requestBody)
            {
                // Create the URI
                string uri = $"{requestMethod} {requestHost}{requestPath}";

                // Create security key
                var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(walletSecret));
                var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

                // Create header
                var header = new JwtHeader(credentials);
                header["typ"] = "JWT";

                // Create payload
                var now = DateTimeOffset.UtcNow;
                var payload = new JwtPayload
                {
                    { "iat", now.ToUnixTimeSeconds() },
                    { "nbf", now.ToUnixTimeSeconds() },
                    { "jti", GenerateJTI() },
                    { "uris", new[] { uri } }
                };

                // Add request body if present
                if (!string.IsNullOrEmpty(requestBody))
                {
                    JsonNode parsedBody = JsonNode.Parse(requestBody);

                    var sorted = SortJson(parsedBody);
                    string canonicalJson = sorted.ToJsonString(new JsonSerializerOptions
                    {
                        WriteIndented = false
                    });

                    using var sha256 = SHA256.Create();
                    var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(canonicalJson));
                    string hashHex = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();

                    payload["reqHash"] = hashHex;
                }

                // Create and sign the token
                var token = new JwtSecurityToken(header, payload);
                var tokenHandler = new JwtSecurityTokenHandler();
                return tokenHandler.WriteToken(token);
            }

            static JsonNode SortJson(JsonNode node)
            {
                return node switch
                {
                    JsonObject obj => new JsonObject(
                        obj.OrderBy(kvp => kvp.Key)
                        .ToDictionary(
                            kvp => kvp.Key,
                            kvp => SortJson(kvp.Value)
                        )
                    ),
                    JsonArray arr => new JsonArray(arr.Select(SortJson).ToArray()),
                    _ => node
                };
            }

            // Method to generate a dynamic nonce
            static string GenerateJTI()
            {
                byte[] randomBytes = new byte[16];
                using (var rng = RandomNumberGenerator.Create())
                {
                    rng.GetBytes(randomBytes);
                }
                return Convert.ToBase64String(randomBytes)
                    .Replace("+", "-")
                    .Replace("/", "_")
                    .Replace("=", "");
            }
        }
    }
    ```

    Finally, build and run the project to generate the JWT output and export it as an environment variable:

    ```bash lines wrap
    dotnet build
    export WALLET_AUTH_JWT=$(dotnet run)
    echo $WALLET_AUTH_JWT
    ```
  </Tab>
</Tabs>

<Info>
  Wallet Tokens are valid for **1 minute**. After 1 minute, you will need to generate a new one.
  If you are experiencing issues, please make sure your machine's clock is accurate.
</Info>

<Note>
  The `req` claim in the wallet JWT is still supported for backwards compatibility with the [CDP SDK](https://github.com/coinbase/cdp-sdk), but `reqHash` is now the preferred way to include request body information.
  The `req` claim will eventually be deprecated - we recommend using `reqHash` for all new implementations.
</Note>

### 3. Authenticate

<Tip>
  Use our SDK for easier authentication
  The [CDP SDK](https://github.com/coinbase/cdp-sdk) automatically handles authentication for you, streamlining the process of making requests to all of our REST endpoints.
</Tip>

For endpoints that require wallet authentication (marked with the `X-Wallet-Auth` header requirement), you must include both:

1. The standard Bearer token in the `Authorization` header
2. The Wallet Authentication JWT in the `X-Wallet-Auth`

For example, to sign a transaction:

```bash lines wrap
# First construct the full API endpoint using our env vars
export API_ENDPOINT="https://${REQUEST_HOST}${REQUEST_PATH}"

# Make the authenticated request using both JWT tokens
curl -L -X ${REQUEST_METHOD} "${API_ENDPOINT}" \
  -H "Authorization: Bearer ${JWT}" \
  -H "X-Wallet-Auth: ${WALLET_AUTH_JWT}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "${REQUEST_BODY}"
```

This example uses the environment variables we set earlier.

## What to read next

* **[Security Best Practices](/get-started/authentication/security-best-practices)**: Learn how to secure your API keys and other sensitive information.
* **[CDP API Keys](/get-started/authentication/cdp-api-keys)**: Learn how to create and manage your API keys.
* **[JWT Authentication](/get-started/authentication/jwt-authentication)**: More information on JWT authentication.
* **[CDP cURL](/get-started/authentication/cdp-curl)**: Learn how to use our CLI tool to interact with the CDP API.
* **[Postman Files](/get-started/authentication/postman-files)**: Download our Postman collection and environment files to get started.
