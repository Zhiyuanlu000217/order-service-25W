require('dotenv').config();
const express = require('express');
const { ServiceBusClient } = require('@azure/service-bus');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3050;

// Azure Service Bus configuration
const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = process.env.AZURE_SERVICE_BUS_QUEUE_NAME;

// Create a Service Bus client
const sbClient = new ServiceBusClient(connectionString);

// Create a sender for the queue
const sender = sbClient.createSender(queueName);

// Middleware to parse JSON bodies
app.use(express.json());

// Order endpoint
app.post('/order', async (req, res) => {
    const { items } = req.body;

    // Validate request body
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            error: 'Invalid request: items array is required and must not be empty'
        });
    }

    // Validate each item
    for (const item of items) {
        if (!item.name || !item.sku || !item.quantity) {
            return res.status(400).json({
                error: 'Invalid request: each item must have name, sku, and quantity'
            });
        }
    }

    try {
        // Create enhanced order object with UUID and timestamp
        const enhancedOrder = {
            ...req.body,
            orderId: uuidv4(),
            timestamp: new Date().toISOString()
        };

        // Log the request
        console.log('Received order:', JSON.stringify(enhancedOrder, null, 2));

        // Send message to Azure Service Bus
        await sender.sendMessages({
            body: enhancedOrder
        });

        console.log('Order sent to Azure Service Bus successfully');

        // Return success response
        res.status(200).json({
            message: 'Order received and sent to queue successfully',
            order: enhancedOrder
        });
    } catch (error) {
        console.error('Error sending message to Azure Service Bus:', error);
        res.status(500).json({
            error: 'Failed to process order'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 