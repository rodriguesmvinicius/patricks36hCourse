import { networkConfig, developmentChains } from "../helper-hardhat-config"

export async function getAccount(accountType: string, qtty: number = 0) {
    const { ethers, network } = require("hardhat")
    const accounts: any[] = await ethers.getSigners()

    if (accountType.toLowerCase() == "owner") return accounts[0]
    else if (accountType.toLowerCase() == "funder") {
        return accounts[1]
    } else if (accountType.toLowerCase() == "funders") {
        let funders: any[] = []
        if (!developmentChains.includes(network.name)) {
            console.log("No funders key on live network")
            return funders
        }

        if (qtty >= 1) {
            for (let idx = 0; idx < qtty; idx++) {
                funders.push(accounts[idx + 1])
            }
        } else funders.push(accounts[1])
        return funders
    }
}
