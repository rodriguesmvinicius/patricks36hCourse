import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { network, deployments, getNamedAccounts, web3, ethers } from "hardhat"
import { assert, expect } from "chai"
import { developmentChains } from "../../helper-hardhat-config"
import {
    FundMe,
    FundMe__factory,
    MockV3Aggregator,
} from "../../typechain-types"
import { getAccount } from "../../utils/utils"
!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe: FundMe
          let mockV3Aggregator: MockV3Aggregator
          let deployer: SignerWithAddress
          beforeEach(async () => {
              if (!developmentChains.includes(network.name)) {
                  throw "You need to be on a development chain to run tests"
              }
              const accounts = await ethers.getSigners()
              deployer = accounts[0]

              if (network.name != "localhost")
                  await deployments.fixture(["all"])

              fundMe = await ethers.getContract("FundMe", deployer.address)
              console.log(fundMe.address)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer.address
              )
          })
          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })

          describe("fund", function () {
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Fails if you don't send enough ETH", async () => {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "You need to spend more ETH!"
                  )
              })
              // we could be even more precise here by making sure exactly $50 works
              // but this is good enough for now
              it("Updates the amount funded data structure", async () => {
                  const fundTx = await fundMe.fund({
                      value: ethers.utils.parseEther("1"),
                  })
                  await fundTx.wait(1)

                  console.log(`Fund Tx: ${fundTx.hash}`)
                  const response = await fundMe.getAmountFunded(
                      deployer.address
                  )
                  assert.equal(
                      response.toString(),
                      ethers.utils.parseEther("1").toString()
                  )
              })
              it("Adds funder to array of funders", async () => {
                  await fundMe.fund({ value: ethers.utils.parseEther("1") })
                  const funders = await fundMe.getFunders()
                  const response = await fundMe.getFunder(0)

                  assert(funders.includes(deployer.address))
              })
          })
          describe("withdraw", function () {
              it("gives a single funder all their ETH back", async () => {
                  // Arrange
                  const funder = await getAccount("funder")
                  await fundMe
                      .connect(funder)
                      .fund({ value: ethers.utils.parseEther("1") })

                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)

                  // Assert
                  assert.equal(endingFundMeBalance.toString(), "0")
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              it("gives multiple funders all their ETH back", async () => {
                  // Arrange
                  const funders = await getAccount("funders", 10)

                  for (const funder of funders) {
                      await fundMe
                          .connect(funder)
                          .fund({ value: ethers.utils.parseEther("1") })
                  }
                  // Act
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  const transactionResponse = await fundMe.withdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`GasCost: ${withdrawGasCost}`)
                  console.log(`GasUsed: ${gasUsed}`)
                  console.log(`GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(withdrawGasCost).toString()
                  )
                  await expect(fundMe.getFunder(0)).to.be.rejected
                  for (const funder of funders) {
                      ;(
                          await fundMe.getAmountFunded(funder.address)
                      ).toString(),
                          "0"
                  }
              })
              // this test is overloaded. Ideally we'd split it into multiple tests
              // but for simplicity we left it as one
              it("allows us to cheap withdraw with one funder", async () => {
                  // Arrange
                  const funder = await getAccount("funder")
                  await fundMe
                      .connect(funder)
                      .fund({ value: ethers.utils.parseEther("1") })

                  // Act
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`GasCost: ${withdrawGasCost}`)
                  console.log(`GasUsed: ${gasUsed}`)
                  console.log(`GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(withdrawGasCost).toString()
                  )
                  await expect(fundMe.getFunder(0)).to.be.rejected
                  ;(await fundMe.getAmountFunded(funder.address)).toString(),
                      "0"
              })
              it("allows us to cheap withdraw with multiple funders", async () => {
                  // Arrange
                  const funders = await getAccount("funders", 10)

                  for (const funder of funders) {
                      await fundMe
                          .connect(funder)
                          .fund({ value: ethers.utils.parseEther("1") })
                  }
                  // Act
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`GasCost: ${withdrawGasCost}`)
                  console.log(`GasUsed: ${gasUsed}`)
                  console.log(`GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer.address)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(withdrawGasCost).toString()
                  )
                  await expect(fundMe.getFunder(0)).to.be.rejected
                  for (const funder of funders) {
                      ;(
                          await fundMe.getAmountFunded(funder.address)
                      ).toString(),
                          "0"
                  }
              })
              it("only allows owner to withdraw", async () => {
                  // Arrange
                  const funders = await getAccount("funders", 10)
                  const malicious = funders[0]

                  for (const funder of funders) {
                      await fundMe
                          .connect(funder)
                          .fund({ value: ethers.utils.parseEther("1") })
                  }
                  // Act
                  try {
                      await fundMe.connect(malicious).cheaperWithdraw()
                  } catch (err: any) {
                      console.log(err.message)
                  }
                  await expect(
                      fundMe.connect(malicious).cheaperWithdraw()
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })
          })
      })
