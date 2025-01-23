const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjl69.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db('HuntifyDB');
    const productsCollection = database.collection('products');
    const usersCollection = database.collection('users'); 





    app.get('/products', async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });

    // Upvote a product
    app.post('/products/vote/:productName', async (req, res) => {
      const { productName } = req.params;
      const { userEmail } = req.body;

      const product = await productsCollection.findOne({ name: productName });

      if (!product) {
        return res.status(404).send({ message: 'Product not found' });
      }

     
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
    });

    
    app.get('/users/:email', async (req, res) => {
      const { email } = req.params;

      const user = await usersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }

      res.send({
        email: user.email,
        subscriptionStatus: user.isSubscribed || false,
      });
    });

   
    app.post('/subscribe', async (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).send({ message: 'Email is required' });
      }

      const user = await usersCollection.findOne({ email });

      if (user && user.isSubscribed) {
        return res.status(400).send({ message: 'User is already subscribed' });
      }

      const result = await usersCollection.updateOne(
        { email },
        { $set: { isSubscribed: true } },
        { upsert: true } 
      );

      res.send({ message: 'Subscription successful', result });
    });

    console.log('Connected to MongoDB!');
  } finally {
    // Uncomment this line if you want to close the connection after the process ends
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
