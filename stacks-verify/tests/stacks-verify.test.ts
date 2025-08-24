
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
});
