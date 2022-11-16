// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
// Imports
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./PriceConverter.sol";
import "hardhat/console.sol";
//Error Codes
error FundMe__NotOwner();

contract FundMe {
    //Type Declarations
    using PriceConverter for uint256;
    using Strings for uint256;
    //State Variables
    mapping(address => uint256) private s_addressToAmountFunded;
    address[] private s_funders;
    address private immutable i_owner;
    AggregatorV3Interface private s_priceFeed;

    modifier onlyOwner() {
        // require(msg.sender == owner);
        if (msg.sender != i_owner) revert FundMe__NotOwner();
        _;
    }

    constructor(address _priceFeed) {
        s_priceFeed = AggregatorV3Interface(_priceFeed);
        i_owner = msg.sender;
    }

    /// @notice Allows to see the contract's owner address.
    function getOwner() external view returns (address) {
        return i_owner;
    }

    /// @notice Allows to see the list of current funders
    function getFunders() external view returns (address[] memory) {
        return s_funders;
    }

    /// @notice Allows to see the list of current funders
    function getFunder(uint256 index) external view returns (address) {
        return s_funders[index];
    }

    /// @notice Allows to see the current price feed address been used
    function getPriceFeed() external view returns (address) {
        return address(s_priceFeed);
    }

    /// @notice Allows to see the current price feed address been used
    function getAmountFunded(address funder) external view returns (uint256) {
        return s_addressToAmountFunded[funder];
    }

    /// @notice Allows a address to send funds to the contract.
    /// @dev Funds sent must be equal or higher than the minimum
    function fund() public payable {
        uint256 minimumUSD = 50 * 10**18;
        //console.log(
        //    string(
        //        abi.encodePacked(
        //            "Received value: ",
        //            msg.value.getConversionRate(s_priceFeed).toString()
        //        )
        //    )
        //);
        require(
            msg.value.getConversionRate(s_priceFeed) >= minimumUSD,
            "You need to spend more ETH!"
        );
        // require(PriceConverter.getConversionRate(msg.value) >= minimumUSD, "You need to spend more ETH!");
        s_addressToAmountFunded[msg.sender] += msg.value;
        if (!contains(s_funders, msg.sender)) s_funders.push(msg.sender);
    }

    ///@notice Allows the withdrawn of funds holded by this contract
    ///@dev only owner can withdrawn
    function withdraw() public payable onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
    }

    function cheaperWithdraw() public payable onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
        address[] memory _funders = s_funders;
        // mappings can't be in memory, sorry!
        for (
            uint256 funderIndex = 0;
            funderIndex < _funders.length;
            funderIndex++
        ) {
            address funder = _funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);
    }

    function contains(address[] memory addressList, address value)
        private
        returns (bool)
    {
        for (
            uint256 addrIndex = 0;
            addrIndex < addressList.length;
            addrIndex++
        ) {
            if (addressList[addrIndex] == value) return true;
        }

        return false;
    }
}
