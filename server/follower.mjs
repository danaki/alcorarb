import { intializeNodeContainer } from "./container.mjs"


var container = await intializeNodeContainer('follower')

const {
  fetch,
  logger,
  reportLiveness,
  stateRef,
  waxSignEndpoint
} = container.cradle

const sr = await stateRef
let states = {}
sr.on('value', async (snapshot) => {
  var s = snapshot.val()
  states = s == null ? {} : s
})

let currentBlock = 0
// history to look transactions for in case of overrun
const txHistory = []
const txHistorySize = 1000 // ~200 tx per block, ~2 blocks per sec

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function lastBlock() {
  return fetch(waxSignEndpoint + '/v1/chain/get_info')
    .then(function(response) {
      return response.json()
    }).then(function(json) {
      return json['head_block_num']
    }).catch(function(err) {
      console.log(err)
      reportLiveness(err)
    })
}

async function realGetBlockTransactions(b, cb) {
  let timer = null
  let timeout = 5 * 1000

  return await Promise.race([
    fetch(waxSignEndpoint + '/v1/chain/get_block', {
        method: 'post',
        body: JSON.stringify({block_num_or_id: b}),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(function(response) {
        return response.json()
      })
      .then(function(data) {
        clearTimeout(timer)
        return cb(data)
      }).catch(function(err) {
        clearTimeout(timer)
        console.log(err)
        reportLiveness(err)
      }),
    new Promise((_, reject) => {
        timer = setTimeout(() => {
          let err = new Error(`Timeout ${timeout} on block: ${b}`)
          console.log(err)
          reportLiveness(err)
          reject(err)
        }, timeout)
      })
    ])
}

async function getBlockTransactions(b, cb) {
  while (true) {
    try {
      await realGetBlockTransactions(b, cb)
      break
    } catch (err) {
      console.log("Request time out", err)
      reportLiveness(err)
    }
  }
}

while (true) {
  let newCurrentBlock = await lastBlock()
  if (newCurrentBlock > currentBlock) {
    if (currentBlock == 0) {
      currentBlock = newCurrentBlock
    }

    let b = currentBlock
    while (b <= newCurrentBlock) {
      try {
        getBlockTransactions(b, (block) => {
          logger.info(`Block: ${block['block_num']}, processed tx num: ${block['transactions'].length}`)

          //// jq.run('.[] | .trx | select(type == "object") | select(.transaction.actions | .[] | select(.authorization[].actor == "nongminaaaa1"))', block['transactions'], { input: 'json' })
          //// .then(console.log)

          // let interesting = block['transactions']
          //   .filter(tx => tx['trx'].constructor == Object
          //     && tx['trx']['transaction']['actions'].constructor == Array
          //     && tx['trx']['transaction']['actions'].find(
          //       act => act['authorization'].find(auth => auth['actor'] == account)
          //         || (act['data'].hasOwnProperty('to') && (act['data']['to'] == account))
          //         || (act['data'].hasOwnProperty('from') && (act['data']['from'] == account))
          //     )
          //   )
          // interesting.forEach(tx => console.log(tx['trx']['id'], util.inspect(tx['trx']['transaction'], false, null, false /* enable colors */)))

          const blockTxs = block['transactions'].map(tx => tx['trx']['id'])
          for (const txid of blockTxs) {
            logger.debug(`Seen tx ${txid}`)
            txHistory.unshift(txid)
            if (txHistory.length > txHistorySize) {
              txHistory.pop()
            }
          }

          var unconfirmed = Object.fromEntries(Object.entries(states)
            .filter(([id, st]) => txHistory.includes(st.txid) && (st.state == 'unconfirmed')))

          if (Object.keys(unconfirmed).length > 0) {
            for (const [id, st] of Object.entries(states)) {
              logger.info(`Confirmed tx ${st.txid}`)
              sr.child(id).update({
                state: 'confirmed',
                updatedAt: Date.now()
              })
            }
          }
        })
        b++
      } catch (err) {
        console.log(err)
        reportLiveness(err)
        await delay(100)
      }
    }

    currentBlock = b
  }

  reportLiveness()
  await delay(500)
}
