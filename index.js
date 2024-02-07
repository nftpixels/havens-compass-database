// Import necessary modules
const axios = require('axios');
const { Web3 } = require('web3');

// Load environment variables from .env file
require('dotenv').config(); 

// Fetch environment variables from .env file
const database_url = process.env.DATABASE_URL;
const skaleRPC = process.env.SKALE_RPC;
const myriaRPC = process.env.MYRIA_RPC;
const skaleContractAddress = process.env.SKALE_CONTRACT_ADDRESS;
const myriaContractAddress = process.env.MYRIA_CONTRACT_ADDRESS;

// API endpoint to remove roles
const bot_url = process.env.BOT_URL;

// Contract ABI defining the structure of the smart contract's functions
const contractABI = [
    {
        "constant": true,
        "inputs": [
            {
                "name": "_tokenId",
                "type": "uint256"
            }
        ],
        "name": "ownerOf",
        "outputs": [
            {
                "name": "",
                "type": "address"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// Set the interval for checking ownership and removing roles (in hours)
const intervalInHours = 6;

// Define the function to check ownership and remove roles
const checkOwnershipAndRemoveRoles = async () => {
    try {
        // Log a message indicating the start of fetching database data
        console.log('Fetching database data...');
        
        // Fetch the data from the database
        const response = await axios.get(database_url);
        
        // Log a message indicating the successful fetch of database data
        console.log('Database data fetched successfully.');

        // Extract user data list from the response
        const userDataList = response.data;

        // Iterate through each user's data
        for (const userData of userDataList) {
            try {
                // Destructure user data for easier access
                const { wallet_address, token_id, network, user_id } = userData;

                // Initialize variables for RPC endpoint and contract address based on the network
                let rpcEndpoint, contractAddress;

                if (network === 'SKALE') {
                    rpcEndpoint = skaleRPC;
                    contractAddress = skaleContractAddress;
                } else if (network === 'Myria') {
                    rpcEndpoint = myriaRPC;
                    contractAddress = myriaContractAddress;
                } else {
                    // Log an error message for unsupported networks and continue to the next user
                    console.log('Unsupported network:', network);
                    continue;
                }

                // Create a new Web3 instance and contract instance for the specific network
                const web3 = new Web3(rpcEndpoint);
                const contract = new web3.eth.Contract(contractABI, contractAddress);

                // Call the smart contract's ownerOf function to get the actual owner of the token
                const actualOwner = await contract.methods.ownerOf(token_id).call();

                // Check if the actual owner is different from the stored wallet address
                if (actualOwner.toLowerCase() !== wallet_address.toLowerCase()) {
                    // Log a message indicating that the user no longer owns the token
                    console.log(`${wallet_address} no longer owns token ${token_id}`);

                    // User no longer owns the token, send a request to removeRole API
                    await axios.post(bot_url, { userId: user_id });

                    // Log a message indicating the removal request
                    console.log(`removeRole request sent for user ${user_id}`);
                }
            } catch (loopError) {
                // Log an error message for any issues within the loop
                console.error('Error in the loop:', loopError.message);
            }
        }

        // Log a message indicating the successful completion of the task
        console.log('Task completed successfully.');

        console.log('Task will run again in 6 hours.');

        // Schedule the next execution after the specified interval (e.g., 24 hours)
        setTimeout(checkOwnershipAndRemoveRoles, intervalInHours * 60 * 60 * 1000);
    } catch (error) {
        // Log an error message for any issues in the main function
        console.error('Error checking ownership and removing roles:', error.message);

        // Retry the task even if there's an error, after the specified interval
        setTimeout(checkOwnershipAndRemoveRoles, intervalInHours * 60 * 60 * 1000);
    }
};

// Initial execution of the function
checkOwnershipAndRemoveRoles();
