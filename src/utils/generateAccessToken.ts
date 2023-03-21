import { Wallet } from 'ethers'
import { messages, utils } from '@violetprotocol/ethereum-access-token-helpers'
import { splitSignature } from '@ethersproject/bytes'
import { Interface } from '@ethersproject/abi'

export const generateAccessToken = async (
  signer: Wallet,
  domain: messages.Domain,
  caller: string,
  functionSignature: string,
  contractAddress: string,
  parameters: string,
  expiry?: number
) => {
  const token = {
    functionCall: {
      functionSignature,
      target: contractAddress,
      caller: caller,
      parameters
    },
    expiry: expiry || 4833857428
  }

  const eat = splitSignature(await utils.signAccessToken(signer, domain, token))

  return { eat, expiry: token.expiry }
}
