import { utils } from '@violetprotocol/ethereum-access-token-helpers'
import IEATMulticall from '@violetprotocol/mauve-periphery/artifacts/contracts/interfaces/IEATMulticall.sol/IEATMulticall.json'
import { Interface } from 'ethers/lib/utils'
import { PresignEATFunctionCall } from './utils'

/**
 * Produces EATMulticall-encoded calldata for both pre and post signed EATs
 *
 * Use `encodePresignMulticall` when generating the relevant data that needs to be constructed
 * in an EAT to be signed
 *
 * Use `encodePostsignMulticall` when generating the final transaction object with a
 * signed EAT
 */
export abstract class EATMulticall {
  public static INTERFACE: Interface = new Interface(IEATMulticall.abi)

  /**
   * Cannot be constructed.
   */
  private constructor() {}

  public static encodePostsignMulticall(
    v: number,
    r: string,
    s: string,
    expiry: number,
    calldatas: string | string[]
  ): string {
    if (!Array.isArray(calldatas)) {
      calldatas = [calldatas]
    }

    return EATMulticall.INTERFACE.encodeFunctionData('multicall(uint8,bytes32,bytes32,uint256,bytes[])', [
      v,
      r,
      s,
      expiry,
      calldatas
    ])
  }

  public static encodePresignMulticall(calldatas: string | string[]): PresignEATFunctionCall {
    if (!Array.isArray(calldatas)) {
      calldatas = [calldatas]
    }

    return {
      functionSignature: EATMulticall.INTERFACE.getSighash('multicall(uint8,bytes32,bytes32,uint256,bytes[])'),
      parameters: utils.packParameters(EATMulticall.INTERFACE, 'multicall(uint8,bytes32,bytes32,uint256,bytes[])', [
        calldatas
      ])
    }
  }
}
