require('dotenv').config()
const { Kafka } = require('kafkajs')
const { Pool } = require('pg')
const appPromise = require('./middlewares/configprovider').appPromise
const logProvider = require('./middlewares/logprovider');

appPromise.then(function(){
    const kafka = new Kafka({
        clientId: 'transaction-client',
        brokers: [process.env.KAFKA_SERVER],
    })
     
    const pool = new Pool({
        user: process.env.DB_POSTGRES_USER,
        password: process.env.DB_POSTGRES_PASSWORD,
        database: process.env.DB_POSTGRES_DATABASE_ACCOUNT,
        host: process.env.DB_POSTGRES_HOST,
        port: process.env.DB_POSTGRES_PORT,
        ssl: {
            rejectUnauthorized: !Boolean(process.env.DB_POSTGRES_REJECTUNAUTHORIZED),
        },
        dialect: process.env.DB_POSTGRES_DIALECT,
    })
     
     
    kafka_consumer()
     
    async function kafka_consumer() {

        logProvider.info('Start KafkaConsumer in ProcessAccount.js')

        const consumer = kafka.consumer({ groupId: 'account-subscription', allowAutoTopicCreation: true })
        await consumer.connect()
        await consumer.subscribe({ topic: 'transaction-topic', fromBeginning: true })
        await consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                console.log({ value: message.value.toString() })
                
                var jsonObj = JSON.parse(message.value.toString())
                var amountNew = 0
                if (jsonObj.type === 'withdrawal') {
                    amountNew = jsonObj.amount * (-1)
                } else {
                    amountNew = jsonObj.amount
                }
                await pool.query('UPDATE account SET amount = amount + $1 WHERE id = $2', [amountNew, jsonObj.accountId], async (err, result) => {
                    if (err) {
                        return console.error('Error executing query', err.stack)
                    }
                    console.log(`Account modified with accountId: 1`);
                    await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }])
                    console.log(`Commit message with accountId: 1`);
                })
                // await consumer.commitOffsets([{ topic, partition, offset: (Number(message.offset) + 1).toString() }])
            },
        })
    }
});

