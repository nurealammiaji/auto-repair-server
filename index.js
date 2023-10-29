require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

const port = process.env.PORT || 5000;
const username = process.env.DB_USER;
const password = process.env.DB_PASS;
const secret = process.env.ACCESS_TOKEN_SECRET;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Auto Repair Server");
})

app.listen(port, () => {
  console.log(`Auto Repair Server running on port: ${port}`);
})

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
      res.status(401).send({error: true, message: 'Unauthorized Access'})
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, secret, (error, decoded) => {
      if (error) {
        return res.status(403).send({error: true, message: 'Unauthorized Access'});
      }
      req.decoded = decoded;
      next();
    })
}

const uri = `mongodb+srv://${username}:${password}@cluster0.31s3qjy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {

  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const serviceCollection = client.db("autoRepair").collection("services");
    const bookingCollection = client.db("autoRepair").collection("bookings");

    // JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, secret, { expiresIn: '1h' });
      res.send({ token });
    })

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    app.get("/checkout/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { _id: 0, title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    app.get("/bookings", verifyJWT, async (req, res) => {
      console.log(req.headers);
      let query = {};
      if (req.query?.uid) {
        query = { customerID: req.query.uid }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/checkout", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const booking = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateBooking = {
        $set: {
          serviceStatus: booking.serviceStatus,
        }
      }
      const result = await bookingCollection.updateOne(filter, updateBooking);
      res.send(result);
      console.log(result);
    })

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
      console.log(result);
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
    // Ensures that the client will close when you finish/error

    // await client.close();
  }
}
run().catch(console.dir);
