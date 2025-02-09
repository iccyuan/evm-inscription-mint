import { ethers } from "ethers";
import config from "./config.mjs";
import { createInterface } from 'readline';
// 使用chalk库来设置文本颜色
import chalk from 'chalk';

// 连接到结点
const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

// 创建钱包
const wallet = new ethers.Wallet(config.privateKey.trim(), provider);

// 转成16进制
const convertToHexa = (str = '') => {
  const res = [];
  const { length: len } = str;
  for (let n = 0, l = len; n < l; n++) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    res.push(hex);
  };
  return `0x${res.join('')}`;
}

// 获取当前账户的 nonce
async function getCurrentNonce(wallet) {
  try {
    const nonce = await wallet.getTransactionCount("pending");
    console.log("Nonce:", nonce);
    return nonce;
  } catch (error) {
    console.error("Error fetching nonce:", error.message);
    throw error;
  }
}

// 获取当前主网 gas 价格
async function getGasPrice() {
  const gasPrice = await provider.getGasPrice();
  return gasPrice;
}

// 获取链上实时 gasLimit
async function getGasLimit(hexData, address) {
  const gasLimit = await provider.estimateGas({
    to: address,
    value: ethers.utils.parseEther("0"),
    data: hexData,
  });

  return gasLimit.toNumber();
}

// 转账交易
async function sendTransaction(nonce) {
  let hexData = config.tokenDataHex
  if (config.tokenJson !== '') {
    hexData = convertToHexa(config.tokenJson.trim());
  }
  // 获取实时 gasPrice
  const currentGasPrice = await getGasPrice();
  // 在当前 gasPrice 上增加 一定倍数
  const gasMultiple = parseInt(String(config.increaseGas * 100))
  const increasedGasPrice = currentGasPrice.div(100).mul(gasMultiple);
  // 获取钱包地址
  let address = await wallet.getAddress();
  if (config.receiveAddress !== "") {
    address = config.receiveAddress;
  }
  // 获取当前 gasLimit 限制
  const gasLimit = await getGasLimit(hexData, address);
  // 付费金额
  const payPrice = config.payPrice

  console.log(chalk.green("正在打铭文数据的16进制数据", hexData))

  const transaction = {
    to: address,
    // 替换为你要转账的金额
    value: ethers.utils.parseEther(payPrice),
    // 十六进制数据
    data: hexData,
    // 设置 nonce
    nonce: nonce,
    // 设置 gas 价格
    gasPrice: increasedGasPrice,
    // 限制gasLimit，根据当前网络转账的设置，不知道设置多少的去区块浏览器看别人转账成功的是多少
    gasLimit: gasLimit,
  };

  try {
    const tx = await wallet.sendTransaction(transaction);
    console.log(`Transaction with nonce ${nonce} hash:`, tx.hash);
  } catch (error) {
    console.error(`Error in transaction with nonce ${nonce}:`, error.message);
  }
}

// 查询钱包
async function checkWalletBalance() {
  const balance = await wallet.getBalance();
  console.log(chalk.green("钱包余额:", ethers.utils.formatEther(balance)));
  return balance;
}

// 随机sleep时间
async function sleep() {
  const ms = Math.floor((Math.random() + 0.3) * config.sleepTime);
  console.log("等待:", ms);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 发送多次交易
async function sendTransactions() {
  const currentNonce = await getCurrentNonce(wallet);

  for (let i = 0; i < config.repeatCount; i++) {
    //const gasPrice = await getGasPrice();
    await sendTransaction(currentNonce + i);
    await sleep()
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const main = async () => {
  console.log(chalk.red('===功能选择==='));
  console.log(chalk.cyan('可用功能(输入数字): 1.检查钱包余额, 2.铭文铸造'));

  for await (const line of rl) {
    switch (line) {
      case '1':
        await checkWalletBalance();
        break;
      case '2':
        await sendTransactions();
        break;
      default:
        console.log("未知命令");
    }
  }
};

main().catch(console.error);