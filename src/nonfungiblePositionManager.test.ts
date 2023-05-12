import { Percent, Token, CurrencyAmount, WETH9, Ether } from '@violetprotocol/mauve-sdk-core'
import { FeeAmount, TICK_SPACINGS } from './constants'
import { Pool } from './entities/pool'
import { Position } from './entities/position'
import { NonfungiblePositionManager } from './nonfungiblePositionManager'
import { encodeSqrtRatioX96 } from './utils/encodeSqrtRatioX96'

describe('NonfungiblePositionManager', () => {
  const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0', 'token0')
  const token1 = new Token(1, '0x0000000000000000000000000000000000000002', 18, 't1', 'token1')

  const fee = FeeAmount.MEDIUM

  const pool_0_1 = new Pool(token0, token1, fee, encodeSqrtRatioX96(1, 1), 0, 0, [])
  const pool_1_weth = new Pool(token1, WETH9[1], fee, encodeSqrtRatioX96(1, 1), 0, 0, [])

  const recipient = '0x0000000000000000000000000000000000000003'
  const sender = '0x0000000000000000000000000000000000000004'
  const tokenId = 1
  const slippageTolerance = new Percent(1, 100)
  const deadline = 123

  describe('#addCallParameters', () => {
    it('throws if liquidity is 0', () => {
      expect(() =>
        NonfungiblePositionManager.addCallParameters(
          new Position({
            pool: pool_0_1,
            tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
            tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
            liquidity: 0,
          }),
          { recipient, slippageTolerance, deadline }
        )
      ).toThrow('ZERO_LIQUIDITY')
    })

    it('throws if pool does not involve ether and useNative is true', () => {
      expect(() =>
        NonfungiblePositionManager.addCallParameters(
          new Position({
            pool: pool_0_1,
            tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
            tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
            liquidity: 1,
          }),
          { recipient, slippageTolerance, deadline, useNative: Ether.onChain(1) }
        )
      ).toThrow('NO_WETH')
    })

    it('succeeds for mint', () => {
      const { calls, value } = NonfungiblePositionManager.addCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 1,
        }),
        { recipient, slippageTolerance, deadline }
      )

      expect(calls).toEqual([
        '0x88316456000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b',
      ])
      expect(value).toEqual('0x00')
    })

    it('returns the correct functionSignature and parameters', () => {
      const { functionSignature, parameters } = NonfungiblePositionManager.addCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 1,
        }),
        { recipient, slippageTolerance, deadline }
      )

      expect(functionSignature).toEqual('0x2efb614b')
      expect(parameters).toEqual(
        '0x00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000016488316456000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b00000000000000000000000000000000000000000000000000000000'
      )
    })

    it('succeeds for increase', () => {
      const { calls, value } = NonfungiblePositionManager.addCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 1,
        }),
        { tokenId, slippageTolerance, deadline }
      )

      expect(calls).toEqual([
        '0x219f5d1700000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b',
      ])
      expect(value).toEqual('0x00')
    })

    it('createPool', () => {
      const { calls, value } = NonfungiblePositionManager.addCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 1,
        }),
        { recipient, slippageTolerance, deadline, createPool: true }
      )

      expect(calls).toEqual([
        '0x88316456000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b',
      ])
      expect(value).toEqual('0x00')
    })

    it('useNative', () => {
      const { calls, value } = NonfungiblePositionManager.addCallParameters(
        new Position({
          pool: pool_1_weth,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 1,
        }),
        { recipient, slippageTolerance, deadline, useNative: Ether.onChain(1) }
      )

      expect(calls).toEqual([
        '0x883164560000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb8ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc4000000000000000000000000000000000000000000000000000000000000003c00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b',
        '0x12210e8a',
      ])
      expect(value).toEqual('0x01')
    })
  })

  describe('#collectCallParameters', () => {
    it('works', () => {
      const { calls, value } = NonfungiblePositionManager.collectCallParameters({
        tokenId,
        expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
        expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
        recipient,
      })

      expect(calls).toEqual([
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
      ])
      expect(value).toEqual('0x00')
    })

    it('returns the correct functionSignature and parameters', () => {
      const { functionSignature, parameters } = NonfungiblePositionManager.collectCallParameters({
        tokenId,
        expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
        expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
        recipient,
      })

      expect(functionSignature).toEqual('0x2efb614b')
      expect(parameters).toEqual(
        '0x00000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000'
      )
    })

    it('works with eth', () => {
      const { calls, value } = NonfungiblePositionManager.collectCallParameters({
        tokenId,
        expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token1, 0),
        expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(Ether.onChain(1), 0),
        recipient,
      })

      expect(calls).toEqual([
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
        '0xdf2ab5bb000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
      ])
      expect(value).toEqual('0x00')
    })
  })

  describe('#removeCallParameters', () => {
    it('throws for 0 liquidity', () => {
      expect(() =>
        NonfungiblePositionManager.removeCallParameters(
          new Position({
            pool: pool_0_1,
            tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
            tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
            liquidity: 0,
          }),
          {
            tokenId,
            liquidityPercentage: new Percent(1),
            slippageTolerance,
            deadline,
            collectOptions: {
              expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
              expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
              recipient,
            },
          }
        )
      ).toThrow('ZERO_LIQUIDITY')
    })

    it('throws for 0 liquidity from small percentage', () => {
      expect(() =>
        NonfungiblePositionManager.removeCallParameters(
          new Position({
            pool: pool_0_1,
            tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
            tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
            liquidity: 50,
          }),
          {
            tokenId,
            liquidityPercentage: new Percent(1, 100),
            slippageTolerance,
            deadline,
            collectOptions: {
              expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
              expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
              recipient,
            },
          }
        )
      ).toThrow('ZERO_LIQUIDITY')
    })

    it('throws for bad burn', () => {
      expect(() =>
        NonfungiblePositionManager.removeCallParameters(
          new Position({
            pool: pool_0_1,
            tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
            tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
            liquidity: 50,
          }),
          {
            tokenId,
            liquidityPercentage: new Percent(99, 100),
            slippageTolerance,
            deadline,
            burnToken: true,
            collectOptions: {
              expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
              expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
              recipient,
            },
          }
        )
      ).toThrow('CANNOT_BURN')
    })

    it('works', () => {
      const { calls, value } = NonfungiblePositionManager.removeCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 100,
        }),
        {
          tokenId,
          liquidityPercentage: new Percent(1),
          slippageTolerance,
          deadline,
          collectOptions: {
            expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
            expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
            recipient,
          },
        }
      )

      expect(calls).toEqual([
        '0x0c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b',
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
      ])
      expect(value).toEqual('0x00')
    })

    it('returns the correct functionSignature and parameters', () => {
      const { functionSignature, parameters } = NonfungiblePositionManager.removeCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 100,
        }),
        {
          tokenId,
          liquidityPercentage: new Percent(1),
          slippageTolerance,
          deadline,
          collectOptions: {
            expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
            expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
            recipient,
          },
        }
      )

      expect(functionSignature).toEqual('0x2efb614b')
      expect(parameters).toEqual(
        '0x00000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000a40c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000084fc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000000000'
      )
    })

    it('works for partial', () => {
      const { calls, value } = NonfungiblePositionManager.removeCallParameters(
        new Position({
          pool: pool_0_1,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 100,
        }),
        {
          tokenId,
          liquidityPercentage: new Percent(1, 2),
          slippageTolerance,
          deadline,
          collectOptions: {
            expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(token0, 0),
            expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(token1, 0),
            recipient,
          },
        }
      )

      expect(calls).toEqual([
        '0x0c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b',
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
      ])
      expect(value).toEqual('0x00')
    })

    it('works with eth', () => {
      const ethAmount = CurrencyAmount.fromRawAmount(Ether.onChain(1), 0)
      const tokenAmount = CurrencyAmount.fromRawAmount(token1, 0)

      const { calls, value } = NonfungiblePositionManager.removeCallParameters(
        new Position({
          pool: pool_1_weth,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 100,
        }),
        {
          tokenId,
          liquidityPercentage: new Percent(1),
          slippageTolerance,
          deadline,
          collectOptions: {
            expectedCurrencyOwed0: pool_1_weth.token0.equals(token1) ? tokenAmount : ethAmount,
            expectedCurrencyOwed1: pool_1_weth.token0.equals(token1) ? ethAmount : tokenAmount,
            recipient,
          },
        }
      )

      expect(calls).toEqual([
        '0x0c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b',
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
        '0xdf2ab5bb000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
      ])
      expect(value).toEqual('0x00')
    })

    it('works for partial with eth', () => {
      const ethAmount = CurrencyAmount.fromRawAmount(Ether.onChain(1), 0)
      const tokenAmount = CurrencyAmount.fromRawAmount(token1, 0)

      const { calls, value } = NonfungiblePositionManager.removeCallParameters(
        new Position({
          pool: pool_1_weth,
          tickLower: -TICK_SPACINGS[FeeAmount.MEDIUM],
          tickUpper: TICK_SPACINGS[FeeAmount.MEDIUM],
          liquidity: 100,
        }),
        {
          tokenId,
          liquidityPercentage: new Percent(1, 2),
          slippageTolerance,
          deadline,
          collectOptions: {
            expectedCurrencyOwed0: pool_1_weth.token0.equals(token1) ? tokenAmount : ethAmount,
            expectedCurrencyOwed1: pool_1_weth.token0.equals(token1) ? ethAmount : tokenAmount,
            recipient,
          },
        }
      )

      expect(calls).toEqual([
        '0x0c49ccbe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b',
        '0xfc6f78650000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffff00000000000000000000000000000000ffffffffffffffffffffffffffffffff',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
        '0xdf2ab5bb000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003',
      ])
      expect(value).toEqual('0x00')
    })
  })
  describe('#safeTransferFromParameters', () => {
    it('succeeds no data param', () => {
      const options = {
        sender,
        recipient,
        tokenId
      }
      const { calldata, value } = NonfungiblePositionManager.safeTransferFromParameters(options)

      expect(calldata).toEqual(
        '0x42842e0e000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001'
      )
      expect(value).toEqual('0x00')
    })
    it('succeeds data param', () => {
      const data = '0x0000000000000000000000000000000000009004'
      const options = {
        sender,
        recipient,
        tokenId,
        data
      }
      const { calldata, value } = NonfungiblePositionManager.safeTransferFromParameters(options)

      expect(calldata).toEqual(
        '0xb88d4fde000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000009004000000000000000000000000'
      )
      expect(value).toEqual('0x00')
    })
  })
})
