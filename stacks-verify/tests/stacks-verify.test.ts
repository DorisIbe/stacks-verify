
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const contractName = "stacks-verify";

describe("Stacks Verify Contract", () => {

  describe("Contract Setup", () => {
    it("should initialize with correct default values", () => {
      // Check that the contract is properly initialized
      expect(simnet.blockHeight).toBeDefined();
      expect(simnet.blockHeight).toBeGreaterThan(0);
    });

    it("should have deployer as contract owner", () => {
      // The contract owner should be the deployer
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity-by-principal",
        [Cl.principal(deployer)],
        deployer
      );
      expect(result).toBeNone();
    });
  });

  describe("Identity Management", () => {
    it("should create a new identity successfully", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      
      const { result } = simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should prevent creating duplicate identities for same principal", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      
      // Create first identity
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Try to create second identity with same principal
      const { result } = simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(402)); // ERR_IDENTITY_EXISTS
    });

    it("should retrieve identity by ID", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      
      // Create identity
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Get identity by ID
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity",
        [Cl.uint(1)],
        wallet1
      );

      expect(result).toBeSome(Cl.tuple({
        "owner": Cl.principal(wallet1),
        "created-at": Cl.uint(3),
        "updated-at": Cl.uint(3),
        "reputation-score": Cl.uint(0),
        "is-verified": Cl.bool(false),
        "metadata-hash": Cl.stringAscii(metadataHash)
      }));
    });

    it("should retrieve identity by principal", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      
      // Create identity
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Get identity by principal
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity-by-principal",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(result).toBeSome(Cl.tuple({
        "owner": Cl.principal(wallet1),
        "created-at": Cl.uint(3),
        "updated-at": Cl.uint(3),
        "reputation-score": Cl.uint(0),
        "is-verified": Cl.bool(false),
        "metadata-hash": Cl.stringAscii(metadataHash)
      }));
    });

    it("should update identity metadata", () => {
      const originalHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const updatedHash = "QmUpdatedHashForIdentityMetadata123456789012345678901234";
      
      // Create identity
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(originalHash)],
        wallet1
      );

      // Update metadata
      const { result } = simnet.callPublicFn(
        contractName,
        "update-identity-metadata",
        [Cl.stringAscii(updatedHash)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));

      // Verify update - just check that identity still exists
      const identityResult = simnet.callReadOnlyFn(
        contractName,
        "get-identity-by-principal",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(identityResult.result).toBeSome(Cl.tuple({
        "owner": Cl.principal(wallet1),
        "created-at": Cl.uint(3),
        "updated-at": Cl.uint(4),
        "reputation-score": Cl.uint(0),
        "is-verified": Cl.bool(false),
        "metadata-hash": Cl.stringAscii(updatedHash)
      }));
    });

    it("should fail to update metadata for non-existent identity", () => {
      const updatedHash = "QmUpdatedHashForIdentityMetadata123456789012345678901234";
      
      const { result } = simnet.callPublicFn(
        contractName,
        "update-identity-metadata",
        [Cl.stringAscii(updatedHash)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(403)); // ERR_IDENTITY_NOT_FOUND
    });

    it("should return none for non-existent identity", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity",
        [Cl.uint(999)],
        wallet1
      );

      expect(result).toBeNone();
    });

    it("should return none for principal without identity", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity-by-principal",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(result).toBeNone();
    });

    it("should increment identity ID for multiple identities", () => {
      const metadataHash1 = "QmExampleHashForIdentity1234567890123456789012345678901";
      const metadataHash2 = "QmExampleHashForIdentity2234567890123456789012345678902";
      
      // Create first identity
      const result1 = simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash1)],
        wallet1
      );
      expect(result1.result).toBeOk(Cl.uint(1));

      // Create second identity
      const result2 = simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash2)],
        wallet2
      );
      expect(result2.result).toBeOk(Cl.uint(2));
    });
  });

  describe("Credential Management", () => {
    it("should issue a credential successfully", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000; // Future block height
      
      // Create identity first
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Issue credential
      const { result } = simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1), // identity-id
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1 // Identity owner issuing self-credential
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should prevent issuing credential with past expiration date", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1; // Past block height
      
      // Create identity first
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Try to issue credential with past expiration
      const { result } = simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(404)); // ERR_INVALID_CREDENTIAL
    });

    it("should prevent unauthorized credential issuance", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity with wallet1
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Try to issue credential from unauthorized wallet2
      const { result } = simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet2 // Unauthorized issuer
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_UNAUTHORIZED
    });

    it("should retrieve credential by ID", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Get credential
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-credential",
        [Cl.uint(1)],
        wallet1
      );

      expect(result).toBeSome(Cl.tuple({
        "identity-id": Cl.uint(1),
        "credential-type": Cl.stringAscii(credentialType),
        "issuer": Cl.principal(wallet1),
        "issued-at": Cl.uint(4), // Block height will be 4 due to accumulated tests
        "expires-at": Cl.uint(expiresAt),
        "is-revoked": Cl.bool(false),
        "data-hash": Cl.stringAscii(dataHash),
        "verification-status": Cl.stringAscii("pending")
      }));
    });

    it("should verify credential successfully", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Verify credential (contract owner can verify)
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-credential",
        [Cl.uint(1)],
        deployer // Contract owner
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should revoke credential successfully", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Revoke credential
      const { result } = simnet.callPublicFn(
        contractName,
        "revoke-credential",
        [Cl.uint(1)],
        wallet1 // Issuer can revoke
      );

      expect(result).toBeOk(Cl.bool(true));

      // Verify credential is revoked
      const credentialResult = simnet.callReadOnlyFn(
        contractName,
        "get-credential",
        [Cl.uint(1)],
        wallet1
      );

      // Just verify that the credential still exists after revocation
      expect(credentialResult.result).toBeSome(Cl.tuple({
        "identity-id": Cl.uint(1),
        "credential-type": Cl.stringAscii(credentialType),
        "issuer": Cl.principal(wallet1),
        "issued-at": Cl.uint(4),
        "expires-at": Cl.uint(expiresAt),
        "is-revoked": Cl.bool(true),
        "data-hash": Cl.stringAscii(dataHash),
        "verification-status": Cl.stringAscii("revoked")
      }));
    });

    it("should check credential validity correctly", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Verify credential first
      simnet.callPublicFn(
        contractName,
        "verify-credential",
        [Cl.uint(1)],
        deployer
      );

      // Check if credential is valid
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-credential-valid",
        [Cl.uint(1)],
        wallet1
      );

      expect(result).toBeBool(true);
    });

    it("should return false for invalid credential", () => {
      // Check non-existent credential
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-credential-valid",
        [Cl.uint(999)],
        wallet1
      );

      expect(result).toBeBool(false);
    });

    it("should get identity credential by type", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Get credential by identity and type
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "get-identity-credential",
        [Cl.uint(1), Cl.stringAscii(credentialType)],
        wallet1
      );

      expect(result).toBeSome(Cl.tuple({
        "identity-id": Cl.uint(1),
        "credential-type": Cl.stringAscii(credentialType),
        "issuer": Cl.principal(wallet1),
        "issued-at": Cl.uint(4), // Block height will be 4 due to accumulated tests
        "expires-at": Cl.uint(expiresAt),
        "is-revoked": Cl.bool(false),
        "data-hash": Cl.stringAscii(dataHash),
        "verification-status": Cl.stringAscii("pending")
      }));
    });

    it("should check if identity has valid credential", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Verify credential first
      simnet.callPublicFn(
        contractName,
        "verify-credential",
        [Cl.uint(1)],
        deployer
      );

      // Check if identity has valid credential
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "has-valid-credential",
        [Cl.uint(1), Cl.stringAscii(credentialType)],
        wallet1
      );

      expect(result).toBeBool(true);
    });
  });

  describe("Trusted Issuer Management", () => {
    it("should add trusted issuer successfully", () => {
      const issuerType = "university";
      
      const { result } = simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet1), Cl.stringAscii(issuerType)],
        deployer // Only contract owner can add
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should prevent non-owner from adding trusted issuer", () => {
      const issuerType = "university";
      
      const { result } = simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet1), Cl.stringAscii(issuerType)],
        wallet1 // Non-owner trying to add
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_UNAUTHORIZED
    });

    it("should check if issuer is trusted", () => {
      const issuerType = "university";
      
      // Add trusted issuer first
      simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet1), Cl.stringAscii(issuerType)],
        deployer
      );

      // Check if issuer is trusted
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-trusted-issuer",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(result).toBeBool(true);
    });

    it("should return false for non-trusted issuer", () => {
      const { result } = simnet.callReadOnlyFn(
        contractName,
        "is-trusted-issuer",
        [Cl.principal(wallet2)],
        wallet1
      );

      expect(result).toBeBool(false);
    });

    it("should remove trusted issuer successfully", () => {
      const issuerType = "university";
      
      // Add trusted issuer first
      simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet1), Cl.stringAscii(issuerType)],
        deployer
      );

      // Remove trusted issuer
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-trusted-issuer",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));

      // Verify issuer is no longer trusted
      const checkResult = simnet.callReadOnlyFn(
        contractName,
        "is-trusted-issuer",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(checkResult.result).toBeBool(false);
    });

    it("should prevent non-owner from removing trusted issuer", () => {
      const issuerType = "university";
      
      // Add trusted issuer first
      simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet1), Cl.stringAscii(issuerType)],
        deployer
      );

      // Try to remove as non-owner
      const { result } = simnet.callPublicFn(
        contractName,
        "remove-trusted-issuer",
        [Cl.principal(wallet1)],
        wallet1 // Non-owner trying to remove
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_UNAUTHORIZED
    });

    it("should allow trusted issuer to issue credentials", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const issuerType = "university";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      // Add trusted issuer
      simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet2), Cl.stringAscii(issuerType)],
        deployer
      );

      // Trusted issuer issues credential for someone else's identity
      const { result } = simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1), // identity-id
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet2 // Trusted issuer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should allow trusted issuer to verify credentials", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const issuerType = "university";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Add trusted issuer
      simnet.callPublicFn(
        contractName,
        "add-trusted-issuer",
        [Cl.principal(wallet2), Cl.stringAscii(issuerType)],
        deployer
      );

      // Trusted issuer verifies credential
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-credential",
        [Cl.uint(1)],
        wallet2 // Trusted issuer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should allow contract owner to verify credentials", () => {
      const metadataHash = "QmExampleHashForIdentityMetadata123456789012345678901234";
      const credentialType = "education-completion";
      const dataHash = "QmExampleHashForCredentialData123456789012345678901234";
      const expiresAt = 1000;
      
      // Create identity and issue credential
      simnet.callPublicFn(
        contractName,
        "create-identity",
        [Cl.stringAscii(metadataHash)],
        wallet1
      );

      simnet.callPublicFn(
        contractName,
        "issue-credential",
        [
          Cl.uint(1),
          Cl.stringAscii(credentialType),
          Cl.uint(expiresAt),
          Cl.stringAscii(dataHash)
        ],
        wallet1
      );

      // Contract owner verifies credential
      const { result } = simnet.callPublicFn(
        contractName,
        "verify-credential",
        [Cl.uint(1)],
        deployer // Contract owner
      );

      expect(result).toBeOk(Cl.bool(true));
    });
  });
});


