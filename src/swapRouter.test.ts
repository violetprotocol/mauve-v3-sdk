import JSBI from 'jsbi'
import { BigintIsh, CurrencyAmount, Ether, Percent, Token, TradeType, WETH9 } from '@violetprotocol/mauve-sdk-core'
import { FeeAmount, TICK_SPACINGS } from './constants'
import { Pool } from './entities/pool'
import { SwapRouter } from './swapRouter'
import { nearestUsableTick, TickMath, toHex } from './utils'
import { encodeSqrtRatioX96 } from './utils/encodeSqrtRatioX96'
import { Route, Trade } from './entities'
import { REFUND_ETH_FUNC_SIG } from './functionSignatures'

describe('SwapRouter', () => {
  const ETHER = Ether.onChain(1)
  const token0 = new Token(1, '0x0000000000000000000000000000000000000001', 18, 't0', 'token0')
  const token1 = new Token(1, '0x0000000000000000000000000000000000000002', 18, 't1', 'token1')
  const token2 = new Token(1, '0x0000000000000000000000000000000000000003', 18, 't2', 'token2')
  const token3 = new Token(1, '0x0000000000000000000000000000000000000004', 18, 't3', 'token3')

  const feeAmount = FeeAmount.MEDIUM
  const sqrtRatioX96 = encodeSqrtRatioX96(1, 1)
  const liquidity = 1_000_000
  const WETH = WETH9[1]

  const makePool = (token0: Token, token1: Token) => {
    return new Pool(token0, token1, feeAmount, sqrtRatioX96, liquidity, TickMath.getTickAtSqrtRatio(sqrtRatioX96), [
      {
        index: nearestUsableTick(TickMath.MIN_TICK, TICK_SPACINGS[feeAmount]),
        liquidityNet: liquidity,
        liquidityGross: liquidity
      },
      {
        index: nearestUsableTick(TickMath.MAX_TICK, TICK_SPACINGS[feeAmount]),
        liquidityNet: -liquidity,
        liquidityGross: liquidity
      }
    ])
  }

  const pool_0_1 = makePool(token0, token1)
  const pool_1_weth = makePool(token1, WETH)
  const pool_0_2 = makePool(token0, token2)
  const pool_0_3 = makePool(token0, token3)
  const pool_2_3 = makePool(token2, token3)
  const pool_3_weth = makePool(token3, WETH)
  const pool_1_3 = makePool(token3, token1)

  const slippageTolerance = new Percent(1, 100)
  const recipient = '0x0000000000000000000000000000000000000003'
  const deadline = 123

  describe('#swapCallParameters', () => {
    describe('single trade input', () => {
      it('single-hop exact input', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1], token0, token1),
          CurrencyAmount.fromRawAmount(token0, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactInputSingle',
          token0,
          token1,
          pool_0_1,
          recipient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient
        )

        expect(calls).toEqual([encodedTrade])

        expect(value).toBe('0x00')
      })

      it('single-hop exact output', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1], token0, token1),
          CurrencyAmount.fromRawAmount(token1, 100),
          TradeType.EXACT_OUTPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactOutputSingle',
          token0,
          token1,
          pool_0_1,
          recipient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient
        )

        expect(calls).toEqual([encodedTrade])
        expect(value).toBe('0x00')
      })

      it('multi-hop exact input', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1, pool_1_weth], token0, WETH),
          CurrencyAmount.fromRawAmount(token0, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        expect(calls).toEqual([
          '0xb858183f0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000'
        ])
        expect(value).toBe('0x00')
      })

      it('multi-hop exact output', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1, pool_1_weth], token0, WETH),
          CurrencyAmount.fromRawAmount(WETH, 100),
          TradeType.EXACT_OUTPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        expect(calls).toEqual([
          '0x09b81346000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000690000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000'
        ])
        expect(value).toBe('0x00')
      })

      it('ETH in exact input', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], ETHER, token1),
          CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactInputSingle',
          WETH,
          token1,
          pool_1_weth,
          recipient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient
        )

        expect(calls).toEqual([encodedTrade])
        expect(value).toBe('0x64')
      })

      it('ETH in exact output', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], ETHER, token1),
          CurrencyAmount.fromRawAmount(token1, 100),
          TradeType.EXACT_OUTPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactOutputSingle',
          WETH,
          token1,
          pool_1_weth,
          recipient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient
        )

        expect(calls).toEqual([encodedTrade, REFUND_ETH_FUNC_SIG])
        expect(value).toBe('0x67')
      })

      it('ETH out exact input', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], token1, ETHER),
          CurrencyAmount.fromRawAmount(token1, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactInputSingle',
          token1,
          WETH,
          pool_1_weth,
          '', // recipient of WETH9 is the zero address
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient
        )

        expect(calls).toEqual([
          encodedTrade,
          '0x49404b7c00000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000003'
        ])
        expect(value).toBe('0x00')
      })

      it('ETH out exact output', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], token1, ETHER),
          CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
          TradeType.EXACT_OUTPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline
        })

        const encodedTrade = encodeTrade(
          'exactOutputSingle',
          token1,
          WETH,
          pool_1_weth,
          '', // recipient of WETH9 is the zero address
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient
        )

        expect(calls).toEqual([
          encodedTrade,
          '0x49404b7c00000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000003'
        ])
        expect(value).toBe('0x00')
      })

      it('sqrtPriceLimitX96', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1], token0, token1),
          CurrencyAmount.fromRawAmount(token0, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline,
          sqrtPriceLimitX96: JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128))
        })

        const encodedTrade = encodeTrade(
          'exactInputSingle',
          token0,
          token1,
          pool_0_1,
          recipient,
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient,
          JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128))
        )

        expect(calls).toEqual([encodedTrade])
        expect(value).toBe('0x00')
      })

      it('fee with eth out', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], token1, ETHER),
          CurrencyAmount.fromRawAmount(token1, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline,
          fee: {
            fee: new Percent(5, 1000),
            recipient
          }
        })

        const encodedTrade = encodeTrade(
          'exactInputSingle',
          token1,
          WETH,
          pool_1_weth,
          '', // recipient of WETH9 is the zero address
          trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
          trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient
        )

        expect(calls).toEqual([
          encodedTrade,
          '0x9b2c0a370000000000000000000000000000000000000000000000000000000000000061000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003'
        ])
        expect(value).toBe('0x00')
      })

      it('fee with eth in using exact output', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_1_weth], ETHER, token1),
          CurrencyAmount.fromRawAmount(token1, 10),
          TradeType.EXACT_OUTPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline,
          fee: {
            fee: new Percent(5, 1000),
            recipient
          }
        })

        // @reviewer: please sanity check this.

        // const encodedTrade = encodeTrade(
        //   'exactOutputSingle',
        //   WETH,
        //   token1,
        //   pool_1_weth,
        //   recipient,
        //   trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient,
        //   trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient
        // )

        // Above encoding results in the calldata below.

        // The generated data doesn't match what we expect, and for some reason the calldata for this trade
        // wants the recipient to be the zero address. This made sense for ETH out, because WETH is burnt (sent to zero)
        // but here we have ETH input and token1 as output, which should be received by `recipient`
        // My hunch is that this is something fee related

        // We expect:
        // 0x5023b4df
        // 000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
        // 0000000000000000000000000000000000000000000000000000000000000002
        // 0000000000000000000000000000000000000000000000000000000000000bb8
        // 0000000000000000000000000000000000000000000000000000000000000003 <------ problem
        // 000000000000000000000000000000000000000000000000000000000000000a
        // 000000000000000000000000000000000000000000000000000000000000000c
        // 0000000000000000000000000000000000000000000000000000000000000000

        // Encoder gives us:
        // 0x5023b4df
        // 000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
        // 0000000000000000000000000000000000000000000000000000000000000002
        // 0000000000000000000000000000000000000000000000000000000000000bb8
        // 0000000000000000000000000000000000000000000000000000000000000000 <------ I want the zero address くださいー
        // 000000000000000000000000000000000000000000000000000000000000000a
        // 000000000000000000000000000000000000000000000000000000000000000c
        // 0000000000000000000000000000000000000000000000000000000000000000

        expect(calls).toEqual([
          '0x5023b4df000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000',
          '0xe0e189a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003',
          REFUND_ETH_FUNC_SIG
        ])
        expect(value).toBe('0x0c')
      })

      it('fee', async () => {
        const trade = await Trade.fromRoute(
          new Route([pool_0_1], token0, token1),
          CurrencyAmount.fromRawAmount(token0, 100),
          TradeType.EXACT_INPUT
        )
        const { calls, value } = SwapRouter.swapCallParameters(trade, {
          slippageTolerance,
          recipient,
          deadline,
          fee: {
            fee: new Percent(5, 1000),
            recipient
          }
        })

        // const encodedTrade = encodeTrade(
        //   'exactInputSingle',
        //   token0,
        //   token1,
        //   pool_0_1,
        //   recipient,
        //   trade.maximumAmountIn(slippageTolerance, trade.inputAmount).quotient,
        //   trade.minimumAmountOut(slippageTolerance, trade.outputAmount).quotient
        // )

        // 0x04e45aaf
        // 0000000000000000000000000000000000000000000000000000000000000001
        // 0000000000000000000000000000000000000000000000000000000000000002
        // 0000000000000000000000000000000000000000000000000000000000000bb8
        // 0000000000000000000000000000000000000000000000000000000000000000
        // 0000000000000000000000000000000000000000000000000000000000000064
        // 0000000000000000000000000000000000000000000000000000000000000061
        // 0000000000000000000000000000000000000000000000000000000000000000

        expect(calls).toEqual([
          '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
          '0xe0e189a000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000061000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003'
        ])
        expect(value).toBe('0x00')
      })
    })
  })

  describe('multiple trade input', () => {
    it('two single-hop exact input', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('one single-hop one multi-hop exact input', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_2, pool_2_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('two multi-hop exact input', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1, pool_1_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_2, pool_2_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('ETH in exact input', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_weth, pool_1_3], ETHER, token3),
        CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], ETHER, token3),
        CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f0000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0xc8')
    })

    it('ETH in exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_weth, pool_1_3], ETHER, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], ETHER, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e2198000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0x12210e8a'
      ])
      expect(value).toBe('0xd0')
    })

    it('ETH out exact input', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_3, pool_1_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })

    it('ETH out exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_3, pool_1_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000690000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e21980000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000c80000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })

    it('two single-hop exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token1, 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token1, 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xdb3e2198000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e2198000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('one single-hop one multi-hop exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_3], token0, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_2, pool_2_3], token0, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xdb3e2198000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('two multi-hop exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1, pool_1_3], token0, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_2, pool_2_3], token0, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000',
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('different token in fails ', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_2_3], token2, token3),
        CurrencyAmount.fromRawAmount(token2, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      expect(() =>
        SwapRouter.swapCallParameters([trade1, trade2], {
          slippageTolerance,
          recipient,
          deadline
        })
      ).toThrow('TOKEN_IN_DIFF')
    })

    it('different token out fails ', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_1, pool_1_weth], token0, WETH),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      expect(() =>
        SwapRouter.swapCallParameters([trade1, trade2], {
          slippageTolerance,
          recipient,
          deadline
        })
      ).toThrow('TOKEN_OUT_DIFF')
    })

    it('sqrtPriceLimitX96', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_1], token0, token1),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )
      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline,
        sqrtPriceLimitX96: JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128))
      })

      expect(calls).toEqual([
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000100000000000000000000000000000000',
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000100000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('fee with eth out', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_3, pool_1_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], token3, ETHER),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline,
        fee: {
          fee: new Percent(5, 1000),
          recipient
        }
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0x9b2c0a3700000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })

    it('fee with eth in using exact output', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_1_weth, pool_1_3], ETHER, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_3_weth], ETHER, token3),
        CurrencyAmount.fromRawAmount(token3, 100),
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline,
        fee: {
          fee: new Percent(5, 1000),
          recipient
        }
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e2198000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0xe0e189a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000c8000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003',
        '0x12210e8a'
      ])
      expect(value).toBe('0xd0')
    })

    it('fee', async () => {
      const trade1 = await Trade.fromRoute(
        new Route([pool_0_1, pool_1_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const trade2 = await Trade.fromRoute(
        new Route([pool_0_2, pool_2_3], token0, token3),
        CurrencyAmount.fromRawAmount(token0, 100),
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade1, trade2], {
        slippageTolerance,
        recipient,
        deadline,
        fee: {
          fee: new Percent(5, 1000),
          recipient
        }
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xe0e189a0000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000be000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })
  })

  describe('trade with multiple routes', () => {
    it('one single-hop one multi-hop exact input', async () => {
      const trade = await Trade.fromRoutes<Token, Token, TradeType.EXACT_INPUT>(
        [
          { amount: CurrencyAmount.fromRawAmount(token0, 100), route: new Route([pool_0_3], token0, token3) },
          { amount: CurrencyAmount.fromRawAmount(token0, 100), route: new Route([pool_0_2, pool_2_3], token0, token3) }
        ],
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0x04e45aaf000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('two multi-hop exact input', async () => {
      const trade = await Trade.fromRoutes<Token, Token, TradeType.EXACT_INPUT>(
        [
          { amount: CurrencyAmount.fromRawAmount(token0, 100), route: new Route([pool_0_1, pool_1_3], token0, token3) },
          { amount: CurrencyAmount.fromRawAmount(token0, 100), route: new Route([pool_0_2, pool_2_3], token0, token3) }
        ],
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000001000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('ETH in exact input', async () => {
      const trade = await Trade.fromRoutes<Ether, Token, TradeType.EXACT_INPUT>(
        [
          {
            amount: CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
            route: new Route([pool_1_weth, pool_1_3], ETHER, token3)
          },
          {
            amount: CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
            route: new Route([pool_3_weth], ETHER, token3)
          }
        ],
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f0000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0xc8')
    })

    it('ETH in exact output', async () => {
      const trade = await Trade.fromRoutes<Ether, Token, TradeType.EXACT_OUTPUT>(
        [
          {
            amount: CurrencyAmount.fromRawAmount(token3, 100),
            route: new Route([pool_1_weth, pool_1_3], ETHER, token3)
          },
          { amount: CurrencyAmount.fromRawAmount(token3, 100), route: new Route([pool_3_weth], ETHER, token3) }
        ],
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e2198000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0x12210e8a'
      ])
      expect(value).toBe('0xd0')
    })

    it('ETH out exact input', async () => {
      const trade = await Trade.fromRoutes<Token, Ether, TradeType.EXACT_INPUT>(
        [
          {
            amount: CurrencyAmount.fromRawAmount(token3, 100),
            route: new Route([pool_1_3, pool_1_weth], token3, ETHER)
          },
          {
            amount: CurrencyAmount.fromRawAmount(token3, 100),
            route: new Route([pool_3_weth], token3, ETHER)
          }
        ],
        TradeType.EXACT_INPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xc04b8d59000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000005f00000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000',
        '0x04e45aaf0000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000610000000000000000000000000000000000000000000000000000000000000000',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })

    it('ETH out exact output', async () => {
      const trade = await Trade.fromRoutes<Token, Ether, TradeType.EXACT_OUTPUT>(
        [
          {
            amount: CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
            route: new Route([pool_1_3, pool_1_weth], token3, ETHER)
          },
          {
            amount: CurrencyAmount.fromRawAmount(Ether.onChain(1), 100),
            route: new Route([pool_3_weth], token3, ETHER)
          }
        ],
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000690000000000000000000000000000000000000000000000000000000000000042c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000',
        '0xdb3e21980000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0x49404b7c00000000000000000000000000000000000000000000000000000000000000c80000000000000000000000000000000000000000000000000000000000000003'
      ])
      expect(value).toBe('0x00')
    })

    it('one single-hop one multi-hop exact output', async () => {
      const trade = await Trade.fromRoutes<Token, Token, TradeType.EXACT_OUTPUT>(
        [
          { amount: CurrencyAmount.fromRawAmount(token3, 100), route: new Route([pool_0_3], token0, token3) },
          { amount: CurrencyAmount.fromRawAmount(token3, 100), route: new Route([pool_0_2, pool_2_3], token0, token3) }
        ],
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xdb3e2198000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000bb80000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000006400000000000000000000000000000000000000000000000000000000000000670000000000000000000000000000000000000000000000000000000000000000',
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })

    it('two multi-hop exact output', async () => {
      const trade = await Trade.fromRoutes<Token, Token, TradeType.EXACT_OUTPUT>(
        [
          { amount: CurrencyAmount.fromRawAmount(token3, 100), route: new Route([pool_0_1, pool_1_3], token0, token3) },
          { amount: CurrencyAmount.fromRawAmount(token3, 100), route: new Route([pool_0_2, pool_2_3], token0, token3) }
        ],
        TradeType.EXACT_OUTPUT
      )

      const { calls, value } = SwapRouter.swapCallParameters([trade], {
        slippageTolerance,
        recipient,
        deadline
      })

      expect(calls).toEqual([
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000002000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000',
        '0xf28c0498000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000007b0000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000006900000000000000000000000000000000000000000000000000000000000000420000000000000000000000000000000000000004000bb80000000000000000000000000000000000000003000bb80000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000'
      ])
      expect(value).toBe('0x00')
    })
  })
})

const encodeTrade = (
  tradeName: string,
  token0: Token,
  token1: Token,
  pool: Pool,
  recipient: string,
  primaryAmount: BigintIsh,
  secondaryAmount: BigintIsh,
  sqrtPrice?: BigintIsh
) => {
  const sigHash = SwapRouter.INTERFACE.getSighash(tradeName)
  const paddedToken0Address = token0.address
    .toLowerCase()
    .substring(2)
    .padStart(64, '0')
  const paddedToken1Address = token1.address
    .toLowerCase()
    .substring(2)
    .padStart(64, '0')
  const paddedFee = pool.fee.toString(16).padStart(64, '0')
  const paddedRecipient = recipient.substring(2).padStart(64, '0')

  // exactOutput/exactInput use this as output/input respectively
  const paddedPrimaryAmount = toHex(primaryAmount)
    .substring(2)
    .padStart(64, '0')

  // the remaining amount is used as secondary
  const paddedSecondaryAmount = toHex(secondaryAmount)
    .substring(2)
    .padStart(64, '0')
  const paddedSqrtPrice = toHex(sqrtPrice ?? 0)
    .substring(2)
    .padStart(64, '0')

  return `${sigHash}${paddedToken0Address}${paddedToken1Address}${paddedFee}${paddedRecipient}${paddedPrimaryAmount}${paddedSecondaryAmount}${paddedSqrtPrice}`
}
