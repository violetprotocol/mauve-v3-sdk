import { BigintIsh } from '@violetprotocol/mauve-sdk-core'
import JSBI from 'jsbi'

/**
 * Generated method parameters for executing a call.
 */
export interface MethodParameters {
  /**
   * The hex encoded calldata to perform the given operation
   */
  calldata: string
  /**
   * The amount of ether (wei) to send in hex.
   */
  value: string
}

/**
 * Generated method parameters for executing a call.
 */
export interface MulticallParameters {
  /**
   * The hex encoded array of calldatas to perform in the multicall
   */
  calls: string[]
  /**
   * The amount of ether (wei) to send in hex.
   */
  value: string
}

/**
 * Generated method parameters for EAT signing
 */
export interface PresignEATFunctionCall {
  /**
   * The hex encoded bytes4 function signature for the function being called
   */
  functionSignature: string
  /**
   * The hex encoded function parameters, packed according to abi with EAT parameters stripped
   */
  parameters: string
}

/**
 * Converts a big int to a hex string
 * @param bigintIsh
 * @returns The hex encoded calldata
 */
export function toHex(bigintIsh: BigintIsh) {
  const bigInt = JSBI.BigInt(bigintIsh)
  let hex = bigInt.toString(16)
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`
  }
  return `0x${hex}`
}
