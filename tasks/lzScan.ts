import {createClient} from '@layerzerolabs/scan-client';






export const lzScan = async function(taskArgs: any, hre: any) {
    // Initialize a client with the desired environment
    const client = createClient('testnet');

    // Get a list of messages by transaction hash
    const {messages} = await client.getMessagesBySrcTxHash(
    taskArgs.hash,
    );


    console.log(messages)
}
