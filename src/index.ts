require('dotenv').config();

import { Markup, Telegraf } from 'telegraf';
import axios from 'axios';

type ProductStatus = "FULL" | "ONGOING" | "INTERESTING"

type Product = {
    product_id: string
    category_text: string
    name: string
    apr: string
    pol_apr: string
    status: ProductStatus
    duration: number
}

type Currency = {
    currency: string
    products: Product[]
  };

type KuCoinResponse = {
    data: Currency[];
  };

type Offer = {
    term: string
    isAvailable: boolean
    availability: string
    apr: number
    description: string
    subUrl: string
}

type CoinOffer = {
    name: string
    offers: Offer[]
}


const availabilityMap: { [key in ProductStatus]: string } = {
    'FULL': 'Sold Out',
    'ONGOING': 'Available',
    'INTERESTING': 'Ended'
}

const coins = ["USDT", "USDC", "SOL", "BNB"]

const getKuCoinData = async (): Promise<CoinOffer[]> => {
    const kuCoinUrl = "https://www.kucoin.com/_pxapi/pool-staking/v3/products/currencies"
    const { data, status } = await axios.get<KuCoinResponse>(kuCoinUrl);

    console.log(status)

    const mapped = data.data
    .filter(coin => coins.includes(coin.currency))
    .map(coin => {
        const offers = coin.products
        .filter(p => !isNaN(Number(p.product_id)))
        .map(p => {
            let term

            const { duration, apr, pol_apr, category_text, status } = p 

            switch(duration) {
                case -1: term = 'Fixed'; break;
                case 0: term = 'Flexible'; break;
                default: term = `${duration} days`
            }
            // console.log(totalAPR)

            const res = {
                term,
                isAvailable: status === 'ONGOING',
                availability: availabilityMap[status],
                apr: Number(apr) + Number(pol_apr),
                description: category_text,
                subUrl: 'https://www.kucoin.com/earn'
            } as Offer

            return res
        })

        return {
            name: coin.currency,
            offers: offers.sort((a, b) => b.apr - a.apr)
        }
    })

    return mapped
}

const formatReply = (data: CoinOffer[]): string => {
    let text = ''

    data.forEach(coin => {
        text += `\n\r<b>${coin.name}</b>\r\n`
        coin.offers.forEach((offer, idx) => {
            const { apr, term, description, availability, isAvailable, subUrl } = offer
            const subLink = isAvailable ? `<a href='${subUrl}'>[Sub]</a>` : ''

            text += `${idx+1} | ${apr.toFixed(2)} % | ${term} | ${description} | ${availability} | ${subLink} \r\n`
        })
    })

    return text
}

// getKuCoinData().then(console.log)

const bot = new Telegraf(process.env.TELEGRAM_BOT_API_KEY as string);

bot.start((ctx) => ctx.reply('Welcome'));

bot.command('kucoin', async (ctx) => {
    const data = await getKuCoinData()
    
    ctx.replyWithHTML(formatReply(data))
})

bot.action('KuCoin', async (ctx) => {
    const data = await getKuCoinData()
    
    ctx.replyWithHTML(formatReply(data))
})

bot.on('text', async (ctx) => {

    const { chat } = ctx.message
    console.log("id", chat.id)

    ctx.reply(
        'Select CEX to see the rates',
        Markup.inlineKeyboard([
          Markup.button.callback('KuCoin', 'KuCoin'),
        ])
      );
});


bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));