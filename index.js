const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    // await client.connect();
    const database = client.db("HuntifyDB");
    const productsCollection = database.collection("products");
    const usersCollection = database.collection("users");
    const couponCollection = database.collection("coupons");
    const reviewCollection = database.collection("reviews");
    const newsLetterCollection = database.collection("newsLetters");
    const helpCollection = database.collection("help");






    // jwt related apis
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h'
      });
      res.send({token});
    })


    app.post('/helps', async(req, res) => {
      const helpInfo = req.body;
      const result = await helpCollection.insertOne(helpInfo);
      res.send(result);
    })



    // newsletter related apis 
    app.post('/newsletter', async(req, res) => {
      const newsletter = req.body;
      const result = await newsLetterCollection.insertOne(newsletter);

      res.send(result);
    })

    



// Reviews related APIs
app.post('/reviews', async (req, res) => {
    try {
        const { productId, userName, userImage, description, rating } = req.body;

        // Validate required fields
        if (!productId || !userName || !userImage || !description || !rating) {
            return res.status(400).json({ message: "All fields are required!" });
        }

        // Ensure rating is a valid number
        if (typeof rating !== "number" || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be a number between 1 and 5." });
        }

        // Create a new review object
        const newReview = {
            productId,
            userName,
            userImage,
            description,
            rating,
            createdAt: new Date(),
        };

        // Insert the review into the reviews collection
        const result = await reviewCollection.insertOne(newReview);

        if (result.insertedId) {
            res.status(201).json({
                message: "Review added successfully!",
                reviewId: result.insertedId,
            });
        } else {
            res.status(500).json({ message: "Failed to add review. Please try again later." });
        }
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "An error occurred while adding the review.", error });
    }
});

