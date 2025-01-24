const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI and Client Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjl69.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Database Connection
async function run() {
  try {
    await client.connect();
    const database = client.db('HuntifyDB');
    const productsCollection = database.collection('products');
    const usersCollection = database.collection('users');

    


    app.get('/products', async (req, res) => {
      const products = productsCollection.find();
      const result = await products.toArray();
      res.send(result);
    });


    app.get('/products/:email', async (req, res) => {
      const { email } = req.params;
      const query = { ownerMail: email }; 
      const product = productsCollection.find(query); 
      const result = await product.toArray(); 
      res.send(result);
    });
    

    app.post('/products', async (req, res) => {
      const product = req.body;
      product.timestamp = new Date(); // Add timestamp
      try {
        const result = await productsCollection.insertOne(product);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).send({ message: 'Failed to save product' });
      }
    });

    // Upvote a Product
    app.post('/products/vote/:productName', async (req, res) => {
      try {
        const { productName } = req.params;
        const { userEmail } = req.body;

  
        if (!userEmail) return res.status(400).send({ message: 'User email is required' });

        const product = await productsCollection.findOne({ name: productName });
        if (!product) return res.status(404).send({ message: 'Product not found' });

     
        if (product.votedUsers && product.votedUsers.includes(userEmail)) {
          return res.status(400).send({ message: 'User has already voted' });
        }


        const updatedProduct = await productsCollection.updateOne(
          { name: productName },
          {
            $inc: { votes: 1 },
            $push: { votedUsers: userEmail },
          }
        );
        res.send({ message: 'Vote added successfully', updatedProduct });
      } catch (error) {
        res.status(500).send({ message: 'Internal server error', error: error.message });
      }
    });

   
    app.get('/users/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: 'User not found' });

        res.send({
          email: user.email,
          subscriptionStatus: user.isSubscribed || false,
        });
      } catch (error) {
        res.status(500).send({ message: 'Internal server error', error: error.message });
      }
    });

    // Subscribe a User
    app.post('/subscribe', async (req, res) => {
      try {
        const { email } = req.body;
        if (!email) return res.status(400).send({ message: 'Email is required' });

        const user = await usersCollection.findOne({ email });
        if (user && user.isSubscribed) {
          return res.status(400).send({ message: 'User is already subscribed' });
        }

        const result = await usersCollection.updateOne(
          { email },
          { $set: { isSubscribed: true } },
          { upsert: true } // Create user if not exists
        );
        res.send({ message: 'Subscription successful', result });
      } catch (error) {
        res.status(500).send({ message: 'Internal server error', error: error.message });
      }
    });

    
    app.get('/users', async (req, res) => {
      try {
        const { page = 1, limit = 10 } = req.query; // Default: page 1, 10 users per page
        const skip = (page - 1) * limit;
        const users = await usersCollection.find().skip(skip).limit(parseInt(limit)).toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: 'Internal server error', error: error.message });
      }
    });






    
  
    

    

    console.log('Pinged your deployment. You successfully connected to MongoDB!');
  } finally {
    // Uncomment this line to close the client connection when app stops
    // await client.close();
  }
}

run().catch(console.dir);

// Base Route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
