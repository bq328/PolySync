import { Wallet, utils } from "ethers";

export function normalizePrivateKey(raw: string): string | null {
  const s = raw.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(s)) return s;
  if (/^[a-fA-F0-9]{64}$/.test(s)) return `0x${s}`;
  return null;
}

export function deriveEoaAddress(privateKey: string): string {
  return new Wallet(privateKey).address;
}

export function createEthersV5Wallet(privateKey: string): Wallet {
  return new Wallet(privateKey);
}

export async function signTypedData(
  privateKey: string,
  domain: Parameters<Wallet["_signTypedData"]>[0],
  types: Parameters<Wallet["_signTypedData"]>[1],
  value: Parameters<Wallet["_signTypedData"]>[2]
): Promise<string> {
  return new Wallet(privateKey)._signTypedData(domain, types, value);
}

export function keccakUtf8(value: string): string {
  return utils.keccak256(utils.toUtf8Bytes(value));
}

export function keccakHex(value: string): string {
  return utils.keccak256(value);
}

export function abiEncode(types: readonly string[], values: readonly unknown[]): string {
  return utils.defaultAbiCoder.encode(types, values);
}

export function hexlifyUtf8(value: string): string {
  return utils.hexlify(utils.toUtf8Bytes(value));
}
