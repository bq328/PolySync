import { describe, expect, it } from "vitest";
import {
  abiEncode,
  deriveEoaAddress,
  hexlifyUtf8,
  keccakHex,
  keccakUtf8,
  normalizePrivateKey,
  signTypedData,
} from "../src/crypto/wallet.js";

const PRIVATE_KEY =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
const EOA_ADDRESS = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";

describe("wallet crypto helpers", () => {
  it("normalizes private keys and derives the same EOA address as ethers v5", () => {
    expect(normalizePrivateKey(PRIVATE_KEY.slice(2))).toBe(PRIVATE_KEY);
    expect(normalizePrivateKey(PRIVATE_KEY)).toBe(PRIVATE_KEY);
    expect(normalizePrivateKey("not-a-key")).toBeNull();
    expect(deriveEoaAddress(PRIVATE_KEY)).toBe(EOA_ADDRESS);
  });

  it("keeps ClobAuth hash helpers byte-compatible", () => {
    const domainTypeHash = keccakUtf8("EIP712Domain(string name,string version,uint256 chainId)");
    const nameHash = keccakUtf8("ClobAuthDomain");
    const versionHash = keccakUtf8("1");

    expect(nameHash).toBe("0x64feabfd0e91bed17f4270585553ca8456298e8f507363a4b725be4e4da29810");
    expect(hexlifyUtf8("ClobAuthDomain")).toBe("0x436c6f6241757468446f6d61696e");
    expect(
      keccakHex(
        abiEncode(
          ["bytes32", "bytes32", "bytes32", "uint256"],
          [domainTypeHash, nameHash, versionHash, 137]
        )
      )
    ).toBe("0xcfc66be2a3b30464cb3b588324101f660c9a205fa76e8e5f83ee16a528e1c4cb");
  });

  it("keeps typed-data signatures byte-compatible", async () => {
    const sig = await signTypedData(
      PRIVATE_KEY,
      { name: "Test", version: "1", chainId: 137 },
      { Ping: [{ name: "sender", type: "address" }, { name: "nonce", type: "uint256" }] },
      { sender: EOA_ADDRESS, nonce: 1 }
    );

    expect(sig).toBe(
      "0xf86f3fe1531bce9e58c22481adcedef6f65db657dea00cbb2cd71dca45bb8cdc6790b1896c69fd36752ba336989a16eaa6e4cc61e4a2a38c98051d71c18972cd1c"
    );
  });
});
