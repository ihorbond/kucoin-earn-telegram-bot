require('dotenv').config();

import { Markup, Telegraf } from 'telegraf';
import axios from 'axios';

console.log("hello world")

type ProductStatus = "FULL" | "ONGOING" | "INTERESTING"

type Product = {
    product_id: string;
    category_text: string;
    name: string;
    apr: string;
    pol_apr: string;
    status: ProductStatus;
    duration: number;
}

type Currency = {
    currency: string;
    products: Product[];
  };

type KuCoinResponse = {
    data: Currency[];
  };

const availabilityMap: { [key in ProductStatus]: string } = {
    'FULL': 'Sold Out',
    'ONGOING': 'Available',
    'INTERESTING': 'Ended'
}

const coins = ["USDT", "USDC"]

const getKuCoinData = async () => {
    const kuCoinUrl = "https://www.kucoin.com/_pxapi/pool-staking/v3/products/currencies"
    const { data, status } = await axios.get<KuCoinResponse>(kuCoinUrl);

    console.log(status)

    const mapped = data.data
    .filter(coin => coins.includes(coin.currency))
    .map(coin => {
        const products = coin.products
        .filter(p => !isNaN(Number(p.product_id)))
        .map(p => {
            let term

            const { duration, apr, pol_apr, category_text, status } = p 

            switch(duration) {
                case -1: term = 'Fixed'; break;
                case 0: term = 'Flexible'; break;
                default: term = `${duration} days`
            }

            const totalAPR = Number(apr) + Number(pol_apr)
            // console.log(totalAPR)

            const res = {
                term,
                availability: availabilityMap[status],
                apr: `${totalAPR.toFixed(2)} %`,
                description: category_text,
            }
            return res
        })
        return {
            name: coin.currency,
            offers: products
        }
    })

    return mapped
}

getKuCoinData().then(console.log)

const bot = new Telegraf(process.env.TELEGRAM_BOT_API_KEY as string);

bot.start((ctx) => ctx.reply('Welcome'));

bot.command('kucoin', async (ctx) => {
    const data = await getKuCoinData()
    ctx.reply(JSON.stringify(data))
})

// bot.on('text', async (ctx) => {

//     //anything
//     const { chat } = ctx.message
//     console.log("id", chat.id)

//     ctx.reply(
//         'Select CEX',
//         Markup.inlineKeyboard([
//           Markup.button.callback('KuCoin', 'KuCoin'),
//         //   Markup.button.callback('Second option', 'second'),
//         ])
//       );

// });


bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));