app.get("/reviews", async (req, res) => {
  const reviews = reviewCollection.find();
  const result = await reviews.toArray();
  res.send(result);
});
app.get("/review/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the ID format
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid product ID format" });
    }

    const query = { productId: id };
    const reviewCursor = reviewCollection.find(query);
    const reviews = await reviewCursor.toArray();

    res.status(200).send(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ error: "An error occurred while fetching reviews" });
  }
});



    // coupons relate apis 
    app.post("/coupons", async (req, res) => {
      const coupon = req.body;
      try {
        if (!coupon.couponCode || !coupon.expiryDate || !coupon.description || !coupon.discountAmount) {
          return res.status(400).send({ error: "All fields are required" });
        }
        const result = await couponCollection.insertOne(coupon);
        res.status(201).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to add coupon" });
      }
    });
    
    app.get("/coupons", async (req, res) => {
      const coupons = couponCollection.find();
      const result = await coupons.toArray();
      res.send(result);
    });
    app.delete("/coupons/:id", async (req, res) => {
      const id = req.params.id;
    
      try {
        // Ensure the ID is valid for MongoDB ObjectId
        const objectId = new ObjectId(id);
    
        // Delete the coupon with the specified ID
        const result = await couponCollection.deleteOne({ _id: objectId });
    
        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Coupon deleted successfully" });
        } else {
          res.status(404).send({ error: "Coupon not found" });
        }
      } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).send({ error: "Failed to delete coupon" });
      }
    });
    





    


    app.get("/products", async (req, res) => {
      const search = req.query.search; // Get the search keyword from query parameters
    
      // Define the query condition
      const query = search
        ? { tags: { $in: [new RegExp(search, "i")] } } // Search tags based on the keyword (case-insensitive)
        : {}; // Otherwise, retrieve all products
    
      try {
        const products = productsCollection.find(query); // Fetch products based on the query
        const result = await products.toArray();
        res.send(result); // Send the result to the client
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch products" }); // Handle errors
      }
    });
    
    

    app.get("/products/:email", async (req, res) => {
      const { email } = req.params;
      const query = { ownerMail: email };
      const product = productsCollection.find(query);
      const result = await product.toArray();
      res.send(result);
    });

    app.get("/product/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const product = productsCollection.find(query);
      const result = await product.toArray();
      res.send(result);
    });

    // Update product by ID
    app.put("/product/:id", async (req, res) => {
      try {
        const { id } = req.params; // Get product ID from the URL
        const updatedData = req.body; // Get updated product data from request body

        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) }, // Find product by ID
          { $set: updatedData } // Update the fields
        );

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Product not found or no changes made" });
        }

        res.send({ message: "Product updated successfully", result });
      } catch (error) {
        console.error("Error updating product:", error);
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    // Delete a product by ID
    app.delete("/products/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }

        res.send({ message: "Product deleted successfully" });
      } catch (error) {
        console.error("Error deleting product:", error);
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    app.post("/products", async (req, res) => {
      const product = req.body;
      product.timestamp = new Date(); // Add timestamp
      try {
        const result = await productsCollection.insertOne(product);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error saving product:", error);
        res.status(500).send({ message: "Failed to save product" });
      }
    });

    // Upvote a Product
    app.post("/products/vote/:productName", async (req, res) => {
      try {
        const { productName } = req.params;
        const { userEmail } = req.body;

        if (!userEmail)
          return res.status(400).send({ message: "User email is required" });

        const product = await productsCollection.findOne({ name: productName });
        if (!product)
          return res.status(404).send({ message: "Product not found" });

        if (product.votedUsers && product.votedUsers.includes(userEmail)) {
          return res.status(400).send({ message: "User has already voted" });
        }

        const updatedProduct = await productsCollection.updateOne(
          { name: productName },
          {
            $inc: { votes: 1 },
            $push: { votedUsers: userEmail },
          }
        );
        res.send({ message: "Vote added successfully", updatedProduct });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    // Reject a Product by ID
    app.post("/products/reject/:id", async (req, res) => {
      try {
        const { id } = req.params; // Get the product ID from the URL

        // Find and update the product status to "Rejected"
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the product by its ID
          { $set: { status: "Rejected" } } // Update the status to "Rejected"
        );

        // Check if the product was found and updated
        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Product not found or already rejected" });
        }

        res.send({ message: "Product rejected successfully", result });
      } catch (error) {
        console.error("Error rejecting product:", error);
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    // Accept a Product by ID
    app.post("/products/accept/:id", async (req, res) => {
      try {
        const { id } = req.params; // Get the product ID from the URL

        // Find and update the product status to "Accepted"
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) }, // Match the product by its ID
          { $set: { status: "Accepted" } } // Update the status to "Accepted"
        );

        // Check if the product was found and updated
        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .send({ message: "Product not found or already accepted" });
        }

        res.send({ message: "Product accepted successfully", result });
      } catch (error) {
        console.error("Error accepting product:", error);
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    // Mark a Product as Featured
app.post('/products/feature/:id', async (req, res) => {
  try {
    const { id } = req.params; // Get the product ID from the URL

    // Find and update the product status to "Featured"
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { isFeatured: true } } 
    );

    // Check if the product was found and updated
    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'Product not found or already featured' });
    }

    res.send({ message: 'Product marked as featured successfully', result });
  } catch (error) {
    console.error('Error marking product as featured:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});


// Report a Product by ID
app.patch("/products/report/:id", async (req, res) => {
  try {
    const { id } = req.params; // Get the product ID from the URL

    // Find and update the product's `isReported` field or increment `reportCount`
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) }, // Match the product by its ID
      {
        $set: { isReported: true }, // Option 1: Mark as reported
        $inc: { reportCount: 1 },  // Option 2: Increment report count
      }
    );

    // Check if the product was found and updated
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .send({ message: "Product not found or already reported" });
    }

    res.send({ message: "Product reported successfully", result });
  } catch (error) {
    console.error("Error reporting product:", error);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
});

// Delete a product by ID
app.delete("/product/:id", async (req, res) => {
  try {
    const { id } = req.params; // Get the product ID from the request params

    const result = await productsCollection.deleteOne({
      _id: new ObjectId(id), // Match the product by its unique ObjectId
    });

    // Check if a product was actually deleted
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
});






    app.get("/users/:email", async (req, res) => {
      try {
        const { email } = req.params;
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(404).send({ message: "User not found" });

        res.send({
          email: user.email,
          subscriptionStatus: user.isSubscribed || false,
        });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });

    // Subscribe a User
    app.post("/subscribe", async (req, res) => {
      try {
        const { email } = req.body;
        if (!email)
          return res.status(400).send({ message: "Email is required" });

        const user = await usersCollection.findOne({ email });
        if (user && user.isSubscribed) {
          return res
            .status(400)
            .send({ message: "User is already subscribed" });
        }

        const result = await usersCollection.updateOne(
          { email },
          { $set: { isSubscribed: true } },
          { upsert: true } // Create user if not exists
        );
        res.send({ message: "Subscription successful", result });
      } catch (error) {
        res
          .status(500)
          .send({ message: "Internal server error", error: error.message });
      }
    });



    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
    
        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: newUser.email });
        if (existingUser) {
          return res.status(400).send({ message: "User already exists" });
        }
    
        // Insert new user
        const result = await usersCollection.insertOne(newUser);
        res.status(201).send({ message: "User added successfully", insertedId: result.insertedId });
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).send({ message: "Internal server error", error: error.message });
      }
    });
    
    app.get("/users", async (req, res) => {
      const users = usersCollection.find();
      const result = await users.toArray();
      res.send(result);
    });

    // Make a user a Moderator
app.patch("/users/:id/moderator", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { position: "moderator" } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .send({ message: "User not found or already a Moderator" });
    }

    res.send({ message: "User updated to Moderator successfully", result });
  } catch (error) {
    console.error("Error making user Moderator:", error);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
});

// Make a user an Admin
app.patch("/users/:id/admin", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { position: "admin" } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .send({ message: "User not found or already an Admin" });
    }

    res.send({ message: "User updated to Admin successfully", result });
  } catch (error) {
    console.error("Error making user Admin:", error);
    res
      .status(500)
      .send({ message: "Internal server error", error: error.message });
  }
});






    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Uncomment this line to close the client connection when app stops
    // await client.close();
  }
}

run().catch(console.dir);

// Base Route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Start the Server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
