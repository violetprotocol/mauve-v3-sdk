import { Interface } from '@ethersproject/abi'
import { utils } from '@violetprotocol/ethereum-access-token-helpers'
import IEATMulticall from '@violetprotocol/mauve-v3-periphery/artifacts/contracts/interfaces/IEATMulticall.sol/IEATMulticall.json'
import { PresignEATFunctionCall } from './utils'

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

    return EATMulticall.INTERFACE.encodeFunctionData('multicall', [v, r, s, expiry, calldatas])
  }

  public static encodePresignMulticall(calldatas: string | string[]): PresignEATFunctionCall {
    if (!Array.isArray(calldatas)) {
      calldatas = [calldatas]
    }

    return {
      functionSignature: EATMulticall.INTERFACE.getSighash('multicall(uint8,bytes32,bytes32,uint256,bytes[]'),
      parameters: utils.packParameters(EATMulticall.INTERFACE, 'multicall(uint8,bytes32,bytes32,uint256,bytes[])', [
        calldatas
      ])
    }
  }
}
