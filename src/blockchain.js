const CryptoJS = require('crypto-js')

const { hexToBinary } = require('./util');
class Block {

  constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.hash = hash;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }

}

const BLOCK_GENERATIONS_INTERVAL = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

const genesisBlock = new Block(
  0, '816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7', null, 1465154705, 'my genesis block!!', 0, 0
)

const blockchain = [genesisBlock];

exports.getBlockchain = () => blockchain;

const getLatestBlock = () => blockchain[blockchain.length - 1] ;

const calculateHash = (index, previousHash, timestamp, data, difficulty, nonce) => {
  return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
}

const calculateHashForBlock = (block) => {
  return calculateHash(block.index, block.previousHash, block.timestamp, block.data)
}

const isValidNewBlock = (newBlock, previousBlock) => {
  console.log(newBlock, previousBlock);

  if(previousBlock.index + 1 !== newBlock.index) {
    console.log('invalid index');
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    console.log('invalid previoushash');
    return false;
  } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
    console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
    console.log('invalid hash: ' + calculateHash(newBlock) + ' ' + newBlock.hash);
    return false;
  }
  return true;
}

const isValidBlockStructure = (block) => {
  return typeof block.index === 'number'
        && typeof block.hash === 'string'
        && typeof block.previousHash === 'string'
        && typeof block.timestamp === 'number'
        && typeof block.data === 'string'
};

const addBlock = (newBlock) => {
  if (isValidNewBlock(newBlock, getLatestBlock())) {
    blockchain.push(newBlock);
  }
}

exports.generateNextBlock = (blockData) => {
  const previousBlock = getLatestBlock();
  const nextIndex = previousBlock.index + 1;
  const nextTimestamp = new Date().getTime() / 1000;
  const nextHash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
  const newBlock = new Block(nextIndex, nextHash, previousBlock.hash, nextTimestamp, blockData);
  addBlock(newBlock);
  return newBlock;
}

const isValidChain = (blockchainToValid) => {
  const isValidGenesis = (block) => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock)
  }
  
  if(!isValidGenesis(blockchainToValid[0])) {
    return false;
  }

  for (let i = 1; i<blockchainToValid.length; i++) {
    if(!isValidNewBlock(blockchainToValid[i], blockchainToValid[i - 1])) {
      return false
    }
  }

  return true;
}

const replaceChain = (newBlocks) => {
  if (isValidChain(newBlocks) && newBlocks.length > getBlockchain.length) {
    console.log('Received blockchain is valid. Replacing current blockchain with received blockcahin');
    blockchain = newBlocks;
    broadcastLatest();
  } else {
    console.log('Received blockchain invalid');
  }
};

const hashMatchesDifficulty = (hash, difficulty) => {
  const hashInBinary = hexToBinary(hash);
  const requiredPrefix = '0'.repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
}

const findBlock = (index, previousHash, timestamp, data, difficulty) => {
  let nonce = 0;
  while (true) {
    const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
    if(hashMatchesDifficulty(hash, difficulty)) {
      return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
    }
    nonce++;
  }
}

const getDifficulty = (aBlockchain) => {
  const latestBlock = aBlockchain[blockchain.length - 1];
  if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.index !== 0) {
    return getAdjustedDifficulty(latestBlock, aBlockchain)
  } else {
    return latestBlock.difficulty;
  }
};

const getAdjustedDifficulty = (latestBlock, aBlockchain) => {
  const prevAdjustmentBlock = aBlockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected = BLOCK_GENERATIONS_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected /2) {
    return prevAdjustmentBlock.difficulty + 1;

  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;

  } else { 
    return prevAdjustmentBlock.difficulty;
  }
};

const isValidTimestamp = (newBlock, previousBlock) => {
  return ( previousBlock.timestamp - 60 < newBlock.timestamp )
      && newBlock.timestamp  - 60 < getCurrentTimestamp();
}

