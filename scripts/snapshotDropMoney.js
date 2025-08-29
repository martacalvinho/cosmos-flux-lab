import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import fs from 'fs';
import path from 'path';

const a = process.argv.includes('--append');

const RPC_ENDPOINT = 'https://rpc-kralum.neutron-1.neutron.org:443'; // Public Neutron RPC
const CORE_CONTRACT = 'neutron16m3hjh7l04kap086jgwthduma0r5l0wh8kc6kaqk92ge9n5aqvys9q6lxr';
const FILE_PATH = path.join('public', 'data', 'drop-money-exchange-history.json');

async function getExchangeRate() {
  try {
    const client = await CosmWasmClient.connect(RPC_ENDPOINT);
    const query = { exchange_rate: {} };
    const response = await client.queryContractSmart(CORE_CONTRACT, query);
    console.log('Successfully queried exchange rate:', response);
    return response;
  } catch (error) {
    console.error('Error querying smart contract:', error);
    return null;
  }
}

async function main() {
  const rate = await getExchangeRate();
  if (rate === null) {
    console.error('Failed to fetch exchange rate. Aborting snapshot.');
    return;
  }

  const newRecord = {
    id: 1,
    timestamp: new Date().toISOString(),
    exchange_rate: parseFloat(rate),
  };

  let data = [];
  if (a && fs.existsSync(FILE_PATH)) {
    const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
    if (fileContent) {
        data = JSON.parse(fileContent);
        newRecord.id = data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1;
    }
  }

  data.push(newRecord);

  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  console.log(`Successfully saved snapshot to ${FILE_PATH}`);
}

main();